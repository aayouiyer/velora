# Velora

**An AI coach that stress-tests startup ideas instead of hyping them.** Built at DevHacks S3 (ASU DevLabs, March 2026).

Most AI assistants tell you your idea is great and hand you a five-step plan. Velora does the opposite. It asks one sharp question at a time until your thinking holds up.

- **Debate mode:** a skeptical investor who attacks the weakest point in every answer.
- **Mentor mode:** honest, direct coaching that asks clarifying questions before judging.
- **Idea status:** scores the conversation across six dimensions (problem clarity, customer, solution fit, revenue thinking, market awareness, execution readiness) with takeaways and a verdict.

## Architecture

```
Browser (index.html, velora-chat.html)
   │  POST /api/chat  { mode, messages }
   ▼
server.js (Node, no dependencies)
   │  adds system prompt + API key, validates, rate-limits
   ▼
OpenRouter → Claude
```

## Security design

The hackathon version called the LLM API straight from the browser, which meant the API key sat in the page source where anyone could copy it. This version moves all of that server-side:

- **No secrets in the client.** The API key is read from an environment variable and never sent to the browser.
- **Locked-down proxy.** The server only accepts Velora's three modes. System prompts and the model are chosen server-side, so a client can't repurpose the key as a free general-purpose chatbot by sending its own system prompt or model.
- **Input validation.** Roles are allow-listed, and there are limits on message length, conversation length and request body size (64 KB).
- **Abuse limits.** Per-IP rate limiting (default 20 requests/min) and a daily request cap protect API credits.
- **Same-origin only.** Cross-origin requests to the API are rejected.
- **Prompt-injection hardening.** Prompts tell the model to stay on task, and the scoring prompt treats the conversation as data.
- **Safe rendering.** Model output is inserted as text, never HTML, and scores are clamped and allow-listed before rendering.
- **Browser hardening.** Strict CSP (`script-src 'self'`, no inline scripts), `X-Frame-Options: DENY`, `nosniff`, `no-referrer`. Only the public pages are served, so `server.js` and `.env` can't be downloaded.

## Run it

Requires Node.js 22.9+.

```bash
cp .env.example .env     # add your OpenRouter API key
npm start
```

Open http://127.0.0.1:3000.

## Tests

```bash
npm test
```

The tests mock OpenRouter and cover static file serving, path traversal, prompt and model injection, payload validation, body size limits, cross-origin blocking and rate limiting.

## Files

| File | Purpose |
|---|---|
| `index.html`, `index.js` | Landing page |
| `velora-chat.html`, `velora-chat.js` | Chat app |
| `server.js` | Static server and API proxy |
| `server.test.js` | Proxy tests |
