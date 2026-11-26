# Project GPT

A ChatGPT-style AI chat web app built with Next.js, TypeScript and the OpenAI Responses API.

## Features

- Streaming AI responses
- Multiple conversations
- Local browser chat history
- Dark and light themes
- Markdown and GitHub-flavoured Markdown rendering
- Copy assistant responses
- Responsive layout
- API key stays on the server

## Requirements

- Node.js 20.9+
- An OpenAI API key with API access

**Important:** API usage is billed separately from a ChatGPT subscription. Keep your API key private, never commit it to GitHub, and set a usage budget/limit in your API account.

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.

3. Put your API key in `.env.local`:

   ```env
   OPENAI_API_KEY=your_secret_key
   OPENAI_MODEL=gpt-5.5
   ```

   If that model is not enabled for your API account, set `OPENAI_MODEL` to a model you have access to.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000.

## Push to GitHub

Create an empty repository on GitHub, then run these commands in this folder:

```bash
git init
git add .
git commit -m "Initial Project GPT release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/project-gpt.git
git push -u origin main
```

Do not add `.env.local` or paste your API key into source code. `.gitignore` excludes environment files.

## Deploy

Deploy with a host that supports Next.js. Add `OPENAI_API_KEY` and `OPENAI_MODEL` as server-side environment variables in the hosting dashboard before deploying. Never expose the secret as a `NEXT_PUBLIC_` variable.

## Notes

This is a starter project, not a clone of ChatGPT's proprietary interface, models, or internal systems. Chat history is stored in the current browser only; there is no account or cloud sync yet.
