
const PORTFOLIO_SEED_HOLDINGS = [
  { id: 'tcs', name: 'Tata Consultancy Services', symbol: 'TCS', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 18, averagePrice: 3380, currentPrice: 3612.35, dayChangePct: 1.42, goalTag: 'Retirement', purchaseDate: '2023-11-15' },
  { id: 'hdfc-bank', name: 'HDFC Bank', symbol: 'HDFCBANK', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 26, averagePrice: 1540, currentPrice: 1684.55, dayChangePct: 0.86, goalTag: 'Retirement', purchaseDate: '2024-01-20' },
  { id: 'nifty-index-fund', name: 'ICICI Prudential Nifty 50 Index Fund', symbol: 'NIFTYINDEX', assetType: 'Mutual Fund', sector: 'Index Fund', marketCap: 'Large Cap', quantity: 340, averagePrice: 182.5, currentPrice: 196.4, dayChangePct: 0.54, goalTag: 'Retirement', purchaseDate: '2023-06-10' },
  { id: 'bharat-bond', name: 'Bharat Bond ETF', symbol: 'BHARATBOND', assetType: 'Debt ETF', sector: 'Fixed Income', marketCap: 'Debt', quantity: 120, averagePrice: 121.8, currentPrice: 124.1, dayChangePct: 0.12, goalTag: 'Emergency Fund', purchaseDate: '2025-08-05' },
  { id: 'sbi-small-cap', name: 'SBI Small Cap Fund', symbol: 'SBISMALL', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Small Cap', quantity: 95, averagePrice: 114.2, currentPrice: 129.8, dayChangePct: -0.35, goalTag: 'Child Education', purchaseDate: '2025-02-14' }
];

const PORTFOLIO_ALLOCATION_LABELS = { assetType: 'Asset Class', sector: 'Sector Mix', marketCap: 'Market Cap' };
const PORTFOLIO_COLORS = ['#6C5CE7', '#18C5F4', '#1D9E75', '#F59E0B', '#EF4444', '#0EA5E9', '#8B5CF6', '#EC4899'];
const STORAGE_KEY_HOLDINGS = 'wealthtick_holdings';
const STORAGE_KEY_GOALS = 'wealthtick_goals';

const DEFAULT_GOALS = [
  { id: 'retirement',      name: 'Retirement',      targetAmount: 10000000, color: '#1D9E75', targetYear: 2055 },
  { id: 'child-education', name: 'Child Education',  targetAmount: 5000000,  color: '#3B82F6', targetYear: 2040 },
  { id: 'emergency-fund',  name: 'Emergency Fund',   targetAmount: 1500000,  color: '#F59E0B', targetYear: null },
  { id: 'wealth-creation', name: 'Wealth Creation',  targetAmount: 0,        color: '#8B5CF6', targetYear: null },
];
const GOAL_COLORS = ['#1D9E75', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#0EA5E9', '#6C5CE7'];

function saveHoldingsToStorage() {
  try { localStorage.setItem(STORAGE_KEY_HOLDINGS, JSON.stringify(portfolioState.holdings)); } catch (_) {}
}

function saveGoalsToStorage() {
  try { localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify(portfolioState.goals)); } catch (_) {}
}

function loadSavedGoals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GOALS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return null;
}

function loadSavedHoldings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOLDINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return null;
}

const portfolioState = {
  holdings: loadSavedHoldings() || PORTFOLIO_SEED_HOLDINGS.map((holding) => ({ ...holding })),
  goals: loadSavedGoals() || DEFAULT_GOALS.map((g) => ({ ...g })),
  allocationView: 'assetType',
  analysis: null,
  summary: '',
  summarySource: 'local',
  summaryUpdatedAt: null,
  isRefreshingSummary: false
};

let portfolioElements = null;

function formatHoldingPeriod(days) {
  if (!days || days <= 0) return '\u2014';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years >= 1) return months > 0 ? `${years}y ${months}m` : `${years}y`;
  return Math.floor(days / 30) >= 1 ? `${Math.floor(days / 30)} months` : `${days} days`;
}

function computeTaxCategory(assetType, holdingPeriodDays) {
  return /debt etf|gold etf/i.test(assetType) ? (holdingPeriodDays > 1095 ? 'LTCG' : 'STCG') : (holdingPeriodDays > 365 ? 'LTCG' : 'STCG');
}

