# my-pensieve
A local-first AI personal operating system that helps me plan, learn, remember and take action.

The goal is not to create another chatbot.

The goal is to reduce the amount of thinking I repeat every day.

It helps me:

- plan
- study
- remember
- organize
- retrieve knowledge
- continue projects
- automate repetitive digital work

This project is built primarily for myself, with privacy, local AI, and long-term maintainability in mind.

## Running the Telegram Capture Bot

`capture-bot/` is a standalone Node/TypeScript process (not part of `backend/`, not containerized — see ADR-009). It must be started/restarted independently of `docker compose up` for the rest of the stack:

```bash
cd capture-bot
npm install
npm run build && npm start
# or, for development:
npm run dev
```

Copy `capture-bot/.env.example` to `capture-bot/.env` and fill in the required values before starting.

// Testing github sync