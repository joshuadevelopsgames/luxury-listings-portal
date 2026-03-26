# Claude Instructions — SMM Luxury Listings Portal

## 🧠 Obsidian Brain — Read This First

At the start of every session, before doing any work, read the following notes from the Obsidian vault using the `obsidian_read_note` MCP tool:

1. `Brain/01 - Project Overview.md` — tech stack, file map, repo, env vars
2. `Brain/02 - Patterns & Gotchas.md` — known bugs, rules, conventions to follow
3. `Brain/03 - Session Log.md` — what was built recently for continuity

Confirm in one sentence that you're up to speed, then ask what to work on.

## 🔚 End of Session — Write Back

After completing significant work (new features, bug fixes, decisions), append a dated entry to `Brain/03 - Session Log.md` using `obsidian_update_note` with `operation: "append"`. Format:

```
## YYYY-MM-DD
**Built/Fixed:** [brief list]
```

Also update `Brain/02 - Patterns & Gotchas.md` if you hit a new bug or learned a new rule.

## Key Rules (internalized from the brain)

- **Supabase columns are snake_case** — always map camelCase JS keys before any `.update()` or `.insert()`
- **AI extraction prompts must say "ONLY if explicitly shown"** — no hallucinating metrics
- **Modals inside modals need `createPortal(document.body)`** — z-index won't save you otherwise
- **Placeholder values use "—"** — never example numbers like `764`
- **Git: NO rebasing ever** — use `git stash && git pull origin main && git stash pop && git push`; take higher build number on `version.json` merge conflicts
- **AI summary is 500 chars max, first-person social media manager voice**

## Project Location
- Repo: `https://github.com/joshuadevelopsgames/luxury-listings-portal`
- Local: `/Users/joshua/smmluxurylistings`
- Obsidian brain: `Brain/` folder in the connected Obsidian vault
