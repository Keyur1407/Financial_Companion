# Wealthtick Portfolio Analysis Module

## Goal
Build a portfolio module that includes everything visible in the Multibagg reference, but feels more useful, more intelligent, and more beginner-friendly inside Wealthtick.

This module should not feel like a static dashboard. It should feel like a live portfolio coach:
- showing what the portfolio looks like now
- explaining what is good, weak, risky, or improving
- connecting holdings to the user's goals and risk appetite
- helping the user understand "what this means" in plain language
- surfacing red flags and actionable next steps without crossing into personalised buy or sell advice

## Product Direction
Multibagg's module is strong on data display.
Wealthtick should be stronger on:
- explanation
- goal alignment
- portfolio health scoring
- beginner-friendly interpretation
- AI-assisted portfolio Q&A
- safety and compliance framing
- "what changed and why" summaries

The winning idea is:
`Portfolio Intelligence + Portfolio Education + Portfolio Monitoring`

## Core Sections We Should Include

### 1. Portfolio Overview
Top summary cards:
- Total portfolio value
- Total invested amount
- Overall gain or loss
- Today's gain or loss
- 1-month return
- XIRR or CAGR
- Benchmark comparison
- Number of holdings
- Risk score

Why this is better:
- Add an "At a glance" narrative summary beside the numbers
- Example: "Your portfolio is moderately aggressive, concentrated in 3 stocks, and currently underperforming Nifty 50 over the last 6 months."

### 2. Holdings Table
Detailed table:
- Company / fund name
- Symbol
- Asset type
- Quantity
- Average buy price
- Current price
- Invested value
- Current value
- Weight
- Today's change
- Overall P&L
- P&L percent
- Sector
- Market cap bucket
- Risk tag

Why this is better:
- Add "Portfolio role" labels like `Core`, `Satellite`, `High Risk`, `Income`, `Emergency`
- Add one-click AI prompts such as:
  - "Explain this holding"
  - "Why is this risky?"
  - "How much of my portfolio depends on this stock?"

### 3. Portfolio Performance
Charts:
- Portfolio value vs invested value over time
- Portfolio vs benchmark over time
- Drawdown chart
- Monthly return heatmap
- Contribution analysis by holding

Why this is better:
- Add "What changed this month?" summary
- Add benchmark switcher:
  - Nifty 50
  - Nifty 500
  - Sensex
  - category benchmark for mutual funds

### 4. Asset Allocation
Breakdowns:
- Asset class
- Sector
- Market cap
- Geography if relevant
- Single stock concentration
- Fund-house concentration for mutual funds

Why this is better:
- Add target vs current allocation
- Show concentration warnings visually
- Add "rebalance pressure meter"

### 5. Diversification Score
Show:
- Diversification score out of 100
- Community median or model benchmark
- Explanation of weak points

Scoring factors:
- number of holdings
- top 1, top 3, top 5 concentration
- sector concentration
- market cap concentration
- asset class balance
- correlation between holdings

Why this is better:
- Do not stop at score
- Explain score in plain language:
  - "You are diversified across 6 holdings, but 58% is still concentrated in one sector."

### 6. Risk Analytics
Include:
- Beta
- Volatility
- Sharpe ratio
- Sortino ratio
- Maximum drawdown
- Downside capture
- Upside capture
- Concentration risk
- Liquidity risk

Why this is better:
- Add beginner mode and advanced mode
- Beginner mode converts metrics into plain language
- Example:
  - "Your beta is 1.4. This means your portfolio may move more than the market in both directions."

### 7. Valuation Metrics
For equity-heavy portfolios:
- Weighted PE
- Weighted PB
- Dividend yield
- ROE
- Earnings growth
- Debt to equity

Comparison rows:
- Portfolio
- Benchmark
- Community median

Why this is better:
- Add interpretation, not just bars
- Example:
  - "Your portfolio trades at lower valuations than Nifty 50, but quality is mixed because 2 holdings have high debt."

