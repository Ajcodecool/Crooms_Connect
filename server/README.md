# 🏛️ Socrates — Crooms Connect Bot

Powered by Hugging Face Inference API + Mistral-7B.

## First Time Setup

### 1. Supabase — run once in SQL Editor

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;
```

### 2. Place this folder

Drop the entire server/ folder in your repo root (next to src/ and public/)

### 3. Set up .env

```bash
cp .env.example .env
```

Fill in all 3 values:

- HF_TOKEN → huggingface.co/settings/tokens (Fine-grained, "Make calls to
  Inference Providers")
- SUPABASE_URL → Supabase → Project Settings → API → Project URL
- SUPABASE_SERVICE_KEY → same page, service_role key (NOT the anon key)

### 4. Add to your root .gitignore

```
server/.env
server/node_modules/
server/dist/
```

### 5. Install and run

```bash
npm install
npm run dev
```

You should see: 🏛️ Socrates is watching Crooms Connect...

---

## Switching Models

Change HF_MODEL at the top of index.ts:

| Model                              | Notes                  |
| ---------------------------------- | ---------------------- |
| mistralai/Mistral-7B-Instruct-v0.3 | Default, great balance |
| meta-llama/Llama-3.1-8B-Instruct   | Very capable           |
| HuggingFaceH4/zephyr-7b-beta       | Fast and sharp         |
| microsoft/Phi-3-mini-4k-instruct   | Lightweight option     |

## Personality

Edit socrates.ts only.

## Tuning (top of index.ts)

- HF_MODEL which Hugging Face model to use
- BOT_USERNAME display name in chat
- MENTION_TRIGGER keyword that fires the bot (@socrates)
- AUTO_FIRE_CHANCE 0-1 chance of unprompted reply (0.12 = 12%)
- AUTO_FIRE_COOLDOWN ms between auto-fires (90000 = 90 seconds)
