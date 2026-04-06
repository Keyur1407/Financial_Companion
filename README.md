# Financial Companion AI

A polished full-stack financial education chatbot built for first-time investors in India. The app explains SIPs, mutual funds, taxation basics, risk profiles, emergency funds, and goal-based investing in simple language, while escalating personalised recommendation requests to a registered advisor.

## Highlights
- Conversational single-page interface with responsive desktop and mobile layouts
- Context sidebar with sample investor profile, goals, and quick topics
- AI-powered chat backed by Groq with a secure server-side API key setup
- Live NSE market snapshots for Nifty, Bank Nifty, and NSE-listed stock price queries
- Inline SIP projection calculator with live updates and Indian number formatting
- Suggested follow-up question chips under assistant replies
- Advisor escalation card for recommendation-style queries
- Friendly in-chat error handling and typing indicators
- Static frontend served by an Express backend

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- AI model: Groq `llama-3.3-70b-versatile`
- Market data: NSE public market endpoints

## Project Structure
```text
Financial_Companion_App/
+-- frontend/
�   +-- index.html
+-- backend/
�   +-- .env.example
�   +-- package.json
�   +-- server.js
+-- .gitignore
+-- package.json
+-- README.md
```

## Local Setup
1. Open a terminal in `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`
4. Add your Groq key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   ```
5. Start the server:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3001`

## Resume-Friendly Feature Summary
- Built a full-stack AI chatbot for financial education with secure server-side model integration
- Designed a responsive conversational UI with mobile drawer navigation, starter prompts, and follow-up suggestions
- Implemented an inline SIP calculator with real-time corpus, invested amount, and returns visualization
- Added advisor escalation flows and structured guardrails for safe finance-related interactions
- Integrated live market context for Nifty and stock-price questions using NSE data before AI response generation
- Integrated robust chat state management, conversation history capping, typing states, and inline error handling

## Portfolio Highlights
- Built a full-stack AI financial education assistant using vanilla JavaScript, Node.js, Express, and Groq, with secure server-side API integration and responsive single-page UX
- Designed and implemented interactive chat workflows including suggested follow-up prompts, advisor escalation flows, typing states, and inline validation for a consumer-style onboarding experience
- Developed a live SIP projection calculator with Indian number formatting, dynamic corpus breakdown, and visual returns versus invested allocation to support goal-based investing education
- Added server-side live market enrichment for Nifty and NSE stock queries so the assistant can answer with current price context instead of relying only on static model knowledge

## Live Demo
Render URL: https://financial-companion-qeto.onrender.com/

## Key Engineering Decisions
- Kept the frontend framework-free to reduce complexity and make the UI easy to deploy, review, and customize
- Moved all model access to the backend so the Groq API key never appears in client-side code
- Pulled live market snapshots on the backend so current-price answers stay grounded in fresh NSE data
- Capped conversation history before each request to control token usage and keep responses fast
- Used a keyword-triggered calculator flow so educational projections appear inline without breaking the chat experience
- Added deterministic escalation handling for recommendation-style queries to keep the product safer and more realistic for finance use cases

## Deployment
### Render
1. Push this repo to GitHub
2. Create a new `Web Service` on Render
3. Point the service root to `backend/` if Render asks for a root directory
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variable: `GROQ_API_KEY=your_groq_api_key_here`

### Railway
1. Push this repo to GitHub
2. Create a new Railway project from the GitHub repo
3. Set the service root to `backend/` if Railway asks
4. Add `GROQ_API_KEY` in project variables
5. Deploy and open the generated URL

### Generic Node Hosting
- Install backend dependencies
- Set `GROQ_API_KEY`
- Run `npm start` inside `backend/`
- Expose the backend port publicly
- The backend serves the frontend automatically

## Notes
- Keep `backend/.env` private and out of version control
- Commit `backend/.env.example`, not the real `.env`
- The backend serves the frontend, so this runs as one complete app





<!-- 
The high-token spikes are happening because some queries are sending a lot more context to the model than others.

Main reasons in your code:

The base system prompt is long in server.js (line 22). Every main answer call includes that whole prompt.
You send up to the last 20 chat messages in server.js (line 104) and server.js (line 833). Longer conversations push input tokens up fast.
For market/news/regulatory queries, you also inject retrieved context in retrievalService.js (line 172). That context includes title, publisher, category, authority, dates, URL, topics, and excerpt for each source, so it can become quite large.
Some routes add extra system messages on top of the main prompt in server.js (line 803).
After the main reply, you make a second model call just to generate suggested questions in server.js (line 193). That call includes the user question plus the full assistant reply, so longer answers create another expensive request.
That is also why your logs likely show pairs:

one larger request for the main answer
one smaller but still noticeable request for suggested questions
Best token optimizations, highest impact first:

Reduce chat history.
Change the history window from 20 messages to something like 6-10, or summarize older history instead of sending it raw every time.

Cut prompt size.
Your system prompt is doing a lot. Split it into a shorter base prompt plus small route-specific instructions only when needed.

Shrink retrieved context.
In retrievalService.js (line 172), send less metadata.
Keep only:

title
published date
short excerpt
Usually you do not need URL, authority, document number, full topic list, etc. in the model prompt.
Limit retrieved sources.
Send only top 2-3 sources, not more, and shorten excerpts further.

Optimize suggested questions.
This is a hidden second LLM call. You can:

generate suggestions only on the first turn or only for some routes
use fixed fallback suggestions more often
use a much smaller model for suggestion generation
reduce the suggestion prompt length
Lower output caps.
Main completion is set to max_tokens: 1024 in server.js (line 844). If your UI wants concise answers, reducing this to 300-500 can help control long outputs.
Suggested questions use 180 in server.js (line 206); that can also be reduced.

Avoid duplicate instructions.
Right now the main system prompt plus extra route messages can overlap. Consolidating them reduces wasted input tokens.

Add token-aware logging.
Log per request:

route
history length
retrieval source count
retrieval context length
whether suggested questions were generated
That will show exactly which feature is causing spikes.
Most likely biggest wins for you:

reduce history
shorten RAG context
stop making the extra suggestion-generation call on every turn
If you want, I can implement a clean token-optimization pass next without changing user-visible behavior much. -->




