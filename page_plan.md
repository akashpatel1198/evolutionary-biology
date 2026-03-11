# Primer YouTube Channel: Video-by-Video Breakdown

Complete simulation models for each evolutionary biology concept covered by the channel.

---

## Video 1: Why Do Things Exist?
**Setting the stage for evolution**

### Thesis
Before modeling evolution, we need to answer: why does *anything* persist? Something exists if it was created and hasn't been destroyed. This video establishes the mathematical foundation for population dynamics.

### Model: Existence Equilibrium

**Entities have:**
- `B` — birth rate (probability of spontaneous creation per tick)
- `D` — death rate (probability of destruction per tick per entity)

**Update rule (per tick):**
```
if random() < B:
    population += 1

for each entity:
    if random() < D:
        population -= 1
```

**Equilibrium prediction:**
```
N_equilibrium = B / D
```

At equilibrium, births equal deaths: `B = N × D`, solving for `N = B/D`.

**Key insight:** Even without reproduction, populations stabilize around a predictable equilibrium determined solely by creation and destruction rates.

---

## Video 2: How Life Grows Exponentially

### Thesis
Real organisms don't appear from nothing — they reproduce. Adding replication fundamentally changes population dynamics from stable equilibrium to exponential growth.

### Model: Replicators

**Entities now have:**
- `B` — birth rate (spontaneous)
- `D` — death rate
- `R` — replication rate (probability of reproducing per tick per entity)

**Update rule:**
```
if random() < B:
    population += 1

for each entity:
    if random() < R:
        population += 1  // reproduction
    if random() < D:
        population -= 1
```

**Equilibrium prediction:**
```
N_equilibrium = B / (D - R)
```

When `R ≥ D`, no equilibrium exists — population grows exponentially (or oscillates if bounded).

**Key insight:** Replication breaks the simple equilibrium. When replication rate exceeds death rate, populations explode.

---

## Video 3: Mutations and the First Replicators

### Thesis
Imperfect replication creates variation. Mutations introduce heritable differences, setting the stage for selection.

### Model: Replication with Mutation

**Entities now have a trait value:**
```typescript
interface Entity {
  trait: number;  // e.g., replication efficiency
}
```

**Reproduction with mutation:**
```typescript
function reproduce(parent: Entity): Entity {
  return {
    trait: parent.trait + gaussianRandom(0, MUTATION_RATE)
  };
}
```

**Key parameters:**
- `MUTATION_RATE` — standard deviation of Gaussian noise added to traits

**Key insight:** Mutations create a distribution of trait values in the population. Some variants are better, some worse — but without selection pressure, all variants drift randomly.

---

## Video 4: Simulating Competition and Logistic Growth

### Thesis
Resources are finite. When populations exceed carrying capacity, competition limits growth. This produces the S-curve (logistic growth) seen in real populations.

### Model: Logistic Growth / Carrying Capacity

**Environment has:**
- `K` — carrying capacity (max sustainable population)

**Death rate becomes density-dependent:**
```typescript
function deathProbability(population: number, K: number): number {
  // Death rate increases as population approaches K
  return BASE_DEATH_RATE * (population / K);
}
```

**Alternatively, competition for discrete resources:**
```typescript
const FOOD_COUNT = 100;  // carrying capacity proxy

// Each day:
// - Spawn FOOD_COUNT food items
// - Creatures compete to eat food
// - Creatures with insufficient food die
```

**Logistic growth equation (continuous form):**
```
dN/dt = r × N × (1 - N/K)
```

Where:
- `N` = population
- `r` = intrinsic growth rate
- `K` = carrying capacity

**Key insight:** Competition for limited resources creates an upper bound on population. Growth rate slows as population approaches carrying capacity.

---

## Video 5: Simulating Natural Selection
**The flagship video**

### Thesis
When heritable traits affect survival and reproduction, natural selection emerges. Traits that improve foraging success spread through the population.

### Model: Agent-Based Natural Selection

**Creature state:**
```typescript
interface Creature {
  id: string;
  position: { x: number; y: number };
  
  // Heritable traits
  size: number;
  speed: number;
  sense: number;  // food detection radius
  
  // Runtime state
  energy: number;
  foodEaten: number;
  alive: boolean;
}
```

**Energy cost function (THE KEY EQUATION):**
```typescript
function energyCost(c: Creature, dt: number): number {
  return (Math.pow(c.size, 3) * Math.pow(c.speed, 2) + c.sense) * dt;
}
```

- Size: **cubic** cost (large creatures are expensive)
- Speed: **quadratic** cost (fast creatures burn energy)
- Sense: **linear** cost (detection radius is cheap)