function formatPortfolioPercent(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }
  return `${numeric.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;
}

function clampPortfolio(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function slugifyPortfolioValue(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `holding-${Date.now()}`;
}

function groupPortfolioAllocation(items, field) {
  const totals = new Map();
  items.forEach((item) => {
    const key = item[field] || 'Unclassified';
    totals.set(key, (totals.get(key) || 0) + item.currentValue);
  });

  const totalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  return [...totals.entries()]
    .map(([key, value], index) => ({
      key,
      value,
      weightPct: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]
    }))
    .sort((left, right) => right.value - left.value);
}

function buildPortfolioScoreBreakdown(items, allocationByAssetType, topHoldingWeight, topSectorWeight, debtWeight) {
  const topThreeWeight = items.slice(0, 3).reduce((sum, item) => sum + item.weightPct, 0);
  const maxAssetWeight = allocationByAssetType[0] ? allocationByAssetType[0].weightPct : 0;
  const holdingSpreadScore = clampPortfolio(items.length >= 6 ? 92 : items.length * 15, 25, 100);
  const concentrationScore = clampPortfolio(100 - Math.max(0, topHoldingWeight - 20) * 2 - Math.max(0, topThreeWeight - 55), 0, 100);
  const assetMixScore = clampPortfolio(100 - Math.max(0, maxAssetWeight - 65) * 1.2 - (debtWeight < 8 ? 14 : 0), 0, 100);
  const sectorBalanceScore = clampPortfolio(100 - Math.max(0, topSectorWeight - 35) * 1.5, 0, 100);
  const score = Math.round((holdingSpreadScore + concentrationScore + assetMixScore + sectorBalanceScore) / 4);
  const status = score >= 75 ? 'Healthy foundation' : score >= 55 ? 'Needs rebalancing' : 'Fragile mix';
  const tone = score >= 75 ? 'positive' : score >= 55 ? 'neutral' : 'negative';

  return {
    score,
    status,
    tone,
    factors: [
      { label: 'Holding spread', value: Math.round(holdingSpreadScore), note: items.length >= 6 ? 'Enough positions to spread risk.' : 'A few more holdings would improve breadth.' },
      { label: 'Concentration balance', value: Math.round(concentrationScore), note: topHoldingWeight > 25 ? 'One holding is doing a lot of the work.' : 'No single holding dominates too much.' },
      { label: 'Asset mix', value: Math.round(assetMixScore), note: debtWeight < 8 ? 'Defensive allocation is still light.' : 'The mix includes at least one stabiliser.' },
      { label: 'Sector balance', value: Math.round(sectorBalanceScore), note: topSectorWeight > 35 ? 'Sector risk is building up.' : 'Sector exposure looks reasonably spread.' }
    ]
  };
}

function buildPortfolioRedFlags(items, metrics) {
  const redFlags = [];
  const largestHolding = items[0];

  if (largestHolding && largestHolding.weightPct >= 35) {
    redFlags.push({ severity: largestHolding.weightPct >= 45 ? 'high' : 'moderate', title: 'Single-holding concentration', detail: `${largestHolding.name} now makes up ${formatPortfolioPercent(largestHolding.weightPct)} of the portfolio, so one stock can materially swing your overall result.`, nextStep: 'Decide whether this is meant to be a conviction bet or whether the position needs a cap.' });
  }

  if (metrics.topSector && metrics.topSector.weightPct >= 40) {
    redFlags.push({ severity: metrics.topSector.weightPct >= 50 ? 'high' : 'moderate', title: 'Sector concentration is rising', detail: `${metrics.topSector.key} exposure is ${formatPortfolioPercent(metrics.topSector.weightPct)}, which can magnify portfolio swings if that sector turns weak.`, nextStep: 'Track whether new additions are making the sector mix even tighter.' });
  }

  if (metrics.smallCapWeight >= 25) {
    redFlags.push({ severity: metrics.smallCapWeight >= 35 ? 'high' : 'moderate', title: 'Small-cap exposure is elevated', detail: `${formatPortfolioPercent(metrics.smallCapWeight)} of the portfolio sits in small-cap exposure, which can raise volatility during drawdowns.`, nextStep: 'Match small-cap exposure to the goal timeline and the user’s comfort with deep corrections.' });
  }

  if (metrics.debtWeight < 8) {
    redFlags.push({ severity: 'moderate', title: 'Defensive cushion is thin', detail: `Only ${formatPortfolioPercent(metrics.debtWeight)} is currently allocated to debt-like holdings, so the portfolio has limited ballast during market stress.`, nextStep: 'Check whether this is intentional for a long-term goal or whether stability is missing.' });
  }

  const stressedHolding = items.find((item) => item.overallPnLPct <= -10 && item.weightPct >= 12);
  if (stressedHolding) {
    redFlags.push({ severity: 'moderate', title: 'Meaningful drawdown in a core position', detail: `${stressedHolding.name} is down ${formatPortfolioPercent(Math.abs(stressedHolding.overallPnLPct))} while still holding ${formatPortfolioPercent(stressedHolding.weightPct)} weight.`, nextStep: 'Review whether the thesis is intact or whether the position needs tighter risk limits.' });
  }

  if (!redFlags.length) {
    redFlags.push({ severity: 'positive', title: 'No major Phase 1 red flag', detail: 'The portfolio is still investable without an obvious structural warning. The biggest task now is maintaining diversification as new holdings are added.', nextStep: 'Keep reviewing concentration and goal fit once the portfolio grows.' });
  }

  return redFlags.slice(0, 4);
}
function analyzePortfolioHoldings(holdings) {
  const items = holdings
    .map((holding) => {
      const quantity = Math.max(0, Number(holding.quantity) || 0);
      const averagePrice = Math.max(0, Number(holding.averagePrice) || 0);
      const currentPrice = Math.max(0, Number(holding.currentPrice) || 0);
      const dayChangePct = Number(holding.dayChangePct) || 0;
      const investedValue = quantity * averagePrice;
      const currentValue = quantity * currentPrice;
      const overallPnL = currentValue - investedValue;
      const overallPnLPct = investedValue > 0 ? (overallPnL / investedValue) * 100 : 0;
      const previousClose = currentPrice / (1 + dayChangePct / 100);
      const dayPnL = quantity * (currentPrice - previousClose);

      const purchaseDateMs = holding.purchaseDate ? new Date(holding.purchaseDate).getTime() : NaN;
      const holdingPeriodDays = isNaN(purchaseDateMs) ? 0 : Math.floor((Date.now() - purchaseDateMs) / 86400000);
      const taxCategory = computeTaxCategory(holding.assetType, holdingPeriodDays);
      const annualizedReturn = (holdingPeriodDays >= 7 && averagePrice > 0)
        ? (Math.pow(currentPrice / averagePrice, 365 / holdingPeriodDays) - 1) * 100
        : null;

      return { ...holding, quantity, averagePrice, currentPrice, dayChangePct, investedValue, currentValue, overallPnL, overallPnLPct, dayPnL, holdingPeriodDays, taxCategory, annualizedReturn };
    })
    .filter((holding) => holding.quantity > 0)
    .sort((left, right) => right.currentValue - left.currentValue);

  const totalInvested = items.reduce((sum, item) => sum + item.investedValue, 0);
  const totalCurrentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
  const totalPnL = totalCurrentValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const dayPnL = items.reduce((sum, item) => sum + item.dayPnL, 0);
  const previousValue = totalCurrentValue - dayPnL;
  const dayPnLPct = previousValue > 0 ? (dayPnL / previousValue) * 100 : 0;

  items.forEach((item) => {
    item.weightPct = totalCurrentValue > 0 ? (item.currentValue / totalCurrentValue) * 100 : 0;
  });

  // Goal breakdown
  const goalMap = new Map();
  items.forEach((item) => {
    const tag = item.goalTag || 'Untagged';
    if (!goalMap.has(tag)) goalMap.set(tag, []);
    goalMap.get(tag).push(item);
  });
  const goalBreakdown = [...goalMap.entries()].map(([tag, goalItems]) => {
    const goalInvested = goalItems.reduce((s, h) => s + h.investedValue, 0);
    const goalCurrent  = goalItems.reduce((s, h) => s + h.currentValue, 0);
    const goalPnL      = goalCurrent - goalInvested;
    const goalPnLPct   = goalInvested > 0 ? (goalPnL / goalInvested) * 100 : 0;
    const goalWeight   = totalCurrentValue > 0 ? (goalCurrent / totalCurrentValue) * 100 : 0;
    const bestPerformer = [...goalItems].sort((a, b) => b.overallPnLPct - a.overallPnLPct)[0] || null;
    const ltcgCount    = goalItems.filter((h) => h.taxCategory === 'LTCG').length;
    return { goalTag: tag, goalItems, goalInvested, goalCurrent, goalPnL, goalPnLPct, goalWeight, bestPerformer, ltcgCount, holdingCount: goalItems.length };
  });
  const ltcgCount = items.filter((h) => h.taxCategory === 'LTCG').length;

  const allocationByAssetType = groupPortfolioAllocation(items, 'assetType');
  const allocationBySector = groupPortfolioAllocation(items, 'sector');
  const allocationByMarketCap = groupPortfolioAllocation(items, 'marketCap');
  const topHolding = items[0] || null;
  const topSector = allocationBySector[0] || null;
  const debtWeight = allocationByAssetType.filter((group) => /debt|fixed income|bond/i.test(group.key)).reduce((sum, group) => sum + group.weightPct, 0);
  const smallCapWeight = allocationByMarketCap.filter((group) => /small/i.test(group.key)).reduce((sum, group) => sum + group.weightPct, 0);
  const diversification = buildPortfolioScoreBreakdown(items, allocationByAssetType, topHolding ? topHolding.weightPct : 0, topSector ? topSector.weightPct : 0, debtWeight);
  const redFlags = buildPortfolioRedFlags(items, { topSector, smallCapWeight, debtWeight });

  const overviewCards = [
    { label: 'Portfolio Value', value: formatCurrency(totalCurrentValue, 0), meta: `${items.length} holdings`, tone: 'neutral' },
    { label: 'Invested', value: formatCurrency(totalInvested, 0), meta: totalInvested > 0 ? `Current multiple ${formatPlainNumber(totalCurrentValue / totalInvested, 2)}x` : 'Awaiting data', tone: 'neutral' },
    { label: 'Overall P&L', value: `${formatSignedCurrency(totalPnL)} (${formatSignedPercent(totalPnLPct)})`, meta: topHolding ? `Largest position ${topHolding.symbol}` : 'No holdings yet', tone: totalPnL >= 0 ? 'positive' : 'negative' },
    { label: "Today's P&L", value: `${formatSignedCurrency(dayPnL)} (${formatSignedPercent(dayPnLPct)})`, meta: dayPnL >= 0 ? 'Portfolio is green on the day' : 'Portfolio is under pressure today', tone: dayPnL >= 0 ? 'positive' : 'negative' },
    { label: 'Top Holding Weight', value: topHolding ? formatPortfolioPercent(topHolding.weightPct) : '-', meta: topHolding ? topHolding.name : 'Add holdings to analyse', tone: topHolding && topHolding.weightPct > 30 ? 'negative' : 'neutral' },
    { label: 'Diversification Score', value: `${diversification.score}/100`, meta: diversification.status, tone: diversification.tone }
  ];

  return {
    holdings: items,
    totalInvested,
    totalCurrentValue,
    totalPnL,
    totalPnLPct,
    dayPnL,
    dayPnLPct,
    topHolding,
    topSector,
    debtWeight,
    smallCapWeight,
    diversification,
    redFlags,
    overviewCards,
    allocation: { assetType: allocationByAssetType, sector: allocationBySector, marketCap: allocationByMarketCap },
    bestHolding: [...items].sort((left, right) => right.overallPnLPct - left.overallPnLPct)[0] || null,
    worstHolding: [...items].sort((left, right) => left.overallPnLPct - right.overallPnLPct)[0] || null,
    goalBreakdown,
    ltcgCount
  };
}

function buildLocalPortfolioSummary(analysis) {
  if (!analysis.holdings.length) {
    return 'Add at least one holding to generate a portfolio summary.';
  }

  const topHolding = analysis.topHolding;
  const topSector = analysis.topSector;
  const leadFlag = analysis.redFlags.find((flag) => flag.severity !== 'positive') || analysis.redFlags[0];
  const direction = analysis.totalPnL >= 0 ? 'up' : 'down';
  const dayDirection = analysis.dayPnL >= 0 ? 'green' : 'soft';

  return `${analysis.diversification.status}. The portfolio is ${direction} ${formatSignedCurrency(analysis.totalPnL)} overall and ${dayDirection} by ${formatSignedCurrency(analysis.dayPnL)} today. ${topHolding ? `${topHolding.name} is the largest position at ${formatPortfolioPercent(topHolding.weightPct)}.` : ''} ${topSector ? `${topSector.key} is the biggest exposure at ${formatPortfolioPercent(topSector.weightPct)}.` : ''} ${leadFlag ? `Main watchpoint: ${leadFlag.title.toLowerCase()}.` : ''}`.replace(/\s+/g, ' ').trim();
}

function buildPortfolioSummaryPayload(analysis) {
  return {
    holdingsCount: analysis.holdings.length,
    totalInvested: Math.round(analysis.totalInvested),
    totalCurrentValue: Math.round(analysis.totalCurrentValue),
    totalPnL: Math.round(analysis.totalPnL),
    totalPnLPct: Number(analysis.totalPnLPct.toFixed(2)),
    dayPnL: Number(analysis.dayPnL.toFixed(2)),
    dayPnLPct: Number(analysis.dayPnLPct.toFixed(2)),
    diversification: {
      score: analysis.diversification.score,
      status: analysis.diversification.status,
      factors: analysis.diversification.factors.map((factor) => ({ label: factor.label, value: factor.value, note: factor.note }))
    },
    topHoldings: analysis.holdings.slice(0, 4).map((holding) => ({ name: holding.name, symbol: holding.symbol, weightPct: Number(holding.weightPct.toFixed(2)), overallPnLPct: Number(holding.overallPnLPct.toFixed(2)), assetType: holding.assetType, sector: holding.sector, marketCap: holding.marketCap })),
    allocation: {
      assetType: analysis.allocation.assetType.slice(0, 5).map((group) => ({ key: group.key, weightPct: Number(group.weightPct.toFixed(2)) })),
      sector: analysis.allocation.sector.slice(0, 5).map((group) => ({ key: group.key, weightPct: Number(group.weightPct.toFixed(2)) })),
      marketCap: analysis.allocation.marketCap.slice(0, 5).map((group) => ({ key: group.key, weightPct: Number(group.weightPct.toFixed(2)) }))
    },
    redFlags: analysis.redFlags.map((flag) => ({ severity: flag.severity, title: flag.title, detail: flag.detail, nextStep: flag.nextStep })),
    bestHolding: analysis.bestHolding ? { name: analysis.bestHolding.name, symbol: analysis.bestHolding.symbol, overallPnLPct: Number(analysis.bestHolding.overallPnLPct.toFixed(2)) } : null,
    worstHolding: analysis.worstHolding ? { name: analysis.worstHolding.name, symbol: analysis.worstHolding.symbol, overallPnLPct: Number(analysis.worstHolding.overallPnLPct.toFixed(2)) } : null
  };
}
function createPortfolioWorkspace() {
  const viewPortfolio = document.getElementById('view-portfolio');
  if (!viewPortfolio || document.getElementById('portfolio-workspace')) {
    return;
  }

  const section = document.createElement('section');
  section.className = 'portfolio-shell';
  section.id = 'portfolio-workspace';
  section.innerHTML = `
    <div class="portfolio-shell-inner">
      <div class="portfolio-hero">
        <div class="portfolio-hero-main">
          <div class="portfolio-kicker">Portfolio Intelligence &middot; Wealthtick</div>
          <div class="portfolio-hero-value" id="portfolio-hero-value">&#8377;0</div>
          <div class="portfolio-hero-meta">
            <span class="portfolio-hero-day" id="portfolio-hero-day">+&#8377;0 today</span>
            <span class="portfolio-hero-divider">&middot;</span>
            <span class="portfolio-hero-pnl" id="portfolio-hero-pnl">Overall +&#8377;0</span>
          </div>
          <div class="portfolio-hero-pills">
            <span class="portfolio-hero-pill" id="hero-pill-holdings">0 Holdings</span>
            <span class="portfolio-hero-pill" id="hero-pill-score">Score: &ndash;/100</span>
            <span class="portfolio-hero-pill" id="hero-pill-ltcg">0 LTCG eligible</span>
          </div>
        </div>
        <div class="portfolio-hero-actions">
          <button type="button" class="portfolio-action-button secondary" data-portfolio-action="reset">Reset Sample</button>
          <button type="button" class="portfolio-action-button" data-portfolio-action="summary">Refresh AI Summary</button>
        </div>
      </div>
      <div class="portfolio-top-grid">
        <section class="portfolio-card portfolio-builder-card">
          <div class="portfolio-section-head">
            <div>
              <div class="portfolio-card-eyebrow">Input Builder</div>
              <h3 class="portfolio-card-title">Add or edit holdings</h3>
            </div>
            <div class="portfolio-mini-note">Change a row and tab out to recompute the dashboard.</div>
          </div>
          <form id="portfolio-form" class="portfolio-form-grid portfolio-form-simple">
            <input class="portfolio-input" name="name" type="text" placeholder="Holding name (e.g. TCS, Reliance)" required>
            <input class="portfolio-input" name="quantity" type="number" min="0" step="0.01" placeholder="Quantity" required>
            <input class="portfolio-input" name="averagePrice" type="number" min="0" step="0.01" placeholder="Average buy price (₹)" required>
            <button type="submit" class="portfolio-action-button portfolio-form-submit" id="portfolio-add-btn">Add Holding</button>
            <div class="portfolio-form-goal-wrap">
              <span class="portfolio-goal-select-label">Tag to goal:</span>
              <select class="portfolio-input portfolio-select" name="goalTag" id="portfolio-goal-select"></select>
            </div>
          </form>
          <div class="portfolio-form-status" id="portfolio-form-status"></div>
        </section>
        <section class="portfolio-card portfolio-ai-card">
          <div class="portfolio-section-head">
            <div>
              <div class="portfolio-card-eyebrow">AI Summary</div>
              <h3 class="portfolio-card-title">Wealthtick portfolio read</h3>
            </div>
            <div class="portfolio-summary-pill" id="portfolio-summary-pill">Local analysis</div>
          </div>
          <div class="portfolio-ai-insights" id="portfolio-ai-insights">
            <div class="portfolio-ai-summary" id="portfolio-ai-summary"></div>
          </div>
          <div class="portfolio-ai-meta" id="portfolio-ai-meta"></div>
        </section>
      </div>
      <div class="portfolio-overview-grid" id="portfolio-overview-grid"></div>
      <section class="portfolio-card portfolio-goals-card">
        <div class="portfolio-section-head">
          <div>
            <div class="portfolio-card-eyebrow">Goal Breakdown</div>
            <h3 class="portfolio-card-title">Holdings by life goal</h3>
          </div>
          <button type="button" class="portfolio-action-button secondary" data-portfolio-action="manage-goals">Manage Goals</button>
        </div>
        <div class="portfolio-goals-grid" id="portfolio-goals-grid"></div>
      </section>
      <div class="portfolio-secondary-grid">
        <section class="portfolio-card portfolio-allocation-card">
          <div class="portfolio-section-head">
            <div>
              <div class="portfolio-card-eyebrow">Allocation</div>
              <h3 class="portfolio-card-title">Where the money sits</h3>
            </div>
            <div class="portfolio-tab-row">
              <button type="button" class="portfolio-tab active" data-allocation-view="assetType">Asset Class</button>
              <button type="button" class="portfolio-tab" data-allocation-view="sector">Sector</button>
              <button type="button" class="portfolio-tab" data-allocation-view="marketCap">Market Cap</button>
            </div>
          </div>
          <div class="portfolio-allocation-layout">
            <div class="portfolio-donut-wrap">
              <svg id="portfolio-donut-svg" class="portfolio-donut-svg" viewBox="0 0 100 100" width="240" height="240" aria-hidden="true"></svg>
              <div class="portfolio-donut-center"><span id="portfolio-donut-label">Asset Class</span><strong id="portfolio-donut-total"></strong></div>
            </div>
            <div class="portfolio-allocation-list" id="portfolio-allocation-list"></div>
          </div>
        </section>
        <section class="portfolio-card portfolio-diversification-card">
          <div class="portfolio-section-head">
            <div>
              <div class="portfolio-card-eyebrow">Diversification</div>
              <h3 class="portfolio-card-title">Portfolio health score</h3>
            </div>
            <div class="portfolio-score-pill" id="portfolio-score-pill"></div>
          </div>
          <div class="portfolio-score-hero">
            <div class="portfolio-score-ring">
              <svg id="portfolio-score-ring-svg" viewBox="0 0 100 100" width="150" height="150" style="transform:rotate(-90deg);" aria-hidden="true">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(108,92,231,0.12)" stroke-width="10"/>
                <circle id="portfolio-score-arc" cx="50" cy="50" r="38" fill="none" stroke="#6C5CE7" stroke-width="10" stroke-linecap="round" stroke-dasharray="238.76" stroke-dashoffset="238.76"/>
              </svg>
              <div class="portfolio-score-ring-inner"><span>Score</span><strong id="portfolio-score-value"></strong></div>
            </div>
            <div class="portfolio-score-copy"><h4 id="portfolio-score-title"></h4><p id="portfolio-score-description"></p></div>
          </div>
          <div class="portfolio-score-breakdown" id="portfolio-score-breakdown"></div>
        </section>
      </div>
      <section class="portfolio-card portfolio-table-card">
        <div class="portfolio-section-head">
          <div>
            <div class="portfolio-card-eyebrow">Holdings</div>
            <h3 class="portfolio-card-title">Live portfolio table</h3>
          </div>
          <div class="portfolio-mini-note">Edit qty or price inline and tab out to recompute.</div>
        </div>
        <div class="portfolio-table-wrap">
          <table class="portfolio-table">
            <thead><tr><th>Holding</th><th>Asset</th><th>Goal</th><th>Qty</th><th>Avg</th><th>Current</th><th>Weight</th><th>Invested</th><th>Current Value</th><th>Overall P&L</th><th>Today</th><th>Tax &amp; Period</th><th></th></tr></thead>
            <tbody id="portfolio-table-body"></tbody>
            <tfoot id="portfolio-table-foot"></tfoot>
          </table>
        </div>
      </section>
      <section class="portfolio-card portfolio-nivisha-card">
        <div class="portfolio-nivisha-head">
          <div>
            <div class="portfolio-card-eyebrow">AI Insights</div>
            <h3 class="portfolio-card-title">Get AI insights on your portfolio</h3>
            <p class="portfolio-subtext" style="margin:0">Nivisha can analyse your holdings, goals, and risk profile in plain language.</p>
          </div>
          <button type="button" class="portfolio-action-button portfolio-nivisha-primary" data-nivisha-question="Give me a detailed analysis of my entire portfolio. What are the biggest risks, what should I rebalance, and what are my next three action steps?">Open full portfolio analysis with Nivisha &rarr;</button>
        </div>
        <div class="portfolio-nivisha-chips">
          <button type="button" class="portfolio-chip" data-nivisha-question="Should I rebalance my portfolio right now? What is overweight and what is underweight?">Should I rebalance?</button>
          <button type="button" class="portfolio-chip" data-nivisha-question="Which holding in my portfolio should I consider trimming or exiting, and why?">Which holding to trim?</button>
          <button type="button" class="portfolio-chip" data-nivisha-question="Am I on track for retirement based on my current portfolio size and growth rate?">Am I on track for retirement?</button>
          <button type="button" class="portfolio-chip" data-nivisha-question="Is my portfolio too risky? How does my equity-to-debt ratio look for my age and goals?">Is my portfolio too risky?</button>
          <button type="button" class="portfolio-chip" data-nivisha-question="What is the single biggest weakness in my portfolio that I should address first?">Biggest weakness?</button>
        </div>
      </section>
      <section class="portfolio-card portfolio-redflags-card">
        <div class="portfolio-section-head">
          <div>
            <div class="portfolio-card-eyebrow">Red Flags</div>
            <h3 class="portfolio-card-title">What needs attention</h3>
          </div>
          <div class="portfolio-mini-note">Educational monitor, not a buy or sell signal.</div>
        </div>
        <div class="portfolio-redflags-grid" id="portfolio-redflags-grid"></div>
      </section>
    </div>
  `;

  viewPortfolio.appendChild(section);
  portfolioElements = {
    root: section,
    form: section.querySelector('#portfolio-form'),
    summary: section.querySelector('#portfolio-ai-summary'),
    summaryMeta: section.querySelector('#portfolio-ai-meta'),
    summaryPill: section.querySelector('#portfolio-summary-pill'),
    overviewGrid: section.querySelector('#portfolio-overview-grid'),
    goalsGrid: section.querySelector('#portfolio-goals-grid'),
    donutSvg: section.querySelector('#portfolio-donut-svg'),
    donutLabel: section.querySelector('#portfolio-donut-label'),
    donutTotal: section.querySelector('#portfolio-donut-total'),
    allocationList: section.querySelector('#portfolio-allocation-list'),
    scorePill: section.querySelector('#portfolio-score-pill'),
    scoreValue: section.querySelector('#portfolio-score-value'),
    scoreTitle: section.querySelector('#portfolio-score-title'),
    scoreDescription: section.querySelector('#portfolio-score-description'),
    scoreBreakdown: section.querySelector('#portfolio-score-breakdown'),
    tableBody: section.querySelector('#portfolio-table-body'),
    tableFoot: section.querySelector('#portfolio-table-foot'),
    redFlagsGrid: section.querySelector('#portfolio-redflags-grid'),
    heroValue: section.querySelector('#portfolio-hero-value'),
    heroDay: section.querySelector('#portfolio-hero-day'),
    heroPnl: section.querySelector('#portfolio-hero-pnl'),
    heroPillHoldings: section.querySelector('#hero-pill-holdings'),
    heroPillScore: section.querySelector('#hero-pill-score'),
    heroPillLtcg: section.querySelector('#hero-pill-ltcg')
  };

  // Cache form status element
  portfolioElements.formStatus = section.querySelector('#portfolio-form-status');
}

function bindPortfolioWorkspaceEvents() {
  if (!portfolioElements || !portfolioElements.root) {
    return;
  }

  portfolioElements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(portfolioElements.form);
    const name = String(formData.get('name') || '').trim();
    const quantity = Number(formData.get('quantity')) || 0;
    const averagePrice = Number(formData.get('averagePrice')) || 0;
    const selectedGoalTag = String(formData.get('goalTag') || portfolioState.goals[0]?.name || 'Wealth Creation').trim();
    if (!name || quantity <= 0 || averagePrice <= 0) {
      return;
    }

    const addBtn = portfolioElements.root.querySelector('#portfolio-add-btn');
    const statusEl = portfolioElements.root.querySelector('#portfolio-form-status');
    addBtn.disabled = true;
    addBtn.textContent = 'Looking up…';
    if (statusEl) statusEl.textContent = `Fetching live data for "${name}"…`;

    try {
      const response = await fetch(`/api/stock-lookup?q=${encodeURIComponent(name)}`);
      const stockData = await response.json().catch(() => ({}));

      if (response.ok && stockData.symbol) {
        portfolioState.holdings.unshift({
          id: `${slugifyPortfolioValue(stockData.symbol)}-${Date.now()}`,
          name: stockData.name || name,
          symbol: stockData.symbol,
          assetType: stockData.assetType || 'Equity',
          sector: stockData.sector || 'Unclassified',
          marketCap: stockData.marketCap || 'Large Cap',
          quantity,
          averagePrice,
          currentPrice: stockData.currentPrice || averagePrice,
          dayChangePct: stockData.dayChangePct || 0,
          goalTag: selectedGoalTag,
          purchaseDate: new Date().toISOString().split('T')[0]
        });
        if (statusEl) statusEl.textContent = `Added ${stockData.name || name} (${stockData.symbol}) with live price ₹${stockData.currentPrice}`;
      } else {
        // Fallback: add with user-provided data if lookup fails
        const fallbackSymbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
        portfolioState.holdings.unshift({
          id: `${slugifyPortfolioValue(fallbackSymbol)}-${Date.now()}`,
          name,
          symbol: fallbackSymbol,
          assetType: 'Equity',
          sector: 'Unclassified',
          marketCap: 'Large Cap',
          quantity,
          averagePrice,
          currentPrice: averagePrice,
          dayChangePct: 0,
          goalTag: selectedGoalTag,
          purchaseDate: new Date().toISOString().split('T')[0]
        });
        if (statusEl) statusEl.textContent = `Added "${name}" with your average price (live lookup unavailable).`;
      }

      saveHoldingsToStorage();
      portfolioElements.form.reset();
      renderPortfolioWorkspace();
    } catch (_error) {
      if (statusEl) statusEl.textContent = 'Could not fetch stock data. Please try again.';
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = 'Add Holding';
    }
  });
  portfolioElements.root.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-portfolio-action]');
    if (actionButton) {
      const action = actionButton.getAttribute('data-portfolio-action');
      if (action === 'reset') {
        portfolioState.holdings = PORTFOLIO_SEED_HOLDINGS.map((holding) => ({ ...holding }));
        saveHoldingsToStorage();
        renderPortfolioWorkspace();
        refreshPortfolioSummary();
      }
      if (action === 'summary') {
        refreshPortfolioSummary();
      }
      if (action === 'manage-goals') {
        openGoalsEditor();
      }
      return;
    }

    const allocationTab = event.target.closest('[data-allocation-view]');
    if (allocationTab) {
      portfolioState.allocationView = allocationTab.getAttribute('data-allocation-view') || 'assetType';
      renderPortfolioWorkspace();
      return;
    }

    const removeButton = event.target.closest('[data-remove-holding]');
    if (removeButton) {
      const id = removeButton.getAttribute('data-remove-holding');
      portfolioState.holdings = portfolioState.holdings.filter((holding) => holding.id !== id);
      saveHoldingsToStorage();
      renderPortfolioWorkspace();
      return;
    }

    const goalAskBtn = event.target.closest('[data-goal-question]');
    if (goalAskBtn) {
      triggerNivishaQuestion(goalAskBtn.getAttribute('data-goal-question'));
      return;
    }

    const nivishaBtn = event.target.closest('[data-nivisha-question]');
    if (nivishaBtn) {
      triggerNivishaQuestion(nivishaBtn.getAttribute('data-nivisha-question'));
      return;
    }
  });

  portfolioElements.root.addEventListener('change', (event) => {
    const input = event.target.closest('[data-portfolio-field]');
    if (!input) {
      return;
    }

    const holdingId = input.getAttribute('data-portfolio-id');
    const field = input.getAttribute('data-portfolio-field');
    const targetHolding = portfolioState.holdings.find((holding) => holding.id === holdingId);
    if (!targetHolding || !field) {
      return;
    }

    const numericFields = new Set(['quantity', 'averagePrice', 'currentPrice', 'dayChangePct']);
    targetHolding[field] = numericFields.has(field) ? Number(input.value) || 0 : String(input.value || '').trim();
    saveHoldingsToStorage();
    renderPortfolioWorkspace();
  });
}

function renderPortfolioHero(analysis) {
  if (!portfolioElements.heroValue) return;
  portfolioElements.heroValue.textContent = formatCurrency(analysis.totalCurrentValue, 0);

  const daySign = analysis.dayPnL >= 0 ? '+' : '';
  portfolioElements.heroDay.textContent = `${daySign}${formatCurrency(Math.abs(analysis.dayPnL), 0)} today (${formatSignedPercent(analysis.dayPnLPct)})`;
  portfolioElements.heroDay.className = `portfolio-hero-day ${analysis.dayPnL >= 0 ? 'positive' : 'negative'}`;

  const pnlSign = analysis.totalPnL >= 0 ? '+' : '';
  portfolioElements.heroPnl.textContent = `Overall ${pnlSign}${formatCurrency(Math.abs(analysis.totalPnL), 0)} (${formatSignedPercent(analysis.totalPnLPct)})`;
  portfolioElements.heroPnl.className = `portfolio-hero-pnl ${analysis.totalPnL >= 0 ? 'positive' : 'negative'}`;

  portfolioElements.heroPillHoldings.textContent = `${analysis.holdings.length} Holdings`;
  portfolioElements.heroPillScore.textContent = `Score: ${analysis.diversification.score}/100`;
  portfolioElements.heroPillLtcg.textContent = `${analysis.ltcgCount} LTCG eligible`;
}

const GOAL_SVG_ICONS = {
  Retirement: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 17l4-8 4 4 4-6 4 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  'Child Education': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 8v6m20-6v6M7 10.5v5.5a5 5 0 0010 0v-5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  'Emergency Fund': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'Wealth Creation': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function renderPortfolioGoalCards(analysis) {
  if (!portfolioElements.goalsGrid) return;
  if (!analysis.goalBreakdown || !analysis.goalBreakdown.length) {
    portfolioElements.goalsGrid.innerHTML = '<div class="portfolio-empty-state">Add holdings with goal tags to see the goal breakdown.</div>';
    return;
  }
  portfolioElements.goalsGrid.innerHTML = analysis.goalBreakdown.map((goal) => {
    const icon = GOAL_SVG_ICONS[goal.goalTag] || GOAL_SVG_ICONS['Wealth Creation'];
    const pnlClass = goal.goalPnL >= 0 ? 'portfolio-positive-text' : 'portfolio-negative-text';
    const bestText = goal.bestPerformer
      ? `${escapeHtml(goal.bestPerformer.symbol)} (${goal.bestPerformer.overallPnLPct >= 0 ? '+' : ''}${goal.bestPerformer.overallPnLPct.toFixed(1)}%)`
      : '\u2014';
    const question = `My "${goal.goalTag}" goal has ${goal.holdingCount} holding${goal.holdingCount !== 1 ? 's' : ''} currently worth ${formatCurrency(goal.goalCurrent, 0)}. Am I on track and what should I do next?`;

    // Goal target progress
    const matchedGoal = portfolioState.goals.find((g) => g.name === goal.goalTag);
    const targetAmount = matchedGoal ? Number(matchedGoal.targetAmount) || 0 : 0;
    const progressPct = targetAmount > 0 ? Math.min((goal.goalCurrent / targetAmount) * 100, 100) : 0;
    const progressLabel = targetAmount > 0
      ? `${formatPortfolioPercent(progressPct, 1)} of goal &middot; ${formatCurrency(goal.goalCurrent, 0)} of ${formatCurrency(targetAmount, 0)} target`
      : '<span class="portfolio-goal-no-target">Set a target amount to track progress &rarr;</span>';
    const progressBarColor = matchedGoal ? matchedGoal.color : '#6C5CE7';

    return `
      <article class="portfolio-goal-card">
        <div class="portfolio-goal-card-head">
          <span class="portfolio-goal-icon">${icon}</span>
          <div>
            <div class="portfolio-goal-name">${escapeHtml(goal.goalTag)}</div>
            <div class="portfolio-goal-count">${goal.holdingCount} holding${goal.holdingCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="portfolio-goal-financials">
          <div class="portfolio-goal-current">${formatCurrency(goal.goalCurrent, 0)}</div>
          <div class="${pnlClass} portfolio-goal-pnl">${formatSignedPercent(goal.goalPnLPct)}</div>
        </div>
        <div class="portfolio-goal-stat-row">
          <span class="portfolio-goal-label">Invested</span>
          <span>${formatCurrency(goal.goalInvested, 0)}</span>
        </div>
        <div class="portfolio-goal-stat-row">
          <span class="portfolio-goal-label">Best performer</span>
          <span class="portfolio-positive-text">${bestText}</span>
        </div>
        <div class="portfolio-goal-target-section">
          <div class="portfolio-goal-progress-bar-wrap">
            <div class="portfolio-goal-progress-bar-fill" style="width:${progressPct.toFixed(1)}%; background:${progressBarColor}"></div>
          </div>
          <div class="portfolio-goal-progress-label">${progressLabel}</div>
        </div>
        <div class="portfolio-goal-weight-bar"><div class="portfolio-goal-weight-fill" style="width:${clampPortfolio(goal.goalWeight, 2, 100)}%"></div></div>
        <div class="portfolio-goal-weight-label">${formatPortfolioPercent(goal.goalWeight)} of portfolio</div>
        <button type="button" class="portfolio-goal-ask-btn" data-goal-question="${escapeHtml(question)}">Ask Nivisha \u2192</button>
      </article>
    `;
  }).join('');
}

function triggerNivishaQuestion(question) {
  window.switchView('chat');
  setTimeout(() => {
    const input = document.getElementById('chat-input');
    const form  = document.getElementById('chat-form');
    if (input && form) {
      input.value = question;
      input.focus();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }, 200);
}

function renderPortfolioWorkspace() {
  if (!portfolioElements) {
    return;
  }

  const analysis = analyzePortfolioHoldings(portfolioState.holdings);
  portfolioState.analysis = analysis;
  renderPortfolioHero(analysis);
  renderPortfolioOverviewCards(analysis);
  renderPortfolioGoalCards(analysis);
  renderPortfolioAllocation(analysis);
  renderPortfolioDiversification(analysis);
  renderPortfolioTable(analysis);
  renderPortfolioTaxSummary(analysis);
  renderPortfolioRedFlags(analysis);

  if (!portfolioState.isRefreshingSummary) {
    portfolioState.summary = buildLocalPortfolioSummary(analysis);
    portfolioState.summarySource = 'local';
    portfolioState.summaryUpdatedAt = new Date();
  }
  renderPortfolioSummaryCard();
}

function renderPortfolioOverviewCards(analysis) {
  portfolioElements.overviewGrid.innerHTML = analysis.overviewCards.map((card) => `
    <article class="portfolio-overview-card ${card.tone}">
      <div class="portfolio-overview-label">${escapeHtml(card.label)}</div>
      <div class="portfolio-overview-value">${escapeHtml(card.value)}</div>
      <div class="portfolio-overview-meta">${escapeHtml(card.meta)}</div>
    </article>
  `).join('');
}

function renderPortfolioAllocation(analysis) {
  const groups = analysis.allocation[portfolioState.allocationView] || [];
  const RADIUS = 38;
  const CIRC = 2 * Math.PI * RADIUS;
  const trackCircle = `<circle class="portfolio-donut-track" cx="50" cy="50" r="${RADIUS}"></circle>`;

  if (!groups.length) {
    portfolioElements.donutSvg.innerHTML = trackCircle;
  } else {
    let cumulative = 0;
    const segments = groups.map((group) => {
      const segLen = (clampPortfolio(group.weightPct, 0, 100) / 100) * CIRC;
      const dashOffset = -cumulative;
      cumulative += segLen;
      return `<circle class="portfolio-donut-segment" cx="50" cy="50" r="${RADIUS}" fill="none" stroke="${group.color}" stroke-dasharray="${segLen} ${Math.max(CIRC - segLen, 0)}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 50 50)"></circle>`;
    }).join('');
    portfolioElements.donutSvg.innerHTML = `${trackCircle}${segments}`;
  }

  portfolioElements.donutLabel.textContent = PORTFOLIO_ALLOCATION_LABELS[portfolioState.allocationView] || 'Allocation';
  portfolioElements.donutTotal.textContent = formatCurrency(analysis.totalCurrentValue, 0);
  portfolioElements.allocationList.innerHTML = groups.length
    ? groups.map((group) => `
      <div class="portfolio-allocation-item">
        <div class="portfolio-allocation-item-head"><div class="portfolio-allocation-key"><span class="portfolio-swatch" style="background:${group.color}"></span>${escapeHtml(group.key)}</div><strong>${formatPortfolioPercent(group.weightPct)}</strong></div>
        <div class="portfolio-allocation-bar"><span style="width:${clampPortfolio(group.weightPct, 2, 100)}%; background:${group.color}"></span></div>
        <div class="portfolio-allocation-meta">${formatCurrency(group.value, 0)} deployed in this bucket</div>
      </div>
    `).join('')
    : '<div class="portfolio-empty-state">Add holdings to see the allocation breakdown.</div>';

  portfolioElements.root.querySelectorAll('[data-allocation-view]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-allocation-view') === portfolioState.allocationView);
  });
}

function renderPortfolioDiversification(analysis) {
  const scoreTone = analysis.diversification.tone;
  portfolioElements.scorePill.textContent = analysis.diversification.status;
  portfolioElements.scorePill.className = `portfolio-score-pill ${scoreTone}`;
  portfolioElements.scoreValue.textContent = `${analysis.diversification.score}`;
  portfolioElements.scoreTitle.textContent = analysis.diversification.status;
  portfolioElements.scoreDescription.textContent = analysis.redFlags[0] ? analysis.redFlags[0].detail : 'No major structural issue stands out yet.';
  portfolioElements.scoreBreakdown.innerHTML = analysis.diversification.factors.map((factor) => `
    <div class="portfolio-factor-card">
      <div class="portfolio-factor-head"><span>${escapeHtml(factor.label)}</span><strong>${factor.value}/100</strong></div>
      <div class="portfolio-factor-bar"><span style="width:${factor.value}%;"></span></div>
      <div class="portfolio-factor-note">${escapeHtml(factor.note)}</div>
    </div>
  `).join('');

  const arc = portfolioElements.root.querySelector('#portfolio-score-arc');
  if (arc) {
    const CIRC = 238.76;
    const score = clampPortfolio(analysis.diversification.score, 0, 100);
    arc.setAttribute('stroke-dashoffset', String(CIRC - (score / 100) * CIRC));
    const scoreColors = { positive: '#059669', neutral: '#6C5CE7', negative: '#DC2626' };
    arc.setAttribute('stroke', scoreColors[analysis.diversification.tone] || '#6C5CE7');
  }
}
function renderPortfolioTable(analysis) {
  portfolioElements.tableBody.innerHTML = analysis.holdings.length
    ? analysis.holdings.map((holding) => `
      <tr>
        <td><div class="portfolio-holding-cell"><div class="portfolio-holding-badge">${escapeHtml(holding.symbol.slice(0, 1) || 'W')}</div><div><div class="portfolio-holding-name">${escapeHtml(holding.name)}</div><div class="portfolio-holding-meta">${escapeHtml(holding.symbol)} · ${escapeHtml(holding.sector)}</div></div></div></td>
        <td>${escapeHtml(holding.assetType)}<div class="portfolio-row-subtext">${escapeHtml(holding.marketCap)}</div></td>
        <td>${escapeHtml(holding.goalTag)}</td>
        <td><input class="portfolio-table-input" data-portfolio-id="${escapeHtml(holding.id)}" data-portfolio-field="quantity" type="number" min="0" step="0.01" value="${holding.quantity}"></td>
        <td><input class="portfolio-table-input" data-portfolio-id="${escapeHtml(holding.id)}" data-portfolio-field="averagePrice" type="number" min="0" step="0.01" value="${holding.averagePrice}"></td>
        <td><input class="portfolio-table-input" data-portfolio-id="${escapeHtml(holding.id)}" data-portfolio-field="currentPrice" type="number" min="0" step="0.01" value="${holding.currentPrice}"><div class="portfolio-row-subtext">Day ${formatSignedPercent(holding.dayChangePct)}</div></td>
        <td>${formatPortfolioPercent(holding.weightPct)}</td>
        <td>${formatCurrency(holding.investedValue, 0)}</td>
        <td>${formatCurrency(holding.currentValue, 0)}</td>
        <td class="${holding.overallPnL >= 0 ? 'portfolio-positive-text' : 'portfolio-negative-text'}">${formatSignedCurrency(holding.overallPnL)}<div class="portfolio-row-subtext">${formatSignedPercent(holding.overallPnLPct)}</div></td>
        <td><input class="portfolio-table-input" data-portfolio-id="${escapeHtml(holding.id)}" data-portfolio-field="dayChangePct" type="number" step="0.01" value="${holding.dayChangePct}"><div class="portfolio-row-subtext ${holding.dayPnL >= 0 ? 'portfolio-positive-text' : 'portfolio-negative-text'}">${formatSignedCurrency(holding.dayPnL)}</div></td>
        <td>
          <span class="portfolio-tax-badge ${holding.taxCategory === 'LTCG' ? 'ltcg' : 'stcg'}">${holding.taxCategory || '\u2014'}</span>
          <div class="portfolio-row-subtext">${formatHoldingPeriod(holding.holdingPeriodDays)}</div>
          ${holding.annualizedReturn !== null ? `<div class="portfolio-row-subtext">${holding.annualizedReturn >= 0 ? '+' : ''}${holding.annualizedReturn.toFixed(1)}% p.a.</div>` : ''}
        </td>
        <td><button type="button" class="portfolio-row-action" data-remove-holding="${escapeHtml(holding.id)}">Remove</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="13" class="portfolio-empty-table">Add a holding to start analysing the portfolio.</td></tr>';
}

