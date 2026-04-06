const ESCALATION_PHRASE = "SEBI-registered advisor through this platform";
const CALCULATOR_TRIGGERS = ["calculate", "calculator", "how much will i get", "sip projection", "show me projection", "how much will i have", "corpus", "how much should i invest"];
const DEFAULT_SUGGESTIONS = [
  "How should I start investing as a beginner?",
  "What is SIP in simple language?",
  "How much should I invest every month?"
];

let conversationHistory = [];
let isSending = false;

const apiKeyInput = document.getElementById("api-key-input");
const apiKeyInputMobile = document.getElementById("api-key-input-mobile");
const mobileSettingsToggle = document.getElementById("mobile-settings-toggle");
const mobileApiPanel = document.getElementById("mobile-api-panel");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");
const chatThread = document.getElementById("chat-thread");
const typingIndicator = document.getElementById("typing-indicator");
const starterState = document.getElementById("starter-state");
const topicsFab = document.getElementById("topics-fab");
const topicsBackdrop = document.getElementById("topics-backdrop");
const mobileDrawer = document.getElementById("mobile-drawer");
const drawerClose = document.getElementById("drawer-close");

function formatCurrency(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `Rs ${numeric.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatSignedCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return `${sign}Rs ${Math.abs(numeric).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatSignedPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return `${sign}${Math.abs(numeric).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `${Math.round(numeric)}%`;
}

function formatPlainNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return numeric.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function calculateSIP(monthly, years, annualRate) {
  const safeMonthly = Math.max(0, Number(monthly) || 0);
  const safeYears = Math.max(0, Number(years) || 0);
  const safeAnnualRate = Math.max(0, Number(annualRate) || 0);
  const r = safeAnnualRate / 12 / 100;
  const n = safeYears * 12;
  let fv = 0;

  if (n > 0) {
    fv = r === 0 ? safeMonthly * n : safeMonthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }

  const invested = safeMonthly * n;
  const returns = fv - invested;
  return {
    corpus: Math.round(fv),
    invested: Math.round(invested),
    returns: Math.round(returns)
  };
}

const capConversationHistory = () => {
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
};

const scrollToLatest = () => requestAnimationFrame(() => {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
});

const startChatView = () => {
  starterState.classList.add("hidden");
  chatThread.classList.remove("hidden");
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineAssistantText(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code class="assistant-inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="assistant-inline-strong">$1</strong>');
}

function appendFormattedAssistantContent(bubble, content) {
  const body = document.createElement("div");
  body.className = "assistant-rich-text";

  const lines = String(content || "").replace(/\r/g, "").split("\n");
  let list = null;

  const flushList = () => {
    if (list && list.childElementCount) {
      body.appendChild(list);
    }
    list = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!list) {
        list = document.createElement("ul");
        list.className = "assistant-rich-list";
      }
      const item = document.createElement("li");
      item.innerHTML = formatInlineAssistantText(bulletMatch[1]);
      list.appendChild(item);
      return;
    }

    flushList();

    const headingMatch = line.match(/^\*\*(.+?)\*\*$/);
    const element = document.createElement(headingMatch ? "div" : "p");
    element.className = headingMatch ? "assistant-rich-heading" : "assistant-rich-paragraph";
    element.innerHTML = formatInlineAssistantText(headingMatch ? headingMatch[1] : line);
    body.appendChild(element);
  });

  flushList();
  bubble.appendChild(body);
}

function createMessageRow(role, bubbleClass, content) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "F";
    row.appendChild(avatar);
  }

  const stack = document.createElement("div");
  stack.className = "message-stack";

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${bubbleClass}`;
  if (role === "assistant" && bubbleClass === "assistant-bubble") {
    appendFormattedAssistantContent(bubble, content);
  } else {
    bubble.textContent = content;
  }

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = formatTimestamp();

  stack.appendChild(bubble);
  stack.appendChild(time);
  row.appendChild(stack);
  return { row, stack, time };
}

const appendUserMessage = (content) => {
  startChatView();
  const message = createMessageRow("user", "user-bubble", content);
  chatThread.appendChild(message.row);
  scrollToLatest();
};

function normalizeSuggestedQuestions(questions) {
  const normalized = [];
  const seen = new Set();
  const source = Array.isArray(questions) ? questions : [];

  for (const question of source) {
    const cleaned = typeof question === "string" ? question.replace(/\s+/g, " ").trim() : "";
    const key = cleaned.toLowerCase();
    if (!cleaned || cleaned.length < 8 || cleaned.length > 120 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(/\?$/.test(cleaned) ? cleaned : `${cleaned}?`);
    if (normalized.length === 3) {
      break;
    }
  }

  for (const fallback of DEFAULT_SUGGESTIONS) {
    const key = fallback.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(fallback);
    if (normalized.length === 3) {
      break;
    }
  }

  return normalized.slice(0, 3);
}

function createSuggestedQuestions(questions) {
  const wrapper = document.createElement("div");
  wrapper.className = "suggested-questions";

  const label = document.createElement("div");
  label.className = "suggested-label";
  label.textContent = "Suggested questions";

  const row = document.createElement("div");
  row.className = "suggested-chip-row";

  questions.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggested-chip";
    button.textContent = question;
    row.appendChild(button);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(row);
  return wrapper;
}
function normalizeRetrievedSources(sources) {
  const normalized = [];
  const seen = new Set();

  (Array.isArray(sources) ? sources : []).forEach((source) => {
    if (!source || typeof source !== "object") {
      return;
    }

    const title = typeof source.title === "string" ? source.title.replace(/\s+/g, " ").trim() : "";
    if (!title) {
      return;
    }

    const key = `${title.toLowerCase()}|${String(source.publishedAt || "").toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push({
      title,
      category: typeof source.category === "string" ? source.category.trim() : "",
      publishedAt: typeof source.publishedAt === "string" ? source.publishedAt.trim() : "",
      sourceUrl: typeof source.sourceUrl === "string" ? source.sourceUrl.trim() : ""
    });
  });

  return normalized.slice(0, 4);
}

function createRetrievedSourcesCard(sources) {
  const normalized = normalizeRetrievedSources(sources);
  if (!normalized.length) {
    return null;
  }

  const card = document.createElement("div");
  card.className = "source-card";

  const header = document.createElement("div");
  header.className = "source-card-header";

  const title = document.createElement("div");
  title.className = "source-card-title";
  title.textContent = "Grounded in the knowledge base";

  const subtitle = document.createElement("div");
  subtitle.className = "source-card-subtitle";
  subtitle.textContent = "These references were retrieved to support the answer.";

  header.appendChild(title);
  header.appendChild(subtitle);
  card.appendChild(header);

  const list = document.createElement("div");
  list.className = "source-list";

  normalized.forEach((source) => {
    const item = document.createElement(source.sourceUrl ? "a" : "div");
    item.className = "source-item";

    if (source.sourceUrl) {
      item.href = source.sourceUrl;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
    }

    const sourceTitle = document.createElement("div");
    sourceTitle.className = "source-item-title";
    sourceTitle.textContent = source.title;

    const metadata = [];
    if (source.category) {
      metadata.push(source.category);
    }
    if (source.publishedAt) {
      metadata.push(source.publishedAt);
    }

    const sourceMeta = document.createElement("div");
    sourceMeta.className = "source-item-meta";
    sourceMeta.textContent = metadata.join(" · ") || "Internal knowledge note";

    item.appendChild(sourceTitle);
    item.appendChild(sourceMeta);
    list.appendChild(item);
  });

  card.appendChild(list);
  return card;
}
function createAdvisorCard() {
  const card = document.createElement("div");
  card.className = "advisor-card";
  card.innerHTML = `
    <h3 class="advisor-heading">Talk to a SEBI-registered Advisor</h3>
    <p class="advisor-subtext">Get personalised investment guidance tailored to your goals and financial situation</p>
    <div class="advisor-points">
      <div class="advisor-point"><span class="advisor-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span>Free initial consultation</span></div>
      <div class="advisor-point"><span class="advisor-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span>SEBI regulated and compliant</span></div>
      <div class="advisor-point"><span class="advisor-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span>Response within 24 hours</span></div>
    </div>
    <button type="button" class="consult-button">Request Consultation</button>
  `;
  return card;
}

function getToneClass(marketData) {
  return marketData && marketData.tone ? marketData.tone : "neutral";
}

function getSignedClass(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "neutral";
  }
  if (numeric > 0) {
    return "positive";
  }
  if (numeric < 0) {
    return "negative";
  }
  return "neutral";
}

function createMarketBadge(text, tone) {
  const badge = document.createElement("div");
  badge.className = `market-badge ${tone || "neutral"}`;
  badge.textContent = text;
  return badge;
}

function createMarketHighlight(label, value, toneClass) {
  const item = document.createElement("div");
  item.className = "market-highlight";

  const labelEl = document.createElement("div");
  labelEl.className = "market-stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = `market-highlight-value ${toneClass || "neutral"}`;
  valueEl.textContent = value;

  item.appendChild(labelEl);
  item.appendChild(valueEl);
  return item;
}

function createMarketStat(label, value, toneClass) {
  const item = document.createElement("div");
  item.className = "market-stat";

  const labelEl = document.createElement("div");
  labelEl.className = "market-stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = `market-stat-value ${toneClass || "neutral"}`;
  valueEl.textContent = value;

  item.appendChild(labelEl);
  item.appendChild(valueEl);
  return item;
}

function createMarketCard(marketData) {
  const card = document.createElement("div");
  card.className = `market-card ${getToneClass(marketData)}`;

  const header = document.createElement("div");
  header.className = "market-card-header";

  const headingBlock = document.createElement("div");
  const eyebrow = document.createElement("div");
  eyebrow.className = "market-eyebrow";
  eyebrow.textContent = marketData.instrumentType === "index" ? "Live index snapshot" : "Live NSE stock snapshot";

  const title = document.createElement("h3");
  title.className = "market-card-title";
  title.textContent = marketData.label + (marketData.symbol ? ` (${marketData.symbol})` : "");

  const updated = document.createElement("div");
  updated.className = "market-updated";
  updated.textContent = marketData.lastUpdated ? `Updated: ${marketData.lastUpdated}` : "Live market data from NSE";

  const badgeRow = document.createElement("div");
  badgeRow.className = "market-badge-row";
  badgeRow.appendChild(createMarketBadge(marketData.trendLabel || "Live market update", getToneClass(marketData)));
  if (marketData.volatilityPct != null) {
    badgeRow.appendChild(createMarketBadge(`Range ${formatPlainNumber(marketData.volatilityPct)}%`, "neutral"));
  }
  if (marketData.rangePosition != null) {
    badgeRow.appendChild(createMarketBadge(`Intra-day position ${formatPercent(marketData.rangePosition)}`, "neutral"));
  }

  headingBlock.appendChild(eyebrow);
  headingBlock.appendChild(title);
  headingBlock.appendChild(updated);
  headingBlock.appendChild(badgeRow);
  header.appendChild(headingBlock);
  card.appendChild(header);

  const highlightGrid = document.createElement("div");
  highlightGrid.className = "market-highlight-grid";
  highlightGrid.appendChild(createMarketHighlight("Latest Price", formatCurrency(marketData.lastPrice, 2), getToneClass(marketData)));
  highlightGrid.appendChild(createMarketHighlight("Daily Change", `${formatSignedCurrency(marketData.change)} (${formatSignedPercent(marketData.percentChange)})`, getSignedClass(marketData.change)));
  highlightGrid.appendChild(createMarketHighlight("Open", formatCurrency(marketData.open, 2), "neutral"));
  highlightGrid.appendChild(createMarketHighlight("Previous Close", formatCurrency(marketData.previousClose, 2), "neutral"));
  card.appendChild(highlightGrid);

  const statsGrid = document.createElement("div");
  statsGrid.className = "market-stat-grid";
  statsGrid.appendChild(createMarketStat("Day High", formatCurrency(marketData.high, 2), "neutral"));
  statsGrid.appendChild(createMarketStat("Day Low", formatCurrency(marketData.low, 2), "neutral"));
  statsGrid.appendChild(createMarketStat("Support", formatCurrency(marketData.supportLevel, 2), "neutral"));
  statsGrid.appendChild(createMarketStat("Resistance", formatCurrency(marketData.resistanceLevel, 2), "neutral"));
  card.appendChild(statsGrid);

  const rangePanel = document.createElement("div");
  rangePanel.className = "market-range-panel";

  const rangeHeader = document.createElement("div");
  rangeHeader.className = "market-range-label-row";
  const rangeTitle = document.createElement("div");
  rangeTitle.className = "market-section-label";
  rangeTitle.textContent = "Current position within today's range";
  const rangePct = document.createElement("div");
  rangePct.className = "market-range-label";
  rangePct.textContent = marketData.rangePosition != null ? `${formatPercent(marketData.rangePosition)} from the day's low` : "Range data unavailable";
  rangeHeader.appendChild(rangeTitle);
  rangeHeader.appendChild(rangePct);
  rangePanel.appendChild(rangeHeader);

  const bar = document.createElement("div");
  bar.className = "market-range-bar";
  const fill = document.createElement("div");
  fill.className = "market-range-fill";
  bar.appendChild(fill);
  if (marketData.rangePosition != null) {
    const marker = document.createElement("div");
    marker.className = "market-range-marker";
    marker.style.left = `${Math.max(4, Math.min(96, Number(marketData.rangePosition)))}%`;
    bar.appendChild(marker);
  }
  rangePanel.appendChild(bar);
  const rangeValues = document.createElement("div");
  rangeValues.className = "market-range-values";
  const lowText = document.createElement("div");
  lowText.className = "market-range-label";
  lowText.textContent = `Low: ${formatCurrency(marketData.low, 2)}`;
  const currentText = document.createElement("div");
  currentText.className = "market-range-label";
  currentText.textContent = `Current: ${formatCurrency(marketData.lastPrice, 2)}`;
  const highText = document.createElement("div");
  highText.className = "market-range-label";
  highText.textContent = `High: ${formatCurrency(marketData.high, 2)}`;
  rangeValues.appendChild(lowText);
  rangeValues.appendChild(currentText);
  rangeValues.appendChild(highText);
  rangePanel.appendChild(rangeValues);
  card.appendChild(rangePanel);

  const summaryPanel = document.createElement("div");
  summaryPanel.className = "market-summary-panel";
  const summaryTitle = document.createElement("div");
  summaryTitle.className = "market-summary-title";
  summaryTitle.textContent = "Session summary";
  const summaryText = document.createElement("div");
  summaryText.className = "market-summary-note";
  summaryText.textContent = marketData.summary || "Live market data is available for this instrument.";
  summaryPanel.appendChild(summaryTitle);
  summaryPanel.appendChild(summaryText);
  card.appendChild(summaryPanel);

  const insightSection = document.createElement("div");
  insightSection.className = "market-section";
  const insightLabel = document.createElement("div");
  insightLabel.className = "market-section-label";
  insightLabel.textContent = "What this move is saying";
  insightSection.appendChild(insightLabel);

  const insightList = document.createElement("ul");
  insightList.className = "market-insight-list";
  (marketData.bullets || []).forEach((bullet) => {
    const item = document.createElement("li");
    item.textContent = bullet;
    insightList.appendChild(item);
  });
  insightSection.appendChild(insightList);
  card.appendChild(insightSection);

  const levelRow = document.createElement("div");
  levelRow.className = "market-level-row";
  levelRow.appendChild(createMarketBadge(marketData.watchText || "Watch how the session develops from here.", "neutral"));
  card.appendChild(levelRow);

  const footnote = document.createElement("div");
  footnote.className = "market-footnote";
  footnote.textContent = "Live NSE snapshot. Prices can change quickly during market hours. This is educational information, not a buy or sell recommendation.";
  card.appendChild(footnote);

  return card;
}

function appendAssistantMessage(content, marketData, suggestedQuestions, retrievedSources) {
  startChatView();
  const message = createMessageRow("assistant", "assistant-bubble", content);

  if (marketData) {
    message.stack.insertBefore(createMarketCard(marketData), message.time);
  }
  const sourcesCard = createRetrievedSourcesCard(retrievedSources);
  if (sourcesCard) {
    message.stack.insertBefore(sourcesCard, message.time);
  }
  if (content.includes(ESCALATION_PHRASE)) {
    message.stack.insertBefore(createAdvisorCard(), message.time);
  }
  message.stack.insertBefore(createSuggestedQuestions(normalizeSuggestedQuestions(suggestedQuestions)), message.time);

  chatThread.appendChild(message.row);
  scrollToLatest();
}

const appendErrorMessage = (content) => {
  startChatView();
  const message = createMessageRow("assistant", "error-bubble", content);
  chatThread.appendChild(message.row);
  scrollToLatest();
};

function updateCalculatorCard(card) {
  const monthly = card.querySelector('[data-field="monthly"]').value;
  const years = card.querySelector('[data-field="years"]').value;
  const annual = card.querySelector('[data-field="annual"]').value;
  const results = calculateSIP(monthly, years, annual);
  const total = Math.max(results.corpus, 1);
  const investedPct = Math.max(0, (results.invested / total) * 100);
  const returnsPct = Math.max(0, (results.returns / total) * 100);

  card.querySelector('[data-output="corpus"]').textContent = formatCurrency(results.corpus);
  card.querySelector('[data-output="invested"]').textContent = formatCurrency(results.invested);
  card.querySelector('[data-output="returns"]').textContent = formatCurrency(results.returns);
  card.querySelector('[data-bar="invested"]').style.width = `${investedPct}%`;
  card.querySelector('[data-bar="returns"]').style.width = `${returnsPct}%`;
  card.querySelector('[data-label="invested"]').textContent = `Invested ${formatPercent(investedPct)}`;
  card.querySelector('[data-label="returns"]').textContent = `Returns ${formatPercent(returnsPct)}`;
}

function createCalculatorCard() {
  startChatView();

  const row = document.createElement("div");
  row.className = "message-row assistant";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "F";
  row.appendChild(avatar);

  const stack = document.createElement("div");
  stack.className = "message-stack";

  const card = document.createElement("div");
  card.className = "calc-card";
  card.innerHTML = `
    <h3 class="calc-heading">SIP Projection Calculator</h3>
    <div class="calc-grid">
      <label class="calc-field"><span class="calc-label">Monthly SIP Amount (Rs)</span><input class="calc-input" type="number" min="0" step="500" value="5000" data-field="monthly"></label>
      <label class="calc-field"><span class="calc-label">Duration (Years)</span><input class="calc-input" type="number" min="0" step="1" value="10" data-field="years"></label>
      <label class="calc-field"><span class="calc-label">Expected Annual Return (%)</span><input class="calc-input" type="number" min="0" step="0.5" value="12" data-field="annual"></label>
    </div>
    <button type="button" class="calc-button">Calculate</button>
    <div class="calc-results">
      <div class="calc-corpus"><div class="calc-corpus-label">Projected Corpus</div><div class="calc-corpus-value" data-output="corpus"></div></div>
      <div class="calc-stat-grid">
        <div class="calc-stat"><div class="calc-stat-label">Total Amount Invested</div><div class="calc-stat-value" data-output="invested"></div></div>
        <div class="calc-stat"><div class="calc-stat-label">Total Returns Generated</div><div class="calc-stat-value" data-output="returns"></div></div>
      </div>
      <div class="allocation-bar" aria-hidden="true"><div class="allocation-invested" data-bar="invested"></div><div class="allocation-returns" data-bar="returns"></div></div>
      <div class="allocation-labels"><span data-label="invested"></span><span data-label="returns"></span></div>
      <div class="calc-disclaimer">These figures are illustrative only. Mutual fund investments are subject to market risk.</div>
    </div>
  `;

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = formatTimestamp();

  stack.appendChild(card);
  stack.appendChild(time);
  row.appendChild(stack);
  chatThread.appendChild(row);

  updateCalculatorCard(card);
  scrollToLatest();
}
const shouldRenderCalculator = (message) => CALCULATOR_TRIGGERS.some((trigger) => message.trim().toLowerCase().includes(trigger));
const showTypingIndicator = () => {
  typingIndicator.classList.remove("hidden");
  scrollToLatest();
};
const hideTypingIndicator = () => typingIndicator.classList.add("hidden");
const setSendingState = (sending) => {
  isSending = sending;
  chatInput.disabled = sending;
  sendButton.disabled = sending;
  sendButton.textContent = sending ? "Sending..." : "Send";
};

async function sendMessage(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });
  capConversationHistory();
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, conversationHistory })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const assistantMessage = data.message;
    conversationHistory.push({ role: "assistant", content: assistantMessage });
    capConversationHistory();
    hideTypingIndicator();

    return {
      type: "assistant",
      content: assistantMessage,
      marketData: data.marketData || null,
      suggestedQuestions: data.suggestedQuestions || [],
      retrievedSources: data.retrievedSources || []
    };
  } catch (error) {
    conversationHistory.pop();
    hideTypingIndicator();

    if (error.status === 429) {
      return { type: "error", content: "You have hit Groq's free tier rate limit. Please wait about a minute and try again." };
    }
    if (error instanceof TypeError) {
      return { type: "error", content: "Could not connect. Please check your internet connection and try again." };
    }
    return { type: "error", content: error.message || "The AI backend is not configured yet. Please contact the site owner." };
  }
}