**Day cycle:**
```typescript
function simulateDay(world: World): Creature[] {
  // 1. Reset
  spawnFood(world, FOOD_COUNT);
  world.creatures.forEach(c => {
    c.energy = 100;
    c.foodEaten = 0;
    c.position = randomEdgePosition(world);
  });
  
  // 2. Forage (many ticks)
  for (let tick = 0; tick < DAY_LENGTH; tick++) {
    for (const creature of world.creatures) {
      if (!creature.alive) continue;
      
      // Drain energy
      creature.energy -= energyCost(creature, 1);
      if (creature.energy <= 0) {
        creature.alive = false;
        continue;
      }
      
      // Sense and pursue food
      const food = findFoodInRadius(creature, world.food, creature.sense);
      if (food.length > 0) {
        moveToward(creature, food[0], creature.speed);
        if (distance(creature, food[0]) < EAT_RADIUS) {
          creature.foodEaten++;
          removeFood(world, food[0]);
        }
      } else {
        randomWalk(creature, creature.speed);
      }
      
      // Predation: big creatures eat small creatures
      if (creature.size > PREDATION_THRESHOLD) {
        const prey = findSmallCreatures(creature, world.creatures);
        // ... eat them
      }
    }
  }
  
  // 3. Selection & Reproduction
  const nextGen: Creature[] = [];
  for (const c of world.creatures) {
    if (c.foodEaten >= 1) {
      nextGen.push(c);  // survives
    }
    if (c.foodEaten >= 2) {
      nextGen.push(reproduce(c));  // reproduces
    }
  }
  return nextGen;
}
```

**Reproduction with mutation:**
```typescript
function reproduce(parent: Creature): Creature {
  const σ = 0.1;  // mutation magnitude
  return {
    ...parent,
    id: newId(),
    size: parent.size + gaussian(0, σ),
    speed: parent.speed + gaussian(0, σ),
    sense: parent.sense + gaussian(0, σ),
    energy: 100,
    foodEaten: 0,
  };
}
```

**Key parameters:**
| Parameter | Typical Value | Effect |
|-----------|---------------|--------|
| `FOOD_COUNT` | 50-200 | Carrying capacity |
| `DAY_LENGTH` | 100-500 ticks | Foraging time |
| `MUTATION_RATE` | 0.05-0.2 | Trait variance |
| `SURVIVAL_THRESHOLD` | 1 food | Selection pressure |
| `REPRODUCTION_THRESHOLD` | 2 food | Selection pressure |

**Key insight:** Fitness is *implicit* — it emerges from the interaction between traits, environment, and the energy cost function. No explicit "fitness score" is calculated.

---

## Video 6: Your Genes Are Selfish

### Thesis
Genes don't care about organisms — they "care" about copies of themselves. Selection operates at the gene level, not the individual level.

### Model: Gene-Centric View

This is conceptual reframing rather than a new simulation model. The key insight is that in Video 5's model, you can track *allele frequencies* instead of individual creatures.

**Track allele frequencies:**
```typescript
interface GenePool {
  // For each trait locus, track the distribution of allele values
  sizeAlleles: number[];    // all size values in population
  speedAlleles: number[];
  senseAlleles: number[];
}

function getAlleleFrequencies(creatures: Creature[]): GenePool {
  return {
    sizeAlleles: creatures.map(c => c.size),
    speedAlleles: creatures.map(c => c.speed),
    senseAlleles: creatures.map(c => c.sense),
  };
}
```

**Key insight:** The "unit of selection" is the gene. Organisms are vehicles; genes are replicators. This framing explains behaviors that harm the individual but help copies of the gene elsewhere.

---

## Video 7: Simulating the Evolution of Aggression
**Hawk-Dove Game Theory**

### Thesis
Aggression is costly but sometimes pays off. Game theory predicts a stable equilibrium where aggressive and passive strategies coexist.

### Model: Hawk-Dove ESS

**Creature state (discrete strategy):**
```typescript
type Strategy = 'hawk' | 'dove';

interface Creature {
  strategy: Strategy;
  fitness: number;
}
```

**Game parameters:**
- `V` — value of contested resource
- `C` — cost of fighting (injury)

**Payoff matrix:**
```
                 Opponent
              Dove      Hawk
Actor Dove    V/2       0
      Hawk    V         (V-C)/2
```

When two creatures meet at a resource:
```typescript
function contest(a: Creature, b: Creature, V: number, C: number): void {
  if (a.strategy === 'dove' && b.strategy === 'dove') {
    a.fitness += V / 2;
    b.fitness += V / 2;
  } else if (a.strategy === 'hawk' && b.strategy === 'dove') {
    a.fitness += V;
    b.fitness += 0;
  } else if (a.strategy === 'dove' && b.strategy === 'hawk') {
    a.fitness += 0;
    b.fitness += V;
  } else {  // hawk vs hawk
    a.fitness += (V - C) / 2;
    b.fitness += (V - C) / 2;
  }
}
```

**Evolutionary Stable Strategy (ESS):**
```
When C > V:
  hawk_frequency_at_equilibrium = V / C
  
When C ≤ V:
  All hawks (dove strategy goes extinct)
```

**Simulation loop:**
```typescript
function simulateGeneration(pop: Creature[], V: number, C: number): Creature[] {
  // Reset fitness
  pop.forEach(c => c.fitness = 0);
  
  // Random pairwise contests
  shuffle(pop);
  for (let i = 0; i < pop.length - 1; i += 2) {
    contest(pop[i], pop[i + 1], V, C);
  }
  
  // Reproduce proportional to fitness
  return selectAndReproduce(pop);
}
```