function renderPortfolioTaxSummary(analysis) {
  if (!portfolioElements.tableFoot || !analysis.holdings.length) {
    if (portfolioElements.tableFoot) portfolioElements.tableFoot.innerHTML = '';
    return;
  }
  const ltcg = analysis.holdings.filter((h) => h.taxCategory === 'LTCG');
  const ltcgGains = ltcg.filter((h) => h.overallPnL > 0).reduce((s, h) => s + h.overallPnL, 0);
  const taxAdvantage = Math.min(ltcgGains, 100000);
  const advantageText = taxAdvantage > 0
    ? `<span class="portfolio-tax-advantage">&middot; Potential tax advantage up to ${formatCurrency(taxAdvantage, 0)} under &#8377;1L LTCG exemption</span>`
    : '';
  portfolioElements.tableFoot.innerHTML = `
    <tr class="portfolio-tax-summary-row">
      <td colspan="11" class="portfolio-tax-summary-text">
        <span class="portfolio-tax-label-ltcg">${ltcg.length} of ${analysis.holdings.length} holdings qualify for LTCG</span>
        ${advantageText}
      </td>
      <td colspan="2"></td>
    </tr>
  `;
}

function renderPortfolioRedFlags(analysis) {
  portfolioElements.redFlagsGrid.innerHTML = analysis.redFlags.map((flag) => `
    <article class="portfolio-flag-card ${flag.severity}">
      <div class="portfolio-flag-head"><span class="portfolio-flag-severity">${escapeHtml(flag.severity === 'positive' ? 'stable' : flag.severity)}</span><h4>${escapeHtml(flag.title)}</h4></div>
      <p>${escapeHtml(flag.detail)}</p>
      <div class="portfolio-flag-next">Next watch: ${escapeHtml(flag.nextStep)}</div>
    </article>
  `).join('');
}