### 8. Red Flags Engine
Detect:
- excessive single-stock concentration
- excessive sector concentration
- repeated underperformance
- poor earnings trend
- high debt
- weak cash flows
- corporate governance concerns
- unusual insider selling
- pledge concerns if data exists
- low liquidity
- high volatility spikes

Why this is better:
- Red flags should have severity levels:
  - low
  - moderate
  - high
- Each flag should answer:
  - what happened
  - why it matters
  - what to monitor next

### 9. Deals and Insider Activity
Track:
- insider buying / selling
- bulk deals
- block deals
- promoter activity

Why this is better:
- Link each event back to the user's exposure
- Example:
  - "This matters because this stock is 18% of your portfolio."

### 10. Announcements and News
For held stocks and funds:
- latest announcements
- earnings
- board changes
- regulatory events
- fund manager changes
- sector news

Why this is better:
- Cluster updates into:
  - positive
  - neutral
  - caution
- Add "Portfolio Impact Summary"
- Example:
  - "3 holdings had fresh announcements today. 1 is likely meaningful due to earnings miss."

### 11. Forecasting and Scenarios
Instead of weak generic forecasting, use:
- simple scenario simulator
- benchmark-based projection
- SIP and future contribution simulator
- downside stress test
- upside participation estimate

Useful scenarios:
- if market falls 10%
- if your top holding falls 15%
- if you add Rs 5,000 monthly
- if you rebalance to target allocation
- if small-cap exposure is cut from 40% to 20%

Why this is better:
- Focus on scenario understanding, not fake certainty
- Avoid overclaiming with AI-style price prediction

### 12. AI Portfolio Copilot
This is where Wealthtick should clearly beat Multibagg.

Add a dedicated AI assistant for portfolio context:
- "Explain my portfolio in simple words"
- "What is my biggest risk?"
- "Am I overexposed to small caps?"
- "Which holding is driving most of my returns?"
- "How does this portfolio align with my retirement goal?"
- "What changed since last month?"
- "Where am I too concentrated?"

This should use structured portfolio data plus your existing chat architecture.

## What Makes Wealthtick Better Than the Reference

### 1. Goal-Based Portfolio Intelligence
Do not stop at holdings analysis.
Connect the portfolio to:
- retirement goal
- emergency fund
- education goal
- short-term cash needs
- risk profile

Examples:
- "This portfolio is too equity-heavy for an emergency fund."
- "This allocation is reasonable for a long retirement horizon but may be aggressive for a 3-year goal."

### 2. Explainability Layer
Every section should answer:
- what this metric is
- why it matters
- whether the current reading is healthy

This is especially important because Wealthtick is built for guided financial understanding, not only data-heavy investors.

### 3. Portfolio Health Score
Create one flagship score that rolls up:
- diversification
- concentration
- risk balance
- drawdown profile
- benchmark behavior
- valuation quality
- governance red flags
- goal alignment

Suggested outputs:
- Portfolio Health Score: `74/100`
- Status: `Stable but concentrated`
- Summary: `Good long-term return potential, but single-stock exposure is too high and debt allocation is missing.`

### 4. Next Best Actions
Instead of only showing problems, suggest safe next steps:
- "Review top holding concentration"
- "Add debt allocation for balance"
- "Compare this portfolio against your retirement goal"
- "Track 2 recent announcements from core holdings"

These should be educational prompts, not personalised trade instructions.

### 5. Change Feed
Add a section called `What changed since your last review`.

Examples:
- overall value changed by Rs X
- one holding moved into high-risk zone
- sector concentration rose from 32% to 41%
- 2 new company announcements were detected

This creates stickiness and gives users a reason to return.

## Best Information Architecture

### Tab Structure
Recommended page sections:
1. Overview
2. Holdings
3. Allocation
4. Performance
5. Risk
6. Red Flags
7. News and Announcements
8. Scenarios
9. Ask AI