**Key insight:** Neither pure hawk nor pure dove is stable when fighting is costly. The population self-organizes to the ESS ratio `V/C`.

---

## Video 8: Simulating Green Beard Altruism

### Thesis
Altruism can evolve if altruists can *recognize each other*. The "green beard" is a visible marker linked to the altruism gene itself.

### Model: Green Beard Recognition

**Creature state:**
```typescript
interface Creature {
  hasGreenBeard: boolean;  // visible marker
  isAltruistic: boolean;   // behavioral gene
  // In pure green beard, these are perfectly correlated
  fitness: number;
}
```

**Green beard altruism:**
```typescript
function interact(actor: Creature, recipient: Creature): void {
  if (actor.isAltruistic && recipient.hasGreenBeard) {
    // Help other green beards at personal cost
    actor.fitness -= COST;
    recipient.fitness += BENEFIT;
  }
}
```

**Condition for spread:**
```
Green beard spreads when:
  (frequency of green beard) × BENEFIT > COST
```

**Key insight:** Green beard altruism is unstable in the long run — "cheater" mutations (green beard without altruism) can exploit the system.

---

## Video 9: Simulating the Evolution of Sacrificing for Family
**Hamilton's Rule**

### Thesis
Altruism toward relatives makes genetic sense. Hamilton's Rule quantifies when self-sacrifice pays off in terms of gene propagation.

### Model: Kin Selection / Hamilton's Rule

**Hamilton's Rule:**
```
Altruism is favored when:
  r × B > C

Where:
  r = coefficient of relatedness
  B = benefit to recipient (in reproductive units)
  C = cost to actor (in reproductive units)
```

**Relatedness coefficients:**
| Relationship | r |
|--------------|---|
| Clone / identical twin | 1.0 |
| Parent-offspring | 0.5 |
| Full siblings | 0.5 |
| Half siblings | 0.25 |
| Cousins | 0.125 |
| Unrelated | 0 |

**Simulation structure:**
```typescript
interface Creature {
  id: string;
  altruismAllele: boolean;  // does it sacrifice for kin?
  alive: boolean;
  parentId: string | null;  // for tracking relatedness
}

function calculateRelatedness(a: Creature, b: Creature, pedigree: Map): number {
  // Trace shared ancestry
  // Return proportion of genome shared by descent
}

function predatorAttack(group: Creature[]): void {
  // One creature can sacrifice itself to save others
  const altruist = group.find(c => c.altruismAllele);
  
  if (altruist) {
    // Altruist dies (C = 1 life)
    altruist.alive = false;
    
    // Siblings survive (B = N siblings saved)
    const siblings = group.filter(c => 
      c !== altruist && calculateRelatedness(altruist, c) >= 0.5
    );
    // siblings.forEach(s => s.alive = true); // they survive
  } else {
    // Random death
    const victim = randomChoice(group);
    victim.alive = false;
  }
}
```

**Key parameters:**
- `B` — number of relatives saved by sacrifice
- `C` — cost to altruist (usually 1 life = 1.0)
- `r` — relatedness to beneficiaries

**Haldane's quip:**
> "I would lay down my life for two brothers or eight cousins."
>
> 2 × 0.5 = 1.0 ≥ 1.0 ✓
> 8 × 0.125 = 1.0 ≥ 1.0 ✓

**Key insight:** Genes for self-sacrifice spread if the sacrificed life "saves" enough copies of itself in relatives. Altruism isn't selfless — it's selfish at the gene level.

---

## Summary: Simulation Complexity by Video

| Video | Model Type | State Complexity | Key Equation |
|-------|-----------|------------------|--------------|
| 1. Existence | Population counter | 1 integer | N = B/D |
| 2. Exponential | Population counter | 1 integer | N = B/(D-R) |
| 3. Mutations | Population + trait | N floats | trait += gaussian() |
| 4. Logistic | Population + resources | N + K | dN/dt = rN(1-N/K) |
| 5. Natural Selection | Full agent-based | Position, 3 traits, energy | cost = size³×speed² + sense |
| 6. Selfish Genes | (Conceptual reframe) | Track allele frequencies | — |
| 7. Hawk-Dove | Strategy + fitness | N strategies | ESS = V/C |
| 8. Green Beard | Recognition + altruism | Marker + behavior | freq × B > C |
| 9. Hamilton's Rule | Pedigree + altruism | Family tree | r × B > C |

---

## Recommended Implementation Order

1. **Start with Video 1-2** — trivial to implement, establishes the tick-based simulation pattern
2. **Add Video 4** — introduces resource competition and carrying capacity
3. **Build Video 5** — the main event; agent-based natural selection with spatial foraging
4. **Implement Video 7** — simpler than Video 5 (no spatial component), demonstrates game theory
5. **Add Video 8-9** — extends the model with relatedness tracking and kin interactions

Each video builds on the previous, adding one new mechanic at a time. This is the pedagogical genius of the channel — and the same layered approach should structure your playground.