async function handleOutgoingMessage(rawMessage) {
  const userMessage = rawMessage.trim();
  if (!userMessage || isSending) {
    return;
  }

  appendUserMessage(userMessage);
  chatInput.value = "";
  closeTopicsDrawer();

  if (shouldRenderCalculator(userMessage)) {
    createCalculatorCard();
  }

  setSendingState(true);
  const result = await sendMessage(userMessage);
  setSendingState(false);

  if (!result) {
    return;
  }

  if (result.type === "error") {
    appendErrorMessage(result.content);
  } else {
    appendAssistantMessage(result.content, result.marketData, result.suggestedQuestions, result.retrievedSources);
  }
}

const openTopicsDrawer = () => {
  topicsBackdrop.classList.add("open");
  mobileDrawer.classList.add("open");
  document.body.style.overflow = "hidden";
};

const closeTopicsDrawer = () => {
  topicsBackdrop.classList.remove("open");
  mobileDrawer.classList.remove("open");
  document.body.style.overflow = "";
};

apiKeyInput.addEventListener("input", (event) => {
  apiKeyInputMobile.value = event.target.value;
});

apiKeyInputMobile.addEventListener("input", (event) => {
  apiKeyInput.value = event.target.value;
});

mobileSettingsToggle.addEventListener("click", () => mobileApiPanel.classList.toggle("open"));
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleOutgoingMessage(chatInput.value);
});