function renderPortfolioSummaryCard() {
  if (!portfolioElements || !portfolioState.analysis) {
    return;
  }

  const insightsEl = portfolioElements.root.querySelector('#portfolio-ai-insights');
  const summaryEl = portfolioElements.summary;

  if (portfolioState.summarySource === 'ai' && portfolioState.summary) {
    // Parse the structured AI response into sections
    const sections = parseAISummarySections(portfolioState.summary);
    let html = '';

    if (sections.pnl) {
      html += `<div class="portfolio-insight-section">
        <div class="portfolio-insight-label">📊 Today's P&L Summary</div>
        <div class="portfolio-insight-body">${escapeHtml(sections.pnl)}</div>
      </div>`;
    }
    if (sections.holdingNews) {
      html += `<div class="portfolio-insight-section">
        <div class="portfolio-insight-label">📰 Holdings News</div>
        <div class="portfolio-insight-body">${escapeHtml(sections.holdingNews)}</div>
      </div>`;
    }
    if (sections.marketNews) {
      html += `<div class="portfolio-insight-section">
        <div class="portfolio-insight-label">🌍 Market & Sector News</div>
        <div class="portfolio-insight-body">${escapeHtml(sections.marketNews)}</div>
      </div>`;
    }
    if (sections.quickTake) {
      html += `<div class="portfolio-insight-section portfolio-insight-quicktake">
        <div class="portfolio-insight-label">⚡ Quick Take</div>
        <div class="portfolio-insight-body">${escapeHtml(sections.quickTake)}</div>
      </div>`;
    }

    if (html) {
      insightsEl.innerHTML = html;
    } else {
      // Fallback if parsing fails — show raw text
      summaryEl.textContent = portfolioState.summary;
      insightsEl.innerHTML = '';
      insightsEl.appendChild(summaryEl);
    }
  } else {
    // Local analysis fallback
    insightsEl.innerHTML = '';
    summaryEl.textContent = portfolioState.summary;
    insightsEl.appendChild(summaryEl);
  }

  portfolioElements.summaryPill.textContent = portfolioState.isRefreshingSummary ? 'Refreshing…' : portfolioState.summarySource === 'ai' ? 'AI insights' : 'Local analysis';
  portfolioElements.summaryPill.classList.toggle('loading', portfolioState.isRefreshingSummary);

  const updatedText = portfolioState.summaryUpdatedAt ? `Updated at ${portfolioState.summaryUpdatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Summary has not been generated yet.';
  const sourceText = portfolioState.summarySource === 'ai' ? 'Powered by the backend portfolio copilot.' : 'Based on current portfolio calculations in the browser.';
  portfolioElements.summaryMeta.textContent = `${updatedText} · ${sourceText}`;
}

function parseAISummarySections(text) {
  const sections = { pnl: '', holdingNews: '', marketNews: '', quickTake: '' };
  const markers = [
    { key: 'pnl', pattern: /\*?\*?Today'?s P&?L Summary\*?\*?/i },
    { key: 'holdingNews', pattern: /\*?\*?Holdings? News\*?\*?/i },
    { key: 'marketNews', pattern: /\*?\*?Market\s*&?\s*Sector News\*?\*?/i },
    { key: 'quickTake', pattern: /\*?\*?Quick Take\*?\*?/i }
  ];

  // Split by section headings
  let remaining = text;
  const found = [];
  for (const marker of markers) {
    const match = remaining.match(marker.pattern);
    if (match) {
      found.push({ key: marker.key, index: remaining.indexOf(match[0]), length: match[0].length });
    }
  }
  found.sort((a, b) => a.index - b.index);

  for (let i = 0; i < found.length; i++) {
    const start = found[i].index + found[i].length;
    const end = i + 1 < found.length ? found[i + 1].index : remaining.length;
    sections[found[i].key] = remaining.slice(start, end).replace(/^\s*[:—\-]\s*/, '').trim();
  }

  return sections;
}

async function refreshPortfolioSummary() {
  if (!portfolioState.analysis) {
    return;
  }

  portfolioState.isRefreshingSummary = true;
  renderPortfolioSummaryCard();

  try {
    const holdingNames = portfolioState.analysis.holdings.map((h) => h.name).slice(0, 10);
    const payload = {
      portfolioSnapshot: buildPortfolioSummaryPayload(portfolioState.analysis),
      holdingNames
    };

    const response = await fetch('/api/portfolio-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    portfolioState.summary = typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : buildLocalPortfolioSummary(portfolioState.analysis);
    portfolioState.summarySource = 'ai';
    portfolioState.summaryUpdatedAt = new Date();
  } catch (_error) {
    portfolioState.summary = buildLocalPortfolioSummary(portfolioState.analysis);
    portfolioState.summarySource = 'local';
    portfolioState.summaryUpdatedAt = new Date();
  } finally {
    portfolioState.isRefreshingSummary = false;
    renderPortfolioSummaryCard();
  }
}

// ─── Goal Helper Functions ────────────────────────────────────────────────────

function formatGoalAmount(amount) {
  const n = Number(amount) || 0;
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000)   return `${(n / 100000).toFixed(1)} L`;
  return n.toLocaleString('en-IN');
}

function renderSidebarGoals() {
  const html = portfolioState.goals.map((g) => {
    const parts = [];
    if (g.targetYear) parts.push(`Target year: ${g.targetYear}`);
    if (Number(g.targetAmount) > 0) parts.push(`\u20b9${formatGoalAmount(g.targetAmount)}`);
    const meta = parts.join(' \u00b7 ') || 'No target set';
    return `<div class="goal-card">
      <span class="goal-dot" style="background:${g.color}"></span>
      <div><div class="goal-name">${escapeHtml(g.name)}</div><div class="goal-target">${meta}</div></div>
    </div>`;
  }).join('');

  const sidebarList  = document.getElementById('sidebar-goal-list');
  const mobileList   = document.getElementById('mobile-goal-list');
  if (sidebarList) sidebarList.innerHTML = html;
  if (mobileList)  mobileList.innerHTML  = html;
}

function refreshGoalSelect() {
  const select = document.getElementById('portfolio-goal-select');
  if (!select) return;
  const current = select.value;
  select.innerHTML = portfolioState.goals.map((g) =>
    `<option value="${escapeHtml(g.name)}"${g.name === current ? ' selected' : ''}>${escapeHtml(g.name)}</option>`
  ).join('');
}

function openGoalsEditor() {
  const existing = document.getElementById('goals-edit-modal');
  if (existing) existing.remove();

  let workingGoals = portfolioState.goals.map((g) => ({ ...g }));

  function buildRowHTML(g, i) {
    return `<div class="goals-modal-row" data-row="${i}">
      <span class="goals-dot-preview" style="background:${g.color}"></span>
      <input class="profile-field-input goals-name-input"   type="text"   value="${escapeHtml(g.name)}"             placeholder="Goal name"    data-gi="${i}" data-gf="name">
      <input class="profile-field-input goals-amount-input" type="number" value="${g.targetAmount > 0 ? g.targetAmount : ''}" placeholder="Target \u20b9"  min="0" data-gi="${i}" data-gf="amount">
      <input class="profile-field-input goals-year-input"   type="number" value="${g.targetYear || ''}"             placeholder="Year"         min="2024" max="2100" data-gi="${i}" data-gf="year">
      <button type="button" class="goals-delete-btn" data-gd="${i}" title="Remove goal">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  }

  function buildList() {
    return workingGoals.map((g, i) => buildRowHTML(g, i)).join('');
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="profile-modal-overlay" id="goals-edit-modal">
      <div class="profile-modal goals-modal">
        <div class="profile-modal-head">
          <div class="profile-modal-title">Manage Goals</div>
          <button type="button" class="profile-modal-close" id="goals-modal-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <p class="goals-modal-note">Set a target amount so the Goal Breakdown card shows how much of each goal is achieved.</p>
        <div class="goals-modal-list" id="goals-modal-list">${buildList()}</div>
        <button type="button" class="goals-add-btn" id="goals-add-btn">+ Add Goal</button>
        <div class="profile-modal-actions">
          <button type="button" class="profile-modal-cancel" id="goals-cancel-btn">Cancel</button>
          <button type="button" class="profile-modal-save"   id="goals-save-btn">Save Goals</button>
        </div>
      </div>
    </div>
  `);

  const overlay = document.getElementById('goals-edit-modal');

  function syncFromDOM() {
    overlay.querySelectorAll('.goals-modal-row').forEach((row, i) => {
      if (!workingGoals[i]) return;
      workingGoals[i].name         = row.querySelector('[data-gf="name"]')?.value?.trim()  || workingGoals[i].name;
      workingGoals[i].targetAmount = Number(row.querySelector('[data-gf="amount"]')?.value) || 0;
      workingGoals[i].targetYear   = Number(row.querySelector('[data-gf="year"]')?.value)   || null;
    });
  }

  function rerender() {
    document.getElementById('goals-modal-list').innerHTML = buildList();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); return; }

    if (e.target.closest('#goals-modal-close') || e.target.closest('#goals-cancel-btn')) {
      overlay.remove(); return;
    }

    const delBtn = e.target.closest('[data-gd]');
    if (delBtn) {
      syncFromDOM();
      workingGoals.splice(Number(delBtn.dataset.gd), 1);
      rerender(); return;
    }

    if (e.target.closest('#goals-add-btn')) {
      syncFromDOM();
      workingGoals.push({
        id: `goal-${Date.now()}`,
        name: '',
        targetAmount: 0,
        color: GOAL_COLORS[workingGoals.length % GOAL_COLORS.length],
        targetYear: null
      });
      rerender();
      overlay.querySelector('.goals-modal-list').lastElementChild?.querySelector('.goals-name-input')?.focus();
      return;
    }

    if (e.target.closest('#goals-save-btn')) {
      syncFromDOM();
      const saved = workingGoals.filter((g) => g.name.trim());
      if (!saved.length) return;
      portfolioState.goals = saved;
      saveGoalsToStorage();
      renderSidebarGoals();
      refreshGoalSelect();
      renderPortfolioWorkspace();
      overlay.remove();
    }
  });
}

function initPortfolioWorkspace() {
  if (typeof escapeHtml !== 'function' || typeof formatCurrency !== 'function' || typeof formatSignedCurrency !== 'function' || typeof formatSignedPercent !== 'function' || typeof formatPlainNumber !== 'function') {
    return;
  }

  createPortfolioWorkspace();
  bindPortfolioWorkspaceEvents();
  renderSidebarGoals();
  refreshGoalSelect();
  renderPortfolioWorkspace();
  refreshPortfolioSummary();
}

initPortfolioWorkspace();

// View switching function used by nav buttons
window.switchView = function switchView(viewId) {
  const views = { chat: document.getElementById('view-chat'), portfolio: document.getElementById('view-portfolio') };
  const navBtns = { chat: document.getElementById('nav-chat'), portfolio: document.getElementById('nav-portfolio') };

  Object.keys(views).forEach((id) => {
    if (views[id]) views[id].classList.toggle('active', id === viewId);
    if (navBtns[id]) navBtns[id].classList.toggle('active', id === viewId);
  });

  if (viewId === 'portfolio') {
    views.portfolio.scrollTop = 0;
  }
};


