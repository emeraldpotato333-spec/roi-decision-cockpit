# ROI Decision Cockpit

A polished, local-first Next.js app for choosing the highest-return founder work block. It helps a fast-moving operator rank growth lanes, make hard tradeoffs, and leave each session with one concrete execution block.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For production verification:

```bash
npm run typecheck
npm run lint
npm run build
```

## Tech Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react icons
- `localStorage` persistence

No auth, databases, external services, or integrations are used.

## Scoring Logic

Each lane is scored from 1 to 5 across four factors:

- Revenue upside: 35%
- Urgency: 25%
- Confidence: 20%
- Speed to feedback: 20%

The weighted score is:

```text
(revenue * 0.35) + (urgency * 0.25) + (confidence * 0.20) + (speed * 0.20)
```

Score bands:

- Elite: 4.40+
- Strong: 3.80-4.39
- Okay: 3.10-3.79
- Weak: below 3.10

The ranked board automatically sorts by weighted score. The execution block is suggested from the top-ranked lane tagged `Do Tomorrow`.

## Editing Starter Lanes

Default categories live in:

```text
lib/defaults.ts
```

Edit `getDefaultItems()` to change starter lanes, scores, evidence, statuses, or next actions. Edit `starterFor()` to change the suggested execution block copy for each lane. Edit `laneMeta` to change icons, accent colors, and lane guidance.

## Vercel Deployment

1. Push the `roi-decision-cockpit` folder to a GitHub repo, or import the parent repo and set the Vercel root directory to `roi-decision-cockpit`.
2. Use the default Next.js framework preset.
3. Build command: `npm run build`
4. Install command: `npm install`
5. Output directory: leave default.

No environment variables are required.

## Product Decisions

- The ranked board and focused editor are split so the app feels like a cockpit, not a spreadsheet.
- The top recommendation is always visible as a dedicated card.
- Status tags are fast buttons because the most important workflow is deciding what not to touch.
- A gentle scoring warning appears when too many lanes are ranked high.
- Clear Data creates an empty cockpit; Defaults restores the starter templates.