chatMessages.addEventListener("click", (event) => {
  const starterCard = event.target.closest(".starter-card");
  if (starterCard) {
    handleOutgoingMessage(starterCard.dataset.starter || starterCard.textContent || "");
    return;
  }

  const suggestedChip = event.target.closest(".suggested-chip");
  if (suggestedChip) {
    handleOutgoingMessage(suggestedChip.textContent || "");
    return;
  }

  const consultButton = event.target.closest(".consult-button");
  if (consultButton && !consultButton.disabled) {
    consultButton.disabled = true;
    consultButton.classList.add("sent");
    consultButton.textContent = "Request sent! An advisor will reach out within 24 hours.";
    return;
  }

  const calcButton = event.target.closest(".calc-button");
  if (calcButton) {
    const calcCard = calcButton.closest(".calc-card");
    if (calcCard) {
      updateCalculatorCard(calcCard);
    }
  }
});

chatMessages.addEventListener("input", (event) => {
  const calcInput = event.target.closest(".calc-input");
  if (calcInput) {
    const calcCard = calcInput.closest(".calc-card");
    if (calcCard) {
      updateCalculatorCard(calcCard);
    }
  }
});

document.addEventListener("click", (event) => {
  const topicButton = event.target.closest(".quick-topic");
  if (topicButton) {
    handleOutgoingMessage(topicButton.textContent || "");
  }
});

topicsFab.addEventListener("click", openTopicsDrawer);
topicsBackdrop.addEventListener("click", closeTopicsDrawer);
drawerClose.addEventListener("click", closeTopicsDrawer);
window.addEventListener("resize", () => {
  if (window.innerWidth > 767) {
    closeTopicsDrawer();
    mobileApiPanel.classList.remove("open");
  }
});












