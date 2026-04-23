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

## Local Data

The app stores one localStorage record under `roi-decision-cockpit-v1`.

- `activeDate`: the board currently open
- `dailyBoards`: board snapshots keyed by date, such as `2026-04-23`
- each daily board stores active lanes, completed items, the selected lane, execution block, and session note

Older saved data without daily boards is migrated into today's board automatically.

## Scoring Logic

Each lane is scored from 1 to 5 across four factors:

- Revenue upside: 35%
- Urgency: 25%
- Conviction: 20%
- Speed to feedback: 20%

The weighted score is:

```text
(revenue * 0.35) + (urgency * 0.25) + (conviction * 0.20) + (speed * 0.20)
```

Score bands:

- Elite: 4.40+
- Strong: 3.80-4.39
- Okay: 3.10-3.79
- Weak: below 3.10

The Today list shows lanes tagged `DO ASAP`; Later keeps paused, delegated, and held lanes visible without crowding the day. The execution block is suggested from the top-ranked `DO ASAP` lane.

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

- Today, Later, and Completed today keep the cockpit operational without turning it into a task manager.
- The top recommendation is always visible as a dedicated card.
- Status tags are fast buttons because the most important workflow is deciding what not to touch.
- A gentle scoring warning appears when too many lanes are ranked high.
- `Done` moves active lanes into Completed today.
- `Clear` is destructive and asks for confirmation.
- `Restore starters` replaces active lanes with starter templates while keeping Completed today.
- JSON backup/import is available from the header for local data safety.
- Daily boards provide Yesterday / Today / Tomorrow navigation without adding a full calendar system.
