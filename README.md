# AXIOM — Universal AI Search

AI-powered search engine built on Claude and the Anthropic web search tool. Streams synthesized answers across web, research, code, and quick-answer modes.

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Deployment (Vercel)

Set the `ANTHROPIC_API_KEY` environment variable in your Vercel project settings under **Settings → Environment Variables**.

## Stack

- Next.js 15 (App Router, Edge Runtime)
- Anthropic Claude Sonnet 4 with `web_search_20250305`
- TypeScript, zero external UI dependencies
