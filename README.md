# Financial Companion AI

A polished full-stack financial education chatbot built for first-time investors in India. The app explains SIPs, mutual funds, taxation basics, risk profiles, emergency funds, and goal-based investing in simple language, while escalating personalised recommendation requests to a registered advisor.

## Highlights
- Conversational single-page interface with responsive desktop and mobile layouts
- Context sidebar with sample investor profile, goals, and quick topics
- AI-powered chat backed by Groq with a secure server-side API key setup
- Inline SIP projection calculator with live updates and Indian number formatting
- Suggested follow-up question chips under assistant replies
- Advisor escalation card for recommendation-style queries
- Friendly in-chat error handling and typing indicators
- Static frontend served by an Express backend

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express
- AI model: Groq `llama-3.3-70b-versatile`

## Project Structure
```text
Financial_Companion_App/
├── frontend/
│   └── index.html
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
├── package.json
└── README.md
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
- Integrated robust chat state management, conversation history capping, typing states, and inline error handling

## Resume Bullets
- Built a full-stack AI financial education assistant using vanilla JavaScript, Node.js, Express, and Groq, with secure server-side API integration and responsive single-page UX
- Designed and implemented interactive chat workflows including suggested follow-up prompts, advisor escalation flows, typing states, and inline validation for a consumer-style onboarding experience
- Developed a live SIP projection calculator with Indian number formatting, dynamic corpus breakdown, and visual returns versus invested allocation to support goal-based investing education

## Key Engineering Decisions
- Kept the frontend framework-free to reduce complexity and make the UI easy to deploy, review, and customize
- Moved all model access to the backend so the Groq API key never appears in client-side code
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
