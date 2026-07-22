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

## Running via Docker Compose

Postgres, the NestJS backend, and the Next.js frontend run in Docker Compose. Ollama stays native on the host (ADR-003) — start it before bringing up the stack. The Capture Bot also stays native and is started separately, per the instructions above.

```bash
cp .env.example .env          # fill in Postgres credentials, ports, VAULT_HOST_PATH
cp backend/.env.example backend/.env   # fill in the rest (Google OAuth, Telegram, GitHub)
docker compose up --build
```

// Testing github sync