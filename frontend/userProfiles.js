(function () {
  const DEFAULT_USER_ID = 'keyur-padia';
  const ACTIVE_USER_KEY = 'wealthtick_active_user_id';
  const LEGACY_PROFILE_KEY = 'wealthtick_profile';
  const LEGACY_HOLDINGS_KEY = 'wealthtick_holdings';
  const LEGACY_GOALS_KEY = 'wealthtick_goals';

  const USER_PROFILE_CATALOG = [
    {
      id: 'keyur-padia',
      profile: { name: 'Keyur Padia', age: 30, city: 'Mumbai' },
      plan: {
        label: 'Growth SIP plan',
        monthlyInvestment: 25000,
        riskProfile: 'Moderate aggressive',
        horizon: '25+ years',
        notes: 'Long runway, retirement-first allocation with a small education bucket.'
      },
      goals: [
        { id: 'retirement', name: 'Retirement', targetAmount: 10000000, color: '#1D9E75', targetYear: 2055 },
        { id: 'child-education', name: 'Child Education', targetAmount: 5000000, color: '#3B82F6', targetYear: 2040 },
        { id: 'emergency-fund', name: 'Emergency Fund', targetAmount: 1500000, color: '#F59E0B', targetYear: null },
        { id: 'wealth-creation', name: 'Wealth Creation', targetAmount: 0, color: '#8B5CF6', targetYear: null }
      ],
      holdings: [
        { id: 'tcs', name: 'Tata Consultancy Services', symbol: 'TCS', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 18, averagePrice: 3380, currentPrice: 3612.35, dayChangePct: 1.42, goalTag: 'Retirement', purchaseDate: '2023-11-15' },
        { id: 'hdfc-bank', name: 'HDFC Bank', symbol: 'HDFCBANK', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 26, averagePrice: 1540, currentPrice: 1684.55, dayChangePct: 0.86, goalTag: 'Retirement', purchaseDate: '2024-01-20' },
        { id: 'nifty-index-fund', name: 'ICICI Prudential Nifty 50 Index Fund', symbol: 'NIFTYINDEX', assetType: 'Mutual Fund', sector: 'Index Fund', marketCap: 'Large Cap', quantity: 340, averagePrice: 182.5, currentPrice: 196.4, dayChangePct: 0.54, goalTag: 'Retirement', purchaseDate: '2023-06-10' },
        { id: 'bharat-bond', name: 'Bharat Bond ETF', symbol: 'BHARATBOND', assetType: 'Debt ETF', sector: 'Fixed Income', marketCap: 'Debt', quantity: 120, averagePrice: 121.8, currentPrice: 124.1, dayChangePct: 0.12, goalTag: 'Emergency Fund', purchaseDate: '2025-08-05' },
        { id: 'sbi-small-cap', name: 'SBI Small Cap Fund', symbol: 'SBISMALL', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Small Cap', quantity: 95, averagePrice: 114.2, currentPrice: 129.8, dayChangePct: -0.35, goalTag: 'Child Education', purchaseDate: '2025-02-14' },
        { id: 'reliance-keyur', name: 'Reliance Industries', symbol: 'RELIANCE', assetType: 'Equity', sector: 'Energy', marketCap: 'Large Cap', quantity: 12, averagePrice: 2580, currentPrice: 2784.4, dayChangePct: 1.18, goalTag: 'Wealth Creation', purchaseDate: '2024-02-09' },
        { id: 'infosys-keyur', name: 'Infosys', symbol: 'INFY', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 16, averagePrice: 1428, currentPrice: 1538.25, dayChangePct: 0.64, goalTag: 'Retirement', purchaseDate: '2024-07-12' },
        { id: 'axis-bank-keyur', name: 'Axis Bank', symbol: 'AXISBANK', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 34, averagePrice: 948, currentPrice: 1089.75, dayChangePct: -0.42, goalTag: 'Wealth Creation', purchaseDate: '2023-09-18' },
        { id: 'maruti-suzuki-keyur', name: 'Maruti Suzuki India', symbol: 'MARUTI', assetType: 'Equity', sector: 'Automobile', marketCap: 'Large Cap', quantity: 5, averagePrice: 10120, currentPrice: 11348.6, dayChangePct: 0.31, goalTag: 'Retirement', purchaseDate: '2023-12-06' },
        { id: 'asian-paints-keyur', name: 'Asian Paints', symbol: 'ASIANPAINT', assetType: 'Equity', sector: 'Consumer Goods', marketCap: 'Large Cap', quantity: 9, averagePrice: 2875, currentPrice: 3024.5, dayChangePct: -0.18, goalTag: 'Child Education', purchaseDate: '2024-05-21' },
        { id: 'kotak-emerging-equity-keyur', name: 'Kotak Emerging Equity Fund', symbol: 'KOTAKEMERGE', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Mid Cap', quantity: 210, averagePrice: 103.4, currentPrice: 119.8, dayChangePct: 0.47, goalTag: 'Wealth Creation', purchaseDate: '2023-04-14' },
        { id: 'uti-nifty-200-momentum-keyur', name: 'UTI Nifty 200 Momentum 30 Index Fund', symbol: 'UTIMOMENTUM', assetType: 'Mutual Fund', sector: 'Index Fund', marketCap: 'Multi Cap', quantity: 180, averagePrice: 19.8, currentPrice: 23.6, dayChangePct: 0.69, goalTag: 'Retirement', purchaseDate: '2024-10-10' },
        { id: 'nippon-india-gold-bees-keyur', name: 'Nippon India Gold BeES', symbol: 'GOLDBEES', assetType: 'Gold ETF', sector: 'Gold', marketCap: 'Commodity', quantity: 70, averagePrice: 55.6, currentPrice: 64.9, dayChangePct: -0.14, goalTag: 'Emergency Fund', purchaseDate: '2024-01-04' },
        { id: 'icici-liquid-fund-keyur', name: 'ICICI Prudential Liquid Fund', symbol: 'ICICILIQUID', assetType: 'Mutual Fund', sector: 'Fixed Income', marketCap: 'Debt', quantity: 860, averagePrice: 100.8, currentPrice: 103.2, dayChangePct: 0.03, goalTag: 'Emergency Fund', purchaseDate: '2025-04-02' },
        { id: 'sbi-bluechip-keyur', name: 'SBI Bluechip Fund', symbol: 'SBIBLUECHIP', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Large Cap', quantity: 145, averagePrice: 78.5, currentPrice: 86.7, dayChangePct: 0.24, goalTag: 'Child Education', purchaseDate: '2023-08-28' }
      ]
    },
    {
      id: 'meera-iyer',
      profile: { name: 'Meera Iyer', age: 35, city: 'Bengaluru' },
      plan: {
        label: 'Home deposit and stability plan',
        monthlyInvestment: 42000,
        riskProfile: 'Moderate',
        horizon: '5-12 years',
        notes: 'Keeps a larger defensive sleeve because the home down payment goal is closer.'
      },
      goals: [
        { id: 'home-down-payment', name: 'Home Down Payment', targetAmount: 4500000, color: '#0EA5E9', targetYear: 2031 },
        { id: 'retirement', name: 'Retirement', targetAmount: 18000000, color: '#1D9E75', targetYear: 2051 },
        { id: 'emergency-fund', name: 'Emergency Fund', targetAmount: 1800000, color: '#F59E0B', targetYear: null },
        { id: 'travel', name: 'Travel', targetAmount: 700000, color: '#EC4899', targetYear: 2028 }
      ],
      holdings: [
        { id: 'hdfc-balanced-advantage', name: 'HDFC Balanced Advantage Fund', symbol: 'HDFCBALADV', assetType: 'Mutual Fund', sector: 'Hybrid Equity', marketCap: 'Multi Cap', quantity: 420, averagePrice: 385.2, currentPrice: 407.9, dayChangePct: 0.28, goalTag: 'Home Down Payment', purchaseDate: '2022-09-12' },
        { id: 'icici-nifty-next-50', name: 'ICICI Prudential Nifty Next 50 Index Fund', symbol: 'NIFTYNEXT50', assetType: 'Mutual Fund', sector: 'Index Fund', marketCap: 'Large Cap', quantity: 260, averagePrice: 51.4, currentPrice: 58.1, dayChangePct: 0.74, goalTag: 'Retirement', purchaseDate: '2023-05-19' },
        { id: 'bharat-bond-2030', name: 'Bharat Bond ETF 2030', symbol: 'BBETF2030', assetType: 'Debt ETF', sector: 'Fixed Income', marketCap: 'Debt', quantity: 310, averagePrice: 116.8, currentPrice: 121.6, dayChangePct: 0.08, goalTag: 'Home Down Payment', purchaseDate: '2024-03-02' },
        { id: 'sbi-gold-etf', name: 'SBI Gold ETF', symbol: 'SBIGETS', assetType: 'Gold ETF', sector: 'Gold', marketCap: 'Commodity', quantity: 42, averagePrice: 58.3, currentPrice: 66.2, dayChangePct: -0.21, goalTag: 'Emergency Fund', purchaseDate: '2023-12-04' },
        { id: 'infosys', name: 'Infosys', symbol: 'INFY', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 14, averagePrice: 1465, currentPrice: 1538.25, dayChangePct: 0.64, goalTag: 'Retirement', purchaseDate: '2024-08-16' },
        { id: 'ltimindtree-meera', name: 'LTIMindtree', symbol: 'LTIM', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 6, averagePrice: 5120, currentPrice: 5488.2, dayChangePct: 0.58, goalTag: 'Retirement', purchaseDate: '2024-06-11' },
        { id: 'sbi-card-meera', name: 'SBI Cards and Payment Services', symbol: 'SBICARD', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Mid Cap', quantity: 32, averagePrice: 715, currentPrice: 748.4, dayChangePct: -0.33, goalTag: 'Home Down Payment', purchaseDate: '2024-09-20' },
        { id: 'titan-meera', name: 'Titan Company', symbol: 'TITAN', assetType: 'Equity', sector: 'Consumer Discretionary', marketCap: 'Large Cap', quantity: 8, averagePrice: 3220, currentPrice: 3512.7, dayChangePct: 0.42, goalTag: 'Travel', purchaseDate: '2023-10-03' },
        { id: 'hindustan-unilever-meera', name: 'Hindustan Unilever', symbol: 'HINDUNILVR', assetType: 'Equity', sector: 'Consumer Goods', marketCap: 'Large Cap', quantity: 10, averagePrice: 2425, currentPrice: 2568.8, dayChangePct: 0.16, goalTag: 'Emergency Fund', purchaseDate: '2023-07-14' },
        { id: 'icici-bank-meera', name: 'ICICI Bank', symbol: 'ICICIBANK', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 28, averagePrice: 968, currentPrice: 1112.3, dayChangePct: 0.75, goalTag: 'Retirement', purchaseDate: '2022-12-02' },
        { id: 'mirae-large-midcap-meera', name: 'Mirae Asset Large & Midcap Fund', symbol: 'MIRAELARGEMID', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Multi Cap', quantity: 320, averagePrice: 98.6, currentPrice: 112.4, dayChangePct: 0.39, goalTag: 'Retirement', purchaseDate: '2022-05-18' },
        { id: 'axis-short-duration-meera', name: 'Axis Short Duration Fund', symbol: 'AXISSHORTDUR', assetType: 'Mutual Fund', sector: 'Fixed Income', marketCap: 'Debt', quantity: 640, averagePrice: 26.8, currentPrice: 28.1, dayChangePct: 0.04, goalTag: 'Home Down Payment', purchaseDate: '2024-01-24' },
        { id: 'motilal-nasdaq-100-meera', name: 'Motilal Oswal Nasdaq 100 ETF', symbol: 'MON100', assetType: 'ETF', sector: 'International Equity', marketCap: 'Global', quantity: 45, averagePrice: 122.4, currentPrice: 139.7, dayChangePct: 0.92, goalTag: 'Travel', purchaseDate: '2023-11-27' },
        { id: 'hdfc-money-market-meera', name: 'HDFC Money Market Fund', symbol: 'HDFCMONEY', assetType: 'Mutual Fund', sector: 'Fixed Income', marketCap: 'Debt', quantity: 780, averagePrice: 49.2, currentPrice: 50.6, dayChangePct: 0.02, goalTag: 'Emergency Fund', purchaseDate: '2025-01-08' },
        { id: 'canara-robeco-bluechip-meera', name: 'Canara Robeco Bluechip Equity Fund', symbol: 'CANBLUECHIP', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Large Cap', quantity: 260, averagePrice: 57.8, currentPrice: 64.5, dayChangePct: 0.26, goalTag: 'Retirement', purchaseDate: '2023-03-16' }
      ]
    },
    {
      id: 'rohan-mehta',
      profile: { name: 'Rohan Mehta', age: 42, city: 'Pune' },
      plan: {
        label: 'Family goals and retirement plan',
        monthlyInvestment: 65000,
        riskProfile: 'Balanced',
        horizon: '8-18 years',
        notes: 'Multiple goals need clearer buckets: child education, parents health reserve, and retirement.'
      },
      goals: [
        { id: 'child-education', name: 'Child Education', targetAmount: 8000000, color: '#3B82F6', targetYear: 2037 },
        { id: 'retirement', name: 'Retirement', targetAmount: 25000000, color: '#1D9E75', targetYear: 2049 },
        { id: 'parents-health', name: 'Parents Health', targetAmount: 2500000, color: '#EF4444', targetYear: null },
        { id: 'wealth-creation', name: 'Wealth Creation', targetAmount: 0, color: '#8B5CF6', targetYear: null }
      ],
      holdings: [
        { id: 'reliance-industries', name: 'Reliance Industries', symbol: 'RELIANCE', assetType: 'Equity', sector: 'Energy', marketCap: 'Large Cap', quantity: 38, averagePrice: 2430, currentPrice: 2784.4, dayChangePct: 1.18, goalTag: 'Retirement', purchaseDate: '2021-10-22' },
        { id: 'axis-bank', name: 'Axis Bank', symbol: 'AXISBANK', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 62, averagePrice: 872, currentPrice: 1089.75, dayChangePct: -0.42, goalTag: 'Retirement', purchaseDate: '2022-06-07' },
        { id: 'ppfas-flexi-cap', name: 'Parag Parikh Flexi Cap Fund', symbol: 'PPFASFLEXI', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Multi Cap', quantity: 540, averagePrice: 62.4, currentPrice: 78.9, dayChangePct: 0.36, goalTag: 'Child Education', purchaseDate: '2020-11-11' },
        { id: 'nippon-small-cap', name: 'Nippon India Small Cap Fund', symbol: 'NIPPONSMALL', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Small Cap', quantity: 180, averagePrice: 122.5, currentPrice: 168.7, dayChangePct: -0.85, goalTag: 'Wealth Creation', purchaseDate: '2023-01-18' },
        { id: 'kotak-banking-etf', name: 'Kotak Banking ETF', symbol: 'KOTAKBANKETF', assetType: 'ETF', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 260, averagePrice: 422.2, currentPrice: 443.8, dayChangePct: 0.22, goalTag: 'Child Education', purchaseDate: '2024-04-12' },
        { id: 'bharat-bond-rohan', name: 'Bharat Bond ETF', symbol: 'BHARATBOND', assetType: 'Debt ETF', sector: 'Fixed Income', marketCap: 'Debt', quantity: 420, averagePrice: 119.4, currentPrice: 124.1, dayChangePct: 0.12, goalTag: 'Parents Health', purchaseDate: '2024-09-09' },
        { id: 'tcs-rohan', name: 'Tata Consultancy Services', symbol: 'TCS', assetType: 'Equity', sector: 'Information Technology', marketCap: 'Large Cap', quantity: 20, averagePrice: 3210, currentPrice: 3612.35, dayChangePct: 1.42, goalTag: 'Retirement', purchaseDate: '2021-08-19' },
        { id: 'sun-pharma-rohan', name: 'Sun Pharmaceutical Industries', symbol: 'SUNPHARMA', assetType: 'Equity', sector: 'Healthcare', marketCap: 'Large Cap', quantity: 36, averagePrice: 1178, currentPrice: 1396.5, dayChangePct: 0.37, goalTag: 'Parents Health', purchaseDate: '2023-06-22' },
        { id: 'avenue-supermarts-rohan', name: 'Avenue Supermarts', symbol: 'DMART', assetType: 'Equity', sector: 'Consumer Discretionary', marketCap: 'Large Cap', quantity: 7, averagePrice: 3820, currentPrice: 4215.9, dayChangePct: -0.24, goalTag: 'Child Education', purchaseDate: '2023-09-29' },
        { id: 'larsen-toubro-rohan', name: 'Larsen & Toubro', symbol: 'LT', assetType: 'Equity', sector: 'Capital Goods', marketCap: 'Large Cap', quantity: 18, averagePrice: 2685, currentPrice: 3412.4, dayChangePct: 0.81, goalTag: 'Retirement', purchaseDate: '2022-03-10' },
        { id: 'bajaj-finance-rohan', name: 'Bajaj Finance', symbol: 'BAJFINANCE', assetType: 'Equity', sector: 'Financial Services', marketCap: 'Large Cap', quantity: 9, averagePrice: 6420, currentPrice: 7115.6, dayChangePct: -0.19, goalTag: 'Wealth Creation', purchaseDate: '2024-02-01' },
        { id: 'hdfc-midcap-opportunities-rohan', name: 'HDFC Mid-Cap Opportunities Fund', symbol: 'HDFCMIDCAP', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Mid Cap', quantity: 410, averagePrice: 126.8, currentPrice: 149.2, dayChangePct: 0.44, goalTag: 'Child Education', purchaseDate: '2021-12-15' },
        { id: 'icici-value-discovery-rohan', name: 'ICICI Prudential Value Discovery Fund', symbol: 'ICICIVALUE', assetType: 'Mutual Fund', sector: 'Diversified Equity', marketCap: 'Multi Cap', quantity: 360, averagePrice: 301.4, currentPrice: 348.9, dayChangePct: 0.21, goalTag: 'Retirement', purchaseDate: '2020-07-07' },
        { id: 'sbi-magnum-gilt-rohan', name: 'SBI Magnum Gilt Fund', symbol: 'SBIGILT', assetType: 'Mutual Fund', sector: 'Fixed Income', marketCap: 'Debt', quantity: 520, averagePrice: 58.4, currentPrice: 61.3, dayChangePct: 0.05, goalTag: 'Parents Health', purchaseDate: '2024-06-18' },
        { id: 'nifty-low-volatility-rohan', name: 'Nifty 100 Low Volatility 30 ETF', symbol: 'LOWVOLIETF', assetType: 'ETF', sector: 'Index Fund', marketCap: 'Large Cap', quantity: 190, averagePrice: 167.5, currentPrice: 181.2, dayChangePct: 0.18, goalTag: 'Retirement', purchaseDate: '2023-05-05' },
        { id: 'goldbees-rohan', name: 'Nippon India Gold BeES', symbol: 'GOLDBEES', assetType: 'Gold ETF', sector: 'Gold', marketCap: 'Commodity', quantity: 115, averagePrice: 53.9, currentPrice: 64.9, dayChangePct: -0.14, goalTag: 'Parents Health', purchaseDate: '2022-10-13' }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function getStorageKey(userId, bucket) {
    return `wealthtick_user_${userId}_${bucket}`;
  }

  function getUser(userId) {
    return USER_PROFILE_CATALOG.find((user) => user.id === userId) || USER_PROFILE_CATALOG[0];
  }

  function getUsers() {
    return USER_PROFILE_CATALOG.map((user) => ({
      id: user.id,
      name: user.profile.name,
      age: user.profile.age,
      city: user.profile.city,
      planLabel: user.plan.label
    }));
  }

  function getActiveUserId() {
    const saved = readJson(ACTIVE_USER_KEY);
    const rawId = typeof saved === 'string' ? saved : localStorage.getItem(ACTIVE_USER_KEY);
    return USER_PROFILE_CATALOG.some((user) => user.id === rawId) ? rawId : DEFAULT_USER_ID;
  }

  function loadProfile(userId = getActiveUserId()) {
    const seed = getUser(userId);
    const saved = readJson(getStorageKey(userId, 'profile'));
    const legacy = userId === DEFAULT_USER_ID ? readJson(LEGACY_PROFILE_KEY) : null;
    return { ...seed.profile, ...(legacy && legacy.name ? legacy : {}), ...(saved && saved.name ? saved : {}) };
  }

  function saveProfile(profile, userId = getActiveUserId()) {
    const seed = getUser(userId);
    const nextProfile = { ...seed.profile, ...profile };
    writeJson(getStorageKey(userId, 'profile'), nextProfile);
    if (userId === getActiveUserId()) {
      writeJson(LEGACY_PROFILE_KEY, nextProfile);
      window.dispatchEvent(new CustomEvent('wealthtick:profileUpdated', { detail: { userId, profile: clone(nextProfile) } }));
    }
  }

  function loadGoals(userId = getActiveUserId()) {
    const saved = readJson(getStorageKey(userId, 'goals'));
    const legacy = userId === DEFAULT_USER_ID ? readJson(LEGACY_GOALS_KEY) : null;
    if (Array.isArray(saved) && saved.length > 0) return clone(saved);
    if (Array.isArray(legacy) && legacy.length > 0) return clone(legacy);
    return clone(getUser(userId).goals);
  }

  function saveGoals(goals, userId = getActiveUserId()) {
    writeJson(getStorageKey(userId, 'goals'), goals);
    if (userId === getActiveUserId() && userId === DEFAULT_USER_ID) {
      writeJson(LEGACY_GOALS_KEY, goals);
    }
  }

  function loadHoldings(userId = getActiveUserId()) {
    const saved = readJson(getStorageKey(userId, 'holdings'));
    const legacy = userId === DEFAULT_USER_ID ? readJson(LEGACY_HOLDINGS_KEY) : null;
    if (Array.isArray(saved) && saved.length > 0) return clone(saved);
    if (Array.isArray(legacy) && legacy.length > 0) return clone(legacy);
    return clone(getUser(userId).holdings);
  }

  function saveHoldings(holdings, userId = getActiveUserId()) {
    writeJson(getStorageKey(userId, 'holdings'), holdings);
    if (userId === getActiveUserId() && userId === DEFAULT_USER_ID) {
      writeJson(LEGACY_HOLDINGS_KEY, holdings);
    }
  }

  function loadPlan(userId = getActiveUserId()) {
    const seed = getUser(userId);
    const saved = readJson(getStorageKey(userId, 'plan'));
    return { ...seed.plan, ...(saved && saved.label ? saved : {}) };
  }

  function savePlan(plan, userId = getActiveUserId()) {
    writeJson(getStorageKey(userId, 'plan'), { ...getUser(userId).plan, ...plan });
  }

  function getActiveUser() {
    const userId = getActiveUserId();
    return {
      id: userId,
      profile: loadProfile(userId),
      plan: loadPlan(userId),
      goals: loadGoals(userId),
      holdings: loadHoldings(userId)
    };
  }

  function setActiveUserId(userId) {
    const nextUser = getUser(userId);
    localStorage.setItem(ACTIVE_USER_KEY, nextUser.id);
    const profile = loadProfile(nextUser.id);
    writeJson(LEGACY_PROFILE_KEY, profile);
    window.dispatchEvent(new CustomEvent('wealthtick:userChanged', {
      detail: { userId: nextUser.id, profile: clone(profile), plan: loadPlan(nextUser.id) }
    }));
  }

  function resetUser(userId = getActiveUserId()) {
    const seed = getUser(userId);
    saveProfile(seed.profile, userId);
    savePlan(seed.plan, userId);
    saveGoals(seed.goals, userId);
    saveHoldings(seed.holdings, userId);
    return getActiveUser();
  }

  window.WealthtickUsers = {
    DEFAULT_USER_ID,
    getUsers,
    getUser: (userId) => clone(getUser(userId)),
    getActiveUserId,
    setActiveUserId,
    getActiveUser,
    loadProfile,
    saveProfile,
    loadGoals,
    saveGoals,
    loadHoldings,
    saveHoldings,
    loadPlan,
    savePlan,
    resetUser
  };
})();
