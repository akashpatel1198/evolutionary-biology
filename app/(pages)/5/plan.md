# Page 5: Natural Selection — Implementation Plan

The flagship page. A real agent-based 2D simulation with creatures foraging on a canvas, competing for food, and evolving traits over generations.

---

## Video Narrative Arc (4 Simulation Phases)

### Phase 1: The Environment (no mutations)
- Creatures on a 2D plane, food spawns each morning, creatures start at edges
- Rules: 0 food = die, 1 food = survive, 2 food = survive + replicate
- Population expands then stabilizes around carrying capacity (~95 creatures with 100 food)

### Phase 2: Speed mutations only
- Speed tradeoff: faster = reach food first, but 2x speed = 2x energy cost per distance
- Result: avg speed increases, population DECREASES (selfish gene preview)

### Phase 3: All three traits (speed + size + sense)
- **Size**: eat creatures 20% smaller, cost = size^3
- **Speed**: reach food first, cost = speed^2
- **Sense**: detection radius, cost = sense (linear, cheap)
- **Total energy cost per timestep = size^3 * speed^2 + sense**
- Speed settles differently than speed-only sim; sense stays spread out

### Phase 4: Environmental change (food 100 → 10)
- Gradual reduction (1 less food every 2 days)
- Size goes down, sense becomes super valuable, speed goes UP (surprising)

---

## Page Sections

### 1. Hero Section
- "Chapter 5" teal pill + YouTube link (placeholder)
- Title: "Natural Selection"
- Subtitle about implicit fitness from trait-environment interaction

### 2. RecapSection
- Brief recap from Chapter 4: carrying capacity, competition limits growth
- Setup: "What happens when creatures aren't all identical?"

### 3. EnvironmentRulesSection (static)
- Visual explanation of the day cycle and the 0/1/2 food rules
- Three outcome cards: die / survive / replicate

### 4. BaselineSimSection — "The Environment"
- Config: NO mutations, all creatures identical
- Canvas: creatures (all same color/size) foraging
- Chart: population over days
- Observation: carrying capacity emerges from the rules

### 5. SpeedMutationSection
- Config: speed mutations only
- Speed tradeoff explanation card (cost = speed^2)
- Canvas: creatures colored by speed (blue=slow → red=fast)
- Charts: avg speed over days + population over days (side by side)
- Histogram: speed distribution (recharts BarChart, like the video)
- Observation: speed increases, population decreases

### 6. EnergyCostModelSection (static)
- Full equation display: `size^3 × speed^2 + sense`
- Three trait sub-cards explaining cost/benefit for each

### 7. ThreeTraitsSimSection
- Config: all three traits mutating + predation
- Canvas: color=speed hue, radius=size, faint ring=sense
- Three line charts or one multi-line for avg speed/size/sense over days
- Three histograms for current distributions
- Population chart

### 8. EnvironmentalChangeSection
- Config: three traits + food gradually decreasing (100→10)
- Food supply chart (declining)
- Trait averages + population charts
- Observations about how environment changes everything

### 9. KeyInsightsSection
- Dark gradient card with the 7 takeaways from the video

### 10. FullSandboxSection (stretch goal)
- Full parameter control: food count, mutation rate, trait toggles, predation toggle, etc.

---

## Simulation Engine

### Core Types
```typescript
interface Creature {
  id: number;
  x: number; y: number;
  speed: number; size: number; sense: number;
  foodEaten: number; energy: number; alive: boolean;
  targetX: number | null; targetY: number | null;
}

interface Food {
  id: number; x: number; y: number; eaten: boolean;
}

interface DayStats {
  day: number; population: number;
  avgSpeed: number; avgSize: number; avgSense: number;
  foodAvailable: number;
}

interface SimConfig {
  fieldSize: number; foodCount: number; initialPopulation: number;
  ticksPerDay: number;
  mutateSpeed: boolean; mutateSize: boolean; mutateSense: boolean;
  mutationStdDev: number;
  initialSpeed: number; initialSize: number; initialSense: number;
  enablePredation: boolean; foodReductionRate: number;
}
```

### Key Equation
```
energyCostPerTick = COST_SCALE * (size^3 * speed^2 + sense)
```
Where `COST_SCALE ≈ 0.15` so default creatures (all traits = 1.0) use ~60% of energy per day.

### Day Cycle
1. Spawn food randomly on field
2. Place creatures at random edge positions, reset energy to 100
3. Run `ticksPerDay` ticks:
   - Drain energy by cost function
   - If energy <= 0, die
   - Sense food/threats within radius
   - Move toward food, away from threats, or random walk
   - Eat food on contact (foodEaten++)
   - Predation: big creatures eat small creatures (size >= 1.2x)
4. End of day selection:
   - 0 food eaten → die
   - 1 food eaten → survive
   - 2+ food eaten → survive + reproduce (with mutations per config)

### Shared Hook: `useForagingSimulation(config)`
Returns: creatures, foods, day, tickInDay, history, isRunning, setIsRunning, reset, currentStats

### Canvas Renderer
- Light background, grid lines
- Food: small green circles
- Creatures: colored circles sized by `size` trait, color mapped to speed
- Optional sense radius ring

---

## Energy Calibration

| Trait values | Cost/tick | Total (200 ticks) | Survives? |
|---|---|---|---|
| speed=1, size=1, sense=1 | 0.30 | 60 | Yes (40 energy left) |
| speed=2, size=1, sense=1 | 0.75 | 150 | Only if eats fast |
| speed=1, size=2, sense=1 | 1.35 | 270 | Dies without eating |
| speed=1, size=1, sense=2 | 0.45 | 90 | Yes (tight) |

This creates meaningful selection pressure — mutations too far in size/speed are lethal.

---

## Implementation Order

1. Types, constants, helpers (math, distance, gaussian)
2. `useForagingSimulation` hook + `renderCanvas`
3. Hero + Recap + EnvironmentRules (static)
4. BaselineSimSection (first canvas sim, validate engine)
5. SpeedMutationSection (add histogram)
6. EnergyCostModelSection (static)
7. ThreeTraitsSimSection (full traits + predation)
8. EnvironmentalChangeSection (declining food)
9. KeyInsightsSection (static)
10. Sandbox (stretch)

### Performance Notes
- 30fps (33ms intervals), speed multiplier option (2-5 ticks per frame)
- Hard cap 200 creatures
- 300 max history points
- useRef for mutable arrays, useState only for displayed values
- Independent state per section (no shared simulation state)