### Page Flow
Recommended vertical order:
1. Hero summary
2. AI portfolio summary
3. Health score and warnings
4. Holdings table
5. Allocation charts
6. Performance charts
7. Risk metrics
8. Red flags
9. News and announcements
10. Scenario lab

This flow works better than starting with tables because it tells the story first.

## UX Direction for Wealthtick

### Design Principles
- cleaner and more premium than dashboard-heavy competitors
- warm, modern, and readable
- explanation-first, not metric-first
- progressive disclosure for complex analytics
- mobile-friendly cards before large dense tables

### Interaction Ideas
- hover or click on any metric for "Why this matters"
- AI chips under each section
- compare current portfolio with target allocation
- sticky review summary card
- confidence labels on insights: `high confidence`, `moderate confidence`, `needs more data`

## Technical Fit with Current Wealthtick Architecture

### Frontend
Current app is chat-centric and already supports rich cards.

We can add:
- `portfolio dashboard cards`
- `portfolio tables`
- `allocation charts`
- `risk bars`
- `red flag cards`
- `announcement cards`
- `AI prompt chips`

This can live as:
- a dedicated portfolio page
- or a portfolio workspace launched from the current chat UI

### Backend
Recommended new backend modules:
- `portfolioService.js`
- `portfolioAnalyticsService.js`
- `portfolioRiskService.js`
- `portfolioNewsService.js`
- `portfolioPromptBuilder.js`

### Suggested API Endpoints
- `POST /api/portfolio/analyze`
- `POST /api/portfolio/summary`
- `POST /api/portfolio/scenario`
- `POST /api/portfolio/ask`
- `GET /api/portfolio/news`
- `GET /api/portfolio/announcements`

### Data Inputs
Minimum MVP input:
- symbol
- quantity
- average buy price
- asset type
- goal tag

Expanded input later:
- transaction history
- SIP history
- mutual fund folios
- broker import
- demat sync

## Suggested Analytics Engine

### Basic Metrics
- current value
- invested value
- total P&L
- daily P&L
- holding weights
- concentration ratios

### Advanced Metrics
- XIRR
- rolling returns
- benchmark alpha
- beta
- volatility
- max drawdown
- Sharpe ratio
- sector exposure
- style exposure
- valuation blend

### Explainability Output
Each analysis function should return:
- numeric value
- severity or status
- plain-language explanation
- suggested follow-up prompts

## Phased Build Plan

### Phase 1: Portfolio MVP
- manual holding entry
- overview cards
- holdings table
- allocation chart
- portfolio AI summary
- concentration and diversification warnings

### Phase 2: Intelligence Layer
- benchmark comparison
- risk metrics
- health score
- red flags
- portfolio news and announcements

### Phase 3: Advanced Wealthtick Differentiators
- goal alignment scoring
- scenario simulator
- "what changed" feed
- next best actions
- portfolio copilot memory

### Phase 4: Data Expansion
- transaction uploads
- broker sync
- mutual fund import
- periodic refresh

## Recommended MVP Scope Right Now
If we want the fastest path to something impressive, build this first:

1. Portfolio Overview
2. Holdings Table
3. Allocation by asset class / sector / market cap
4. Diversification and concentration score
5. AI portfolio summary
6. Red flag panel
7. News and announcements for held stocks

This will already feel stronger than a plain tracker because it combines dashboard + intelligence + explanation.

## Success Criteria
The module is successful if a user can answer these in under 30 seconds:
- What is my portfolio worth?
- What is driving my returns?
- Where am I too concentrated?
- Is my portfolio too risky?
- How does it compare with the benchmark?
- What changed recently?
- What should I review next?

## Final Product Statement
We should not build "another portfolio screen".

We should build:
`A portfolio intelligence system that helps users understand performance, risk, diversification, and portfolio health in simple language, with AI-guided insights layered on top of real portfolio analytics.`