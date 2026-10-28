# Anga's Quest 🛡️🤖

A game-style website that teaches a class-3 child about **AI** and **staying safe online**.
Plain HTML/CSS/JS. No build step, no dependencies, no server.

## What's inside
- Simple login (name + 4-digit PIN). First time = creates the profile.
- 9 levels in 2 worlds: **Robo Land** (AI) and **Shield City** (cyber safety), ending with a boss level.
- Stars (1-3 per level), XP, titles, badges, daily streak, confetti, sound effects.
- "Read to me" button on every story line (browser voice).
- Printable certificate after the boss level.
- Original cartoon cast: Bolt, Pip, Zara, Hoot and Glitch.

## Run locally
Open `index.html` in a browser, or run `npx serve .`

## Put it on GitHub and Vercel
1. Create a new GitHub repository and upload these files (`index.html`, `styles.css`, `app.js`, `README.md`).
2. Go to vercel.com, click **Add New → Project**, and import the repository.
3. Framework preset: **Other**. Leave Build Command and Output Directory empty. Click **Deploy**.
4. Every time you push to GitHub, Vercel updates the site automatically.

## Good to know
- Progress is saved **in the browser** (localStorage), so each device keeps its own progress.
  If you want progress shared across devices, the next step is adding a small database (e.g. Supabase or Vercel KV).
- The PIN is a "kid lock" to keep siblings out, not real security. Do not reuse any real password.

## Add or change levels
Everything lives in the `LEVELS` array in `app.js`. A level has a character, story lines and stages.
Stage types: `quiz`, `sort` (two boxes), `password`.
Copy an existing level and edit the text.
