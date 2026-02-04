# Switch Instagram metrics extraction to OpenRouter

The Cloud Function now uses **OpenRouter** instead of direct OpenAI. Follow these steps to finish the switch.

---

## Step 1: Get your OpenRouter API key

1. Go to [OpenRouter](https://openrouter.ai/) and sign in.
2. Open **Keys**: https://openrouter.ai/keys (or Account → API Keys).
3. Create a key (or copy an existing one). You’ll use this in Step 2.

---

## Step 2: Put the key in `.env.local`

In your project root, in `.env.local`, add (use your real key):

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
```

Save the file. (`.env.local` is gitignored.)

---

## Step 3: Set the Firebase secret from `.env.local`

In a terminal, from the project folder:

```bash
cd /Users/joshua/smmluxurylistings
grep '^OPENROUTER_API_KEY=' .env.local | sed 's/^OPENROUTER_API_KEY=//' | tr -d '\r"' | npx firebase-tools functions:secrets:set OPENROUTER_API_KEY --data-file=- --project luxury-listings-portal-e56de
```

When it succeeds, you’ll see something like:  
`✔  Created a new secret version ... OPENROUTER_API_KEY/versions/x`

---

## Step 4: Deploy the function

```bash
npx firebase-tools deploy --only functions:extractInstagramMetricsAI --project luxury-listings-portal-e56de
```

Wait until you see `✔  Deploy complete!`

---

## Step 5: Test

1. Open your app and go to **Instagram Reports**.
2. Upload one or more Insights screenshots and run “Extract with AI”.
3. If it works, extraction is now going through OpenRouter (same model: `openai/gpt-4o-mini`, billed via your OpenRouter subscription).

---

## Summary of what changed in code

- **Function** `extractInstagramMetricsAI` in `functions/index.js`:
  - Uses secret `OPENROUTER_API_KEY` instead of `OPENAI_API_KEY`.
  - Calls `https://openrouter.ai/api/v1/chat/completions` with model `openai/gpt-4o-mini`.
  - Request body is the same (messages + images); only the URL and key changed.

You can leave `REACT_APP_OPENAI_API_KEY` in `.env.local` for other features (e.g. column mapping); Instagram extraction no longer uses it.
