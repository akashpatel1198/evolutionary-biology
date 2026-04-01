# Evolutionary Biology Simulations

Interactive simulations that teach evolutionary biology concepts through hands-on visualizations. Inspired by the [Primer](https://www.youtube.com/c/PrimerLearning) YouTube channel.

Each chapter builds on the last, starting from basic birth/death equilibrium and working up to full agent-based natural selection with heritable traits, energy costs, and predation.

## Tech Stack

- Next.js 16 (App Router)
- React 19, TypeScript 5
- Tailwind CSS 4
- Recharts (population/trait charts)
- React Flow (mutation tree diagrams)
- HTML5 Canvas (creature rendering)

## Live Version

> **[https://evolutionary-biology.vercel.app/](https://evolutionary-biology.vercel.app/)

The home page shows a grid of 9 chapter cards. Click any active chapter to open its simulation. Each page has interactive sliders to tweak parameters (birth rate, death rate, mutation rate, etc.) and real-time charts showing population dynamics. Pages 1-5 are complete, pages 6-9 are coming soon.

## Local Development

### Prerequisites

- Node.js (v18+)
- npm

### Setup

```bash
git clone https://github.com/akashpatel1198/evolutionary-biology.git
cd evolutionary-biology
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

### Environment Variables

None. Everything runs client-side with no external APIs or services.

## Project Structure

```
app/
  layout.tsx              # Root layout (fonts, metadata)
  page.tsx                # Home page (chapter grid)
  globals.css             # Global styles + Tailwind
  components/
    Sidebar.tsx           # Nav sidebar (desktop fixed, mobile hamburger)
  (pages)/
    layout.tsx            # Shared layout for all chapter pages
    1/page.tsx            # Equilibrium (N* = B/D)
    2/page.tsx            # Exponential growth (replication)
    3/page.tsx            # Mutations (heritable traits, mutation trees)
    4/page.tsx            # Carrying capacity (logistic growth)
    5/page.tsx            # Natural selection (2D agent-based sim, sandbox mode)
    6-9/page.tsx          # Placeholder stubs (coming soon)
public/                   # Static assets (SVGs)
```

## Chapter Overview

| # | Title | Concept | Status |
|---|-------|---------|--------|
| 1 | Why Do Things Exist? | Birth/death equilibrium | Done |
| 2 | Exponential Growth | Replication dynamics | Done |
| 3 | Mutations | Heritable trait variation, mutation trees | Done |
| 4 | Carrying Capacity | Density-dependent death, logistic growth | Done |
| 5 | Natural Selection | Agent-based 2D foraging with speed/size/sense traits | Done |
| 6 | Selfish Genes | | Planned |
| 7 | Hawk-Dove Game | | Planned |
| 8 | Green Beard | | Planned |
| 9 | Kin Selection | | Planned |

Page 5 is the most involved. Creatures have three heritable traits (speed, size, sense radius), each with energy costs. They forage for food on a 2D canvas, reproduce if they eat enough, and die if they don't. It includes a sandbox mode with full parameter control.

## Deployment

Built for Vercel. Push to main and it deploys automatically if connected, or run:

```bash
npx vercel
```
