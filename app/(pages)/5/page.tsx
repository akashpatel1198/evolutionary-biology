"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

type CreatureState = "foraging" | "homebound" | "fleeing" | "home";

interface Creature {
  id: number;
  x: number;
  y: number;
  heading: number; // current heading in radians
  headingTarget: number; // desired heading
  turnRate: number; // current turn rate
  speed: number;
  size: number;
  sense: number;
  foodEaten: number;
  energy: number;
  alive: boolean;
  state: CreatureState;
}

interface Food {
  id: number;
  x: number;
  y: number;
  eaten: boolean;
}

interface DayStats {
  day: number;
  population: number;
  avgSpeed: number;
  avgSize: number;
  avgSense: number;
  deaths: number;
  births: number;
}

interface SimConfig {
  fieldSize: number;
  foodCount: number;
  initialPopulation: number;
  mutateSpeed: boolean;
  mutateSize: boolean;
  mutateSense: boolean;
  initialSpeed: number;
  initialSize: number;
  initialSense: number;
  enablePredation: boolean;
  mutationChance?: number; // override global MUTATION_CHANCE
  mutationVariation?: number; // override global MUTATION_VARIATION
}

// ============================================================================
// CONSTANTS (matching source simulation model)
// ============================================================================

const CANVAS_SIZE = 400;
const FIELD_SIZE = 150; // match source: 150x150 arena
const FOOD_RADIUS = 3;
const CREATURE_BASE_RADIUS = 5;
const EAT_DISTANCE = 10; // world units to eat food or prey
const BASE_SENSE_DISTANCE = 25; // detection = EAT_DISTANCE + BASE_SENSE_DISTANCE * sense
const PREDATION_SIZE_RATIO = 1.2; // must be 1.2x bigger to eat
const MAX_CREATURES = 200;
const MAX_HISTORY = 300;
const STARTING_ENERGY = 800;
const TURN_ACCELERATION = 0.005;
const MAX_TURN_SPEED = 0.07; // rad per step
const HOMEBOUND_RATIO = 2; // head home when distance_left < edge_dist * this
const MUTATION_CHANCE = 0.05; // 5% chance per trait
const MUTATION_VARIATION = 0.1; // exactly +/- 0.1
const WALL_MARGIN = 2; // how close to wall = "home"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeAngle(a: number): number {
  // Normalize to [-PI, PI]
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function energyCost(creature: Creature): number {
  return (
    Math.pow(creature.size, 3) * Math.pow(creature.speed, 2) + creature.sense
  );
}

function senseRadius(creature: Creature): number {
  return EAT_DISTANCE + BASE_SENSE_DISTANCE * creature.sense;
}

function distanceToNearestWall(x: number, y: number, fieldSize: number): number {
  return Math.min(x, y, fieldSize - x, fieldSize - y);
}

function nearestWallPoint(
  x: number,
  y: number,
  fieldSize: number
): { wx: number; wy: number } {
  const dLeft = x;
  const dRight = fieldSize - x;
  const dTop = y;
  const dBottom = fieldSize - y;
  const minD = Math.min(dLeft, dRight, dTop, dBottom);
  if (minD === dLeft) return { wx: 0, wy: y };
  if (minD === dRight) return { wx: fieldSize, wy: y };
  if (minD === dTop) return { wx: x, wy: 0 };
  return { wx: x, wy: fieldSize };
}

function isAtWall(x: number, y: number, fieldSize: number): boolean {
  return (
    x <= WALL_MARGIN ||
    x >= fieldSize - WALL_MARGIN ||
    y <= WALL_MARGIN ||
    y >= fieldSize - WALL_MARGIN
  );
}

function spawnFood(count: number, fieldSize: number, nextId: number): Food[] {
  const foods: Food[] = [];
  for (let i = 0; i < count; i++) {
    foods.push({
      id: nextId + i,
      x: Math.random() * fieldSize,
      y: Math.random() * fieldSize,
      eaten: false,
    });
  }
  return foods;
}

function spawnCreatureAtEdge(
  id: number,
  fieldSize: number,
  speed: number,
  size: number,
  sense: number
): Creature {
  // Random position along a random wall, facing inward
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number, heading: number;
  switch (edge) {
    case 0: // top wall
      x = Math.random() * fieldSize;
      y = 0;
      heading = Math.PI / 2; // face down
      break;
    case 1: // right wall
      x = fieldSize;
      y = Math.random() * fieldSize;
      heading = Math.PI; // face left
      break;
    case 2: // bottom wall
      x = Math.random() * fieldSize;
      y = fieldSize;
      heading = -Math.PI / 2; // face up
      break;
    default: // left wall
      x = 0;
      y = Math.random() * fieldSize;
      heading = 0; // face right
      break;
  }
  // Add some randomness to heading so they spread out
  heading += (Math.random() - 0.5) * 1.0;
  return {
    id,
    x,
    y,
    heading,
    headingTarget: heading,
    turnRate: 0,
    speed,
    size,
    sense,
    foodEaten: 0,
    energy: STARTING_ENERGY,
    alive: true,
    state: "foraging",
  };
}

// Smooth turning + movement per tick (matching source model)
function updateHeadingAndMove(c: Creature, fieldSize: number): void {
  // Turn toward headingTarget with acceleration-based smoothing
  let angleDiff = normalizeAngle(c.headingTarget - c.heading);
  // Accelerate turn rate toward the desired direction
  if (angleDiff > 0) {
    c.turnRate = Math.min(c.turnRate + TURN_ACCELERATION, MAX_TURN_SPEED);
  } else if (angleDiff < 0) {
    c.turnRate = Math.max(c.turnRate - TURN_ACCELERATION, -MAX_TURN_SPEED);
  }
  // Don't overshoot
  if (Math.abs(angleDiff) < Math.abs(c.turnRate)) {
    c.heading = c.headingTarget;
    c.turnRate = 0;
  } else {
    c.heading += c.turnRate;
  }
  c.heading = normalizeAngle(c.heading);

  // Slow down while turning (source formula)
  const turnFraction = Math.abs(c.turnRate) / MAX_TURN_SPEED;
  const effectiveSpeed = c.speed * (1 - (turnFraction * turnFraction) / 2);

  // Move
  const newX = c.x + Math.cos(c.heading) * effectiveSpeed;
  const newY = c.y + Math.sin(c.heading) * effectiveSpeed;

  // If outside bounds and heading outward, stop (you're "home")
  // Otherwise clamp to field
  c.x = clamp(newX, 0, fieldSize);
  c.y = clamp(newY, 0, fieldSize);
}

// ============================================================================
// SIMULATION HOOK
// ============================================================================

function useForagingSimulation(config: SimConfig) {
  const creaturesRef = useRef<Creature[]>([]);
  const foodsRef = useRef<Food[]>([]);
  const nextIdRef = useRef(0);
  const nextFoodIdRef = useRef(0);
  const dayRef = useRef(0);
  const tickInDayRef = useRef(0);
  const dayLengthRef = useRef(0);

  const [day, setDay] = useState(0);
  const [tickInDay, setTickInDay] = useState(0);
  const [dayLength, setDayLength] = useState(0);
  const [population, setPopulation] = useState(0);
  const [history, setHistory] = useState<DayStats[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [currentCreatures, setCurrentCreatures] = useState<Creature[]>([]);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const configRef = useRef(config);
  configRef.current = config;
  const speedRef = useRef(1);
  speedRef.current = speedMultiplier;

  // Compute day length: enough ticks for the most efficient creature to exhaust energy
  function computeDayLength(creatures: Creature[]): number {
    if (creatures.length === 0) return 400;
    let maxTicks = 0;
    for (const c of creatures) {
      const cost = energyCost(c);
      if (cost > 0) {
        maxTicks = Math.max(maxTicks, Math.ceil(STARTING_ENERGY / cost));
      }
    }
    return clamp(maxTicks, 100, 800);
  }

  const initialize = useCallback(() => {
    const cfg = configRef.current;
    creaturesRef.current = [];
    nextIdRef.current = 0;
    nextFoodIdRef.current = 0;

    for (let i = 0; i < cfg.initialPopulation; i++) {
      creaturesRef.current.push(
        spawnCreatureAtEdge(
          nextIdRef.current++,
          cfg.fieldSize,
          cfg.initialSpeed,
          cfg.initialSize,
          cfg.initialSense
        )
      );
    }

    foodsRef.current = spawnFood(
      cfg.foodCount,
      cfg.fieldSize,
      nextFoodIdRef.current
    );
    nextFoodIdRef.current += cfg.foodCount;

    const dl = computeDayLength(creaturesRef.current);
    dayLengthRef.current = dl;
    dayRef.current = 1;
    tickInDayRef.current = 0;
    setDay(1);
    setDayLength(dl);
    setTickInDay(0);
    setPopulation(cfg.initialPopulation);
    setHistory([{
      day: 0,
      population: cfg.initialPopulation,
      avgSpeed: cfg.initialSpeed,
      avgSize: cfg.initialSize,
      avgSense: cfg.initialSense,
      deaths: 0,
      births: 0,
    }]);
    setCurrentCreatures([...creaturesRef.current]);
    setRenderTrigger((r) => r + 1);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const cfg = configRef.current;
      const creatures = creaturesRef.current;
      const foods = foodsRef.current;
      const fs = cfg.fieldSize;
      const ticksThisFrame = speedRef.current;

      for (let frame = 0; frame < ticksThisFrame; frame++) {

      // --- TICK LOGIC ---
      for (const c of creatures) {
        if (!c.alive || c.state === "home") continue;

        // Deduct energy
        c.energy -= energyCost(c);
        if (c.energy <= 0) {
          c.alive = false;
          continue;
        }

        const sr = senseRadius(c);

        // === STATE MACHINE (priority order) ===

        // 1. FLEEING: check for predators within sense range
        if (cfg.enablePredation) {
          let threat: Creature | null = null;
          let threatDist = Infinity;
          for (const other of creatures) {
            if (other.id === c.id || !other.alive || other.state === "home")
              continue;
            if (other.size >= c.size * PREDATION_SIZE_RATIO) {
              const d = distance(c.x, c.y, other.x, other.y);
              if (d < sr && d < threatDist) {
                threat = other;
                threatDist = d;
              }
            }
          }
          if (threat) {
            c.state = "fleeing";
            // Turn away from threat
            c.headingTarget = Math.atan2(
              c.y - threat.y,
              c.x - threat.x
            );
            updateHeadingAndMove(c, fs);
            continue;
          }
        }

        // 2. HOMEBOUND: head to nearest wall if we have enough food
        //    - 2+ food: always head home
        //    - 1 food: head home if energy is getting low relative to distance to wall
        const wallDist = distanceToNearestWall(c.x, c.y, fs);
        const ticksOfEnergyLeft =
          energyCost(c) > 0 ? c.energy / energyCost(c) : Infinity;
        const ticksToReachWall =
          c.speed > 0 ? wallDist / c.speed : Infinity;

        const shouldGoHome =
          c.foodEaten >= 2 ||
          (c.foodEaten >= 1 &&
            ticksOfEnergyLeft < ticksToReachWall * HOMEBOUND_RATIO);

        if (shouldGoHome) {
          c.state = "homebound";
          const wall = nearestWallPoint(c.x, c.y, fs);
          c.headingTarget = Math.atan2(wall.wy - c.y, wall.wx - c.x);
          updateHeadingAndMove(c, fs);

          // Check if we reached a wall
          if (isAtWall(c.x, c.y, fs)) {
            c.state = "home";
          }
          continue;
        }

        // 3. FORAGING: look for food (and prey if predation enabled)
        c.state = "foraging";

        // Try to eat prey if predation is on
        if (cfg.enablePredation) {
          let prey: Creature | null = null;
          let preyDist = Infinity;
          for (const other of creatures) {
            if (other.id === c.id || !other.alive || other.state === "home")
              continue;
            if (c.size >= other.size * PREDATION_SIZE_RATIO) {
              const d = distance(c.x, c.y, other.x, other.y);
              if (d < sr && d < preyDist) {
                prey = other;
                preyDist = d;
              }
            }
          }
          if (prey) {
            if (preyDist < EAT_DISTANCE) {
              // Eat prey, transfer their food count
              prey.alive = false;
              c.foodEaten += prey.foodEaten + 1;
            } else {
              // Chase prey
              c.headingTarget = Math.atan2(
                prey.y - c.y,
                prey.x - c.x
              );
              updateHeadingAndMove(c, fs);
            }
            continue;
          }
        }

        // Look for food
        let nearestFood: Food | null = null;
        let nearestDist = Infinity;
        for (const food of foods) {
          if (food.eaten) continue;
          const d = distance(c.x, c.y, food.x, food.y);
          if (d < sr && d < nearestDist) {
            nearestFood = food;
            nearestDist = d;
          }
        }

        if (nearestFood && nearestDist < EAT_DISTANCE) {
          nearestFood.eaten = true;
          c.foodEaten++;
          // Small random turn after eating to avoid getting stuck
          c.headingTarget = c.heading + (Math.random() - 0.5) * 2;
        } else if (nearestFood) {
          c.headingTarget = Math.atan2(
            nearestFood.y - c.y,
            nearestFood.x - c.x
          );
        } else {
          // Wander: small random heading changes
          if (Math.random() < 0.05) {
            c.headingTarget += (Math.random() - 0.5) * 1.5;
          }
          // Near walls, turn toward center (source: TURN_DISTANCE = 60)
          const wd = 60;
          if (c.x < wd) c.headingTarget = Math.atan2(c.y - fs / 2, fs / 2);
          else if (c.x > fs - wd)
            c.headingTarget = Math.atan2(c.y - fs / 2, -(fs / 2));
          if (c.y < wd)
            c.headingTarget = Math.atan2(fs / 2, c.x - fs / 2);
          else if (c.y > fs - wd)
            c.headingTarget = Math.atan2(-(fs / 2), c.x - fs / 2);
        }

        updateHeadingAndMove(c, fs);
      }

      tickInDayRef.current++;

      // --- END OF DAY ---
      if (tickInDayRef.current >= dayLengthRef.current) {
        const survivors: Creature[] = [];
        const offspring: Creature[] = [];
        let deaths = 0;
        let births = 0;

        for (const c of creatures) {
          if (!c.alive) {
            deaths++;
            continue;
          }
          // Must have food AND be home (at a wall) to survive
          const madeItHome = c.state === "home" || isAtWall(c.x, c.y, fs);
          if (c.foodEaten >= 1 && madeItHome) {
            survivors.push(c);
          } else {
            deaths++;
          }
          if (c.foodEaten >= 2 && madeItHome) {
            const mChance = cfg.mutationChance ?? MUTATION_CHANCE;
            const mVar = cfg.mutationVariation ?? MUTATION_VARIATION;
            const mutate = (v: number) => {
              if (Math.random() < mChance) {
                return Math.max(0.1, v + (Math.random() < 0.5 ? mVar : -mVar));
              }
              return v;
            };
            const childSpeed = cfg.mutateSpeed ? mutate(c.speed) : c.speed;
            const childSize = cfg.mutateSize ? mutate(c.size) : c.size;
            const childSense = cfg.mutateSense ? mutate(c.sense) : c.sense;

            offspring.push(
              spawnCreatureAtEdge(
                nextIdRef.current++,
                fs,
                childSpeed,
                childSize,
                childSense
              )
            );
            births++;
          }
        }

        let nextGen = [...survivors, ...offspring];
        if (nextGen.length > MAX_CREATURES) {
          nextGen = nextGen
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_CREATURES);
        }

        // Record stats
        const avgSpeed =
          nextGen.length > 0
            ? nextGen.reduce((s, c) => s + c.speed, 0) / nextGen.length
            : 0;
        const avgSize =
          nextGen.length > 0
            ? nextGen.reduce((s, c) => s + c.size, 0) / nextGen.length
            : 0;
        const avgSense =
          nextGen.length > 0
            ? nextGen.reduce((s, c) => s + c.sense, 0) / nextGen.length
            : 0;

        setHistory((prev) => {
          const next = [
            ...prev,
            {
              day: dayRef.current,
              population: nextGen.length,
              avgSpeed,
              avgSize,
              avgSense,
              deaths,
              births,
            },
          ];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });

        // Reset survivors for next day (new edge positions)
        for (const c of nextGen) {
          const fresh = spawnCreatureAtEdge(c.id, fs, c.speed, c.size, c.sense);
          c.x = fresh.x;
          c.y = fresh.y;
          c.heading = fresh.heading;
          c.headingTarget = fresh.headingTarget;
          c.turnRate = 0;
          c.energy = STARTING_ENERGY;
          c.foodEaten = 0;
          c.alive = true;
          c.state = "foraging";
        }

        // New food
        foodsRef.current = spawnFood(cfg.foodCount, fs, nextFoodIdRef.current);
        nextFoodIdRef.current += cfg.foodCount;

        creaturesRef.current = nextGen;
        dayRef.current++;
        tickInDayRef.current = 0;

        const dl = computeDayLength(nextGen);
        dayLengthRef.current = dl;
        setDayLength(dl);
        setDay(dayRef.current);
        setPopulation(nextGen.length);

        if (nextGen.length === 0) {
          setCurrentCreatures(nextGen.map((c) => ({ ...c })));
          setIsRunning(false);
          break;
        }

        // At high speeds, update creatures at day boundaries so charts have fresh data
        if (speedRef.current >= 25) {
          setCurrentCreatures(nextGen.map((c) => ({ ...c })));
        }
      }

      } // end speed multiplier loop

      const isFast = speedRef.current >= 25;
      setTickInDay(tickInDayRef.current);
      // At high speeds, only update creatures/canvas on day boundaries (handled inside the loop via setPopulation etc.)
      // At normal speeds, update every frame
      if (!isFast) {
        setCurrentCreatures(creaturesRef.current.map((c) => ({ ...c })));
        setRenderTrigger((r) => r + 1);
      }
    }, 33); // ~30fps

    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    creatures: currentCreatures,
    foods: foodsRef,
    day,
    tickInDay,
    dayLength,
    population,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  };
}

// ============================================================================
// CANVAS RENDERER
// ============================================================================

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  creatures: Creature[],
  foods: Food[],
  fieldSize: number,
  canvasSize: number,
  colorMode: "uniform" | "speed" | "traits" = "uniform"
) {
  const scale = canvasSize / fieldSize;

  // Background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Grid
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= canvasSize; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvasSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvasSize, i);
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvasSize - 2, canvasSize - 2);

  // Food
  for (const food of foods) {
    if (food.eaten) continue;
    ctx.beginPath();
    ctx.arc(food.x * scale, food.y * scale, FOOD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  }

  // Creatures
  for (const creature of creatures) {
    if (!creature.alive) continue;
    const cx = creature.x * scale;
    const cy = creature.y * scale;
    const radius = CREATURE_BASE_RADIUS * Math.max(0.5, creature.size);

    // Color based on mode
    let color: string;
    if (colorMode === "uniform") {
      color = "#0d9488"; // teal-600
    } else if (colorMode === "speed") {
      // Map speed to hue: blue (slow, 0.2) -> red (fast, 5.0)
      const t = clamp((creature.speed - 0.2) / 4.8, 0, 1);
      const hue = (1 - t) * 200; // 200=blue -> 0=red
      color = `hsl(${hue}, 70%, 50%)`;
    } else {
      // traits mode: mix of speed (red), size (blue), sense (green)
      const maxTrait = Math.max(creature.speed, creature.size, creature.sense, 0.1);
      const r = Math.round((creature.speed / maxTrait) * 200);
      const g = Math.round((creature.sense / maxTrait) * 200);
      const b = Math.round((creature.size / maxTrait) * 200);
      color = `rgb(${r}, ${g}, ${b})`;
    }

    // Draw creature body
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes (two small dots)
    const eyeOffset = radius * 0.3;
    const eyeRadius = Math.max(1, radius * 0.2);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, cy - eyeOffset, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffset, cy - eyeOffset, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// SECTION: HERO
// ============================================================================

function HeroSection() {
  return (
    <section className="text-center space-y-4">
      <div className="inline-flex items-center gap-2">
        <span className="text-sm font-medium text-teal-600 bg-teal-100 px-3 py-1 rounded-full">
          Chapter 5
        </span>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Watch Video
        </a>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
        Natural Selection
      </h1>
      <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
        In previous chapters we just gave each creature a replication chance
        and a death chance. With natural selection,{" "}
        <span className="text-teal-700 font-medium">
          selection comes from interactions between a creature&apos;s traits
          and its environment
        </span>
        .
      </p>
    </section>
  );
}

// ============================================================================
// SECTION: RECAP
// ============================================================================

function RecapSection() {
  return (
    <section className="space-y-4">
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
        <p className="text-sm font-medium text-teal-600 mb-2">
          Recap from Chapter 4
        </p>
        <p className="text-gray-700 leading-relaxed">
          We saw that limited resources create a{" "}
          <span className="font-semibold text-amber-700">
            carrying capacity
          </span>
          . Populations grow until competition limits further growth, producing
          the S-shaped logistic curve.
        </p>
        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-teal-100">
          <p className="text-gray-600 italic">
            But so far, all our creatures have been identical. We just gave
            each type a replication chance and a death chance and watched what
            happened. With natural selection though, we usually can&apos;t know
            precise replication and death chances. Instead, selection comes from
            interactions between a creature&apos;s traits and its environment.
          </p>
          <p className="text-teal-700 font-semibold mt-3">
            So let&apos;s make a real evolving system by putting our creatures
            into a simple environment and giving them traits.
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: ENVIRONMENT RULES
// ============================================================================

function EnvironmentRulesSection() {
  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">The Environment</h2>
          <p className="text-teal-100 text-sm">
            A simple world with real consequences
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Creatures live on a plane. Each morning, food appears and the
            creatures emerge from their homes around the edge to go out and eat.
            Here are the rules:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200 text-center">
              <div className="text-3xl mb-2">0</div>
              <p className="text-sm font-semibold text-red-700">food found</p>
              <div className="mt-3 h-px bg-red-200"></div>
              <p className="text-sm text-red-600 mt-3 font-medium">Dies</p>
              <p className="text-xs text-red-500 mt-1">
                Ran out of energy
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 text-center">
              <div className="text-3xl mb-2">1</div>
              <p className="text-sm font-semibold text-amber-700">food found</p>
              <div className="mt-3 h-px bg-amber-200"></div>
              <p className="text-sm text-amber-600 mt-3 font-medium">
                Survives
              </p>
              <p className="text-xs text-amber-500 mt-1">
                Lives on to the next day
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
              <div className="text-3xl mb-2">2+</div>
              <p className="text-sm font-semibold text-green-700">food found</p>
              <div className="mt-3 h-px bg-green-200"></div>
              <p className="text-sm text-green-600 mt-3 font-medium">
                Survives + Replicates
              </p>
              <p className="text-xs text-green-500 mt-1">
                Enough energy to add another creature to the next day
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-600">
              <strong>Key point:</strong> We never tell the simulation who is
              &quot;fit.&quot; Fitness emerges implicitly. Creatures that happen
              to find food survive and reproduce. Those that don&apos;t, die.
              That&apos;s it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: BASELINE SIMULATION (no mutations)
// ============================================================================

function BaselineSimSection() {
  const config: SimConfig = useMemo(
    () => ({
      fieldSize: FIELD_SIZE,
      foodCount: 100,
      initialPopulation: 15,
      mutateSpeed: false,
      mutateSize: false,
      mutateSense: false,
      initialSpeed: 1.0,
      initialSize: 1.0,
      initialSense: 1.0,
      enablePredation: false,
    }),
    []
  );

  const {
    creatures,
    foods,
    day,
    tickInDay,
    dayLength,
    population,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  } = useForagingSimulation(config);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, creatures, foods.current, FIELD_SIZE, CANVAS_SIZE, "uniform");
  }, [renderTrigger, creatures, foods]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Simulation: The Baseline
          </h2>
          <p className="text-teal-100 text-sm">
            Identical creatures, no mutations, just foraging and selection
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Before we talk about traits and how they might vary, let&apos;s just
            watch these creatures live their lives for a few generations. All
            creatures have the same speed, size, and sense. No mutations yet.
          </p>

          {/* Canvas + Chart side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foraging Field
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Natural selection simulation visualization"
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ imageRendering: "auto" }}
                />
                {speedMultiplier >= 25 && isRunning && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center">
                    <div className="text-white font-semibold text-lg">Fast Forwarding</div>
                    <div className="text-slate-300 text-sm mt-1">{speedMultiplier}x speed · Day {day}</div>
                    <div className="mt-3 w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Day {day}, tick {tickInDay}/{dayLength}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  Food: {foods.current.filter((f) => !f.eaten).length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Day length is dynamic: the most efficient creature sets the pace ({dayLength} ticks)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Population Over Days
              </p>
              <ResponsiveContainer width="100%" height={CANVAS_SIZE - 20}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    fontSize={11}
                    stroke="#9ca3af"
                    label={{
                      value: "Day",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis fontSize={11} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="population"
                    name="Population"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-1">Day</p>
              <p className="text-2xl font-bold text-gray-700">{day}</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Population
              </p>
              <p className="text-2xl font-bold text-teal-600">{population}</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <p className="text-sm font-medium text-gray-500 mb-1">
                Food Left
              </p>
              <p className="text-2xl font-bold text-green-600">
                {foods.current.filter((f) => !f.eaten).length}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reset
            </button>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10, 25, 50].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === s
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Observation */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200">
            <p className="text-sm text-teal-700">
              <strong>What to watch for:</strong> The population starts at just 15
              creatures with 100 food. It should expand quickly over the first
              few days since there&apos;s plenty of food to go around. But as the
              population grows, competition kicks in and growth levels off. The
              creatures really have to compete with each other for food once they
              approach carrying capacity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: SPEED MUTATION SIMULATION
// ============================================================================

function SpeedMutationSection() {
  const config: SimConfig = useMemo(
    () => ({
      fieldSize: 200,
      foodCount: 150,
      initialPopulation: 40,
      mutateSpeed: true,
      mutateSize: false,
      mutateSense: false,
      initialSpeed: 1.0,
      initialSize: 1.0,
      initialSense: 1.0,
      enablePredation: false,
      mutationChance: 0.10,
      mutationVariation: 0.2,
    }),
    []
  );

  const {
    creatures,
    foods,
    day,
    tickInDay,
    dayLength,
    population,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  } = useForagingSimulation(config);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, creatures, foods.current, config.fieldSize, CANVAS_SIZE, "speed");
  }, [renderTrigger, creatures, foods]);

  // Build speed histogram data
  const histogramData = useMemo(() => {
    const alive = creatures.filter((c) => c.alive);
    if (alive.length === 0) return [];
    const bucketSize = 0.2;
    const speeds = alive.map((c) => c.speed);
    const minSpeed = Math.floor(Math.min(...speeds) * 5) / 5; // round down to nearest 0.2
    const maxSpeed = Math.ceil(Math.max(...speeds) * 5) / 5 + bucketSize; // round up
    const buckets: { range: string; count: number; speed: number }[] = [];
    for (let s = Math.max(0.1, minSpeed - 0.2); s < maxSpeed + 0.2; s = Math.round((s + bucketSize) * 10) / 10) {
      buckets.push({
        range: s.toFixed(1),
        count: alive.filter((c) => c.speed >= s && c.speed < s + bucketSize).length,
        speed: s,
      });
    }
    return buckets;
  }, [creatures, day]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Simulation: Speed Mutations
          </h2>
          <p className="text-blue-100 text-sm">
            What happens when creatures can be born faster or slower?
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Now let&apos;s introduce our first trait variation. When a creature
            reproduces, the offspring&apos;s speed might be slightly different,
            a little faster or a little slower. Faster creatures reach food
            first, but there&apos;s a tradeoff.
          </p>

          {/* Speed tradeoff card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              The Speed Tradeoff
            </p>
            <p className="text-sm text-blue-700">
              Moving faster means burning more energy. The cost scales with the{" "}
              <span className="font-semibold">square</span> of speed, so a
              creature twice as fast uses four times as much energy per tick.
              Being fast helps you grab food before others, but if you
              don&apos;t find food quickly, you starve even faster.
            </p>
            <div className="mt-3 font-mono text-sm text-center text-blue-900 bg-white/60 rounded-lg p-2">
              energy cost per tick = speed<sup>2</sup> (with size and sense at 1.0)
            </div>
          </div>

          {/* Canvas + Population chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foraging Field{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (color = speed: blue=slow, red=fast)
                </span>
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Natural selection simulation visualization"
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ imageRendering: "auto" }}
                />
                {speedMultiplier >= 25 && isRunning && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center">
                    <div className="text-white font-semibold text-lg">Fast Forwarding</div>
                    <div className="text-slate-300 text-sm mt-1">{speedMultiplier}x speed · Day {day}</div>
                    <div className="mt-3 w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Day {day}, tick {tickInDay}/{dayLength}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  Food: {foods.current.filter((f) => !f.eaten).length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Day length is dynamic: the most efficient creature sets the pace ({dayLength} ticks)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Average Speed &amp; Population
              </p>
              <ResponsiveContainer width="100%" height={CANVAS_SIZE - 20}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    fontSize={11}
                    stroke="#9ca3af"
                    label={{
                      value: "Day",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis yAxisId="left" fontSize={11} stroke="#9ca3af" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={11}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="population"
                    name="Population"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSpeed"
                    name="Avg Speed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={1.0}
                    stroke="#94a3b8"
                    strokeDasharray="6 3"
                    label={{
                      value: "Starting speed",
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "#94a3b8",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Speed Distribution Histogram */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Speed Distribution (current generation)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="range"
                  fontSize={10}
                  stroke="#9ca3af"
                  label={{
                    value: "Speed",
                    position: "insideBottomRight",
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <YAxis fontSize={11} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="count" name="Creatures" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {histogramData.map((entry, index) => {
                    const speeds = histogramData.filter((b) => b.count > 0).map((b) => b.speed);
                    const lo = speeds.length > 0 ? Math.min(...speeds) : 0.2;
                    const hi = speeds.length > 0 ? Math.max(...speeds) : 2.5;
                    const range = Math.max(hi - lo, 0.5);
                    const t = clamp((entry.speed - lo) / range, 0, 1);
                    const hue = (1 - t) * 200;
                    return (
                      <Cell
                        key={index}
                        fill={`hsl(${hue}, 70%, 50%)`}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Day</p>
              <p className="text-xl font-bold text-gray-700">{day}</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Population</p>
              <p className="text-xl font-bold text-teal-600">{population}</p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Avg Speed</p>
              <p className="text-xl font-bold text-blue-600">
                {creatures.length > 0
                  ? (
                      creatures
                        .filter((c) => c.alive)
                        .reduce((s, c) => s + c.speed, 0) /
                      Math.max(1, creatures.filter((c) => c.alive).length)
                    ).toFixed(2)
                  : "—"}
              </p>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Food Left</p>
              <p className="text-xl font-bold text-green-600">
                {foods.current.filter((f) => !f.eaten).length}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reset
            </button>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10, 25, 50].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Observation */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>What to watch for:</strong> Average speed should creep up
              over generations. Faster creatures grab food before slower ones, so
              speed gets selected for. But here&apos;s the counterintuitive part:
              the population actually <em>decreases</em> as average speed goes up.
              Faster creatures burn more energy, so the same amount of food supports
              fewer individuals. The creatures are evolving to be &quot;better&quot;
              in a way that&apos;s worse for the population as a whole. This is a
              preview of the selfish gene idea.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: ENERGY COST MODEL (static)
// ============================================================================

function EnergyCostModelSection() {
  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            The Energy Cost Model
          </h2>
          <p className="text-purple-100 text-sm">
            Three traits, three tradeoffs, one equation
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Before we let all three traits mutate at once, let&apos;s understand
            the cost model. Every tick, a creature pays an energy cost based on
            its traits. If it runs out of energy before finding food and getting
            back home, it dies.
          </p>

          {/* Equation */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
              Energy Cost Per Tick
            </p>
            <p className="text-2xl font-mono text-white">
              size<sup className="text-purple-300">3</sup>{" "}
              <span className="text-slate-400">×</span>{" "}
              speed<sup className="text-blue-300">2</sup>{" "}
              <span className="text-slate-400">+</span>{" "}
              <span className="text-green-300">sense</span>
            </p>
            <p className="text-xs text-slate-400 mt-3">
              Default creature (all traits = 1.0): cost = 1 × 1 + 1 = 2 per tick
            </p>
          </div>

          {/* Three trait cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Speed */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm">⚡</span>
                </div>
                <h3 className="font-semibold text-blue-800">Speed</h3>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                <strong>Benefit:</strong> Reach food before others. Faster
                creatures outcompete slower ones.
              </p>
              <p className="text-sm text-blue-600">
                <strong>Cost:</strong> speed<sup>2</sup>. Doubles speed means 4x
                the energy burn. Very expensive.
              </p>
              <div className="mt-3 text-xs font-mono bg-white/60 rounded-lg p-2 text-blue-800 text-center">
                speed 1.0 → cost 1 | speed 2.0 → cost 4
              </div>
            </div>

            {/* Size */}
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-sm">🔵</span>
                </div>
                <h3 className="font-semibold text-purple-800">Size</h3>
              </div>
              <p className="text-sm text-purple-700 mb-2">
                <strong>Benefit:</strong> Eat creatures 20% smaller than you.
                Predation gives extra food.
              </p>
              <p className="text-sm text-purple-600">
                <strong>Cost:</strong> size<sup>3</sup>, multiplied with speed.
                The most punishing trait to increase.
              </p>
              <div className="mt-3 text-xs font-mono bg-white/60 rounded-lg p-2 text-purple-800 text-center">
                size 1.0 → ×1 | size 2.0 → ×8
              </div>
            </div>

            {/* Sense */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-sm">👁</span>
                </div>
                <h3 className="font-semibold text-green-800">Sense</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">
                <strong>Benefit:</strong> Larger detection radius. See food and
                threats from farther away.
              </p>
              <p className="text-sm text-green-600">
                <strong>Cost:</strong> Linear (just +sense). By far the cheapest
                trait to increase.
              </p>
              <div className="mt-3 text-xs font-mono bg-white/60 rounded-lg p-2 text-green-800 text-center">
                sense 1.0 → +1 | sense 2.0 → +2
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm text-purple-700">
              <strong>Why does this matter?</strong> Size and speed are
              multiplicative with each other (size<sup>3</sup> × speed<sup>2</sup>),
              so being big AND fast is extremely expensive. Sense is additive, which
              makes it relatively cheap. The cost model creates real tradeoffs:
              you can&apos;t be good at everything.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: THREE TRAITS SIMULATION
// ============================================================================

function ThreeTraitsSimSection() {
  const [preset, setPreset] = useState<"source" | "fast">("source");

  const config: SimConfig = useMemo(
    () =>
      preset === "source"
        ? {
            fieldSize: FIELD_SIZE,
            foodCount: 100,
            initialPopulation: 20,
            mutateSpeed: true,
            mutateSize: true,
            mutateSense: true,
            initialSpeed: 1.0,
            initialSize: 1.0,
            initialSense: 1.0,
            enablePredation: true,
          }
        : {
            fieldSize: 200,
            foodCount: 150,
            initialPopulation: 40,
            mutateSpeed: true,
            mutateSize: true,
            mutateSense: true,
            initialSpeed: 1.0,
            initialSize: 1.0,
            initialSense: 1.0,
            enablePredation: true,
            mutationChance: 0.10,
            mutationVariation: 0.2,
          },
    [preset]
  );

  const {
    creatures,
    foods,
    day,
    tickInDay,
    dayLength,
    population,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  } = useForagingSimulation(config);

  // Reset sim when preset changes
  const prevPreset = useRef(preset);
  useEffect(() => {
    if (prevPreset.current !== preset) {
      prevPreset.current = preset;
      reset();
    }
  }, [preset, reset]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, creatures, foods.current, config.fieldSize, CANVAS_SIZE, "traits");
  }, [renderTrigger, creatures, foods, config.fieldSize]);

  // Build histograms for all three traits
  const buildHistogram = useCallback(
    (trait: "speed" | "size" | "sense") => {
      const alive = creatures.filter((c) => c.alive);
      if (alive.length === 0) return [];
      const bucketSize = 0.2;
      const values = alive.map((c) => c[trait]);
      const lo = Math.floor(Math.min(...values) * 5) / 5;
      const hi = Math.ceil(Math.max(...values) * 5) / 5 + bucketSize;
      const buckets: { range: string; count: number; val: number }[] = [];
      for (
        let v = Math.max(0.1, lo - 0.2);
        v < hi + 0.2;
        v = Math.round((v + bucketSize) * 10) / 10
      ) {
        buckets.push({
          range: v.toFixed(1),
          count: alive.filter((c) => c[trait] >= v && c[trait] < v + bucketSize)
            .length,
          val: v,
        });
      }
      return buckets;
    },
    [creatures, day] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const speedHist = useMemo(() => buildHistogram("speed"), [buildHistogram]);
  const sizeHist = useMemo(() => buildHistogram("size"), [buildHistogram]);
  const senseHist = useMemo(() => buildHistogram("sense"), [buildHistogram]);

  const alive = creatures.filter((c) => c.alive);
  const avgSpeed =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.speed, 0) / alive.length
      : 0;
  const avgSize =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.size, 0) / alive.length
      : 0;
  const avgSense =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.sense, 0) / alive.length
      : 0;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Simulation: All Three Traits
          </h2>
          <p className="text-amber-100 text-sm">
            Speed, size, and sense mutating together with predation enabled
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Now we let everything loose. All three traits can mutate, and bigger
            creatures can eat smaller ones. The interactions between traits get
            really interesting. Speed settled in a predictable way when it was
            alone, but what happens when size and sense are in the mix too?
          </p>

          {/* Canvas + Trait averages chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foraging Field{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (color: red=speed, blue=size, green=sense)
                </span>
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Natural selection simulation visualization"
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ imageRendering: "auto" }}
                />
                {speedMultiplier >= 25 && isRunning && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center">
                    <div className="text-white font-semibold text-lg">
                      Fast Forwarding
                    </div>
                    <div className="text-slate-300 text-sm mt-1">
                      {speedMultiplier}x speed · Day {day}
                    </div>
                    <div className="mt-3 w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Day {day}, tick {tickInDay}/{dayLength}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  Food: {foods.current.filter((f) => !f.eaten).length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Day length is dynamic: the most efficient creature sets the pace ({dayLength} ticks)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Trait Averages Over Days
              </p>
              <ResponsiveContainer width="100%" height={CANVAS_SIZE - 20}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    fontSize={11}
                    stroke="#9ca3af"
                    label={{
                      value: "Day",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis yAxisId="left" fontSize={11} stroke="#9ca3af" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={11}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="population"
                    name="Population"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSpeed"
                    name="Avg Speed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSize"
                    name="Avg Size"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSense"
                    name="Avg Sense"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Three histograms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-red-600 mb-1 text-center">
                Speed Distribution
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={speedHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar
                    dataKey="count"
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 mb-1 text-center">
                Size Distribution
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sizeHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar
                    dataKey="count"
                    fill="#6366f1"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 mb-1 text-center">
                Sense Distribution
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={senseHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar
                    dataKey="count"
                    fill="#22c55e"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Day</p>
              <p className="text-lg font-bold text-gray-700">{day}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Pop</p>
              <p className="text-lg font-bold text-gray-700">{population}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-500 mb-1">Speed</p>
              <p className="text-lg font-bold text-red-600">
                {avgSpeed.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
              <p className="text-xs font-medium text-indigo-500 mb-1">Size</p>
              <p className="text-lg font-bold text-indigo-600">
                {avgSize.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <p className="text-xs font-medium text-green-500 mb-1">Sense</p>
              <p className="text-lg font-bold text-green-600">
                {avgSense.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reset
            </button>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10, 25, 50].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === s
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Preset toggle */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">Params:</span>
            {([
              ["source", "1x mutation, 100 food, 20 pop"],
              ["fast", "2x mutation, 150 food, 40 pop"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === key
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Observation */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>What to watch for:</strong> With all three traits in play,
              things get harder to predict. Speed doesn&apos;t settle the same
              way as when it was the only trait. The interactions between traits
              create unexpected dynamics. You might see trends that seem
              counterintuitive at first, but remember that each trait&apos;s
              value depends on what every other creature is doing. Watch how the
              population changes compared to the speed-only simulation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: ENVIRONMENTAL CHANGE
// ============================================================================

function EnvironmentalChangeSection() {
  const [preset, setPreset] = useState<"source" | "fast" | "turbo">("source");

  const presetParams = {
    source: { fieldSize: FIELD_SIZE, food: 100, pop: 20, mChance: MUTATION_CHANCE, mVar: MUTATION_VARIATION, decline: 4 },
    fast: { fieldSize: 200, food: 150, pop: 40, mChance: 0.10, mVar: 0.2, decline: 4 },
    turbo: { fieldSize: 200, food: 200, pop: 50, mChance: 0.20, mVar: 0.3, decline: 5 },
  };
  const pp = presetParams[preset];

  const [foodOverride, setFoodOverride] = useState(pp.food);
  const foodOverrideRef = useRef(pp.food);
  foodOverrideRef.current = foodOverride;

  const config: SimConfig = useMemo(
    () => ({
      fieldSize: pp.fieldSize,
      foodCount: foodOverride,
      initialPopulation: pp.pop,
      mutateSpeed: true,
      mutateSize: true,
      mutateSense: true,
      initialSpeed: 1.0,
      initialSize: 1.0,
      initialSense: 1.0,
      enablePredation: true,
      mutationChance: pp.mChance,
      mutationVariation: pp.mVar,
    }),
    [foodOverride, pp.fieldSize, pp.pop, pp.mChance, pp.mVar]
  );

  const {
    creatures,
    foods,
    day,
    tickInDay,
    dayLength,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  } = useForagingSimulation(config);

  // Gradually decrease food based on preset's decline rate (down to 15)
  const lastFoodUpdateDay = useRef(0);
  const declineRef = useRef(pp.decline);
  declineRef.current = pp.decline;
  useEffect(() => {
    if (day > lastFoodUpdateDay.current && day > 1) {
      lastFoodUpdateDay.current = day;
      if (day % declineRef.current === 0) {
        setFoodOverride((prev) => Math.max(15, prev - 1));
      }
    }
  }, [day]);

  const handleReset = useCallback(() => {
    setFoodOverride(pp.food);
    lastFoodUpdateDay.current = 0;
    reset();
  }, [reset, pp.food]);

  // Reset sim when preset changes
  const prevPreset = useRef(preset);
  useEffect(() => {
    if (prevPreset.current !== preset) {
      prevPreset.current = preset;
      setFoodOverride(presetParams[preset].food);
      lastFoodUpdateDay.current = 0;
      reset();
    }
  }, [preset, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, creatures, foods.current, config.fieldSize, CANVAS_SIZE, "traits");
  }, [renderTrigger, creatures, foods, config.fieldSize]);

  const alive = creatures.filter((c) => c.alive);
  const avgSpeed =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.speed, 0) / alive.length
      : 0;
  const avgSize =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.size, 0) / alive.length
      : 0;
  const avgSense =
    alive.length > 0
      ? alive.reduce((s, c) => s + c.sense, 0) / alive.length
      : 0;

  // Add food supply to history for chart
  const historyWithFood = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        foodSupply:
          pp.food - Math.floor(Math.max(0, h.day - 1) / pp.decline),
      })).map((h) => ({ ...h, foodSupply: Math.max(15, h.foodSupply) })),
    [history, pp.food, pp.decline]
  );

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-teal-100/50 border border-teal-100 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-red-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Simulation: Environmental Change
          </h2>
          <p className="text-rose-100 text-sm">
            What happens when food gradually disappears?
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Everything we&apos;ve seen so far has been in a stable environment.
            But what if the environment changes? Here the food supply starts
            at {pp.food} and drops by 1 every {pp.decline} days, down to 15. This
            completely reshuffles which traits are valuable.
          </p>

          {/* Canvas + Traits chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foraging Field{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (color: red=speed, blue=size, green=sense)
                </span>
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Natural selection simulation visualization"
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ imageRendering: "auto" }}
                />
                {speedMultiplier >= 25 && isRunning && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center">
                    <div className="text-white font-semibold text-lg">
                      Fast Forwarding
                    </div>
                    <div className="text-slate-300 text-sm mt-1">
                      {speedMultiplier}x speed · Day {day}
                    </div>
                    <div className="mt-3 w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Day {day}, tick {tickInDay}/{dayLength}
                </span>
                <span className="flex items-center gap-3">
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                    Food: {foodOverride}/day
                  </span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Day length is dynamic: the most efficient creature sets the pace ({dayLength} ticks)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Traits &amp; Food Supply
              </p>
              <ResponsiveContainer width="100%" height={CANVAS_SIZE - 20}>
                <LineChart data={historyWithFood}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    fontSize={11}
                    stroke="#9ca3af"
                    label={{
                      value: "Day",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis yAxisId="left" fontSize={11} stroke="#9ca3af" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={11}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="population"
                    name="Population"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="foodSupply"
                    name="Food/Day"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSpeed"
                    name="Avg Speed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSize"
                    name="Avg Size"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgSense"
                    name="Avg Sense"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Day</p>
              <p className="text-lg font-bold text-gray-700">{day}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Pop</p>
              <p className="text-lg font-bold text-gray-700">
                {creatures.filter((c) => c.alive).length}
              </p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <p className="text-xs font-medium text-orange-500 mb-1">Food</p>
              <p className="text-lg font-bold text-orange-600">{foodOverride}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-500 mb-1">Speed</p>
              <p className="text-lg font-bold text-red-600">
                {avgSpeed.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
              <p className="text-xs font-medium text-indigo-500 mb-1">Size</p>
              <p className="text-lg font-bold text-indigo-600">
                {avgSize.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <p className="text-xs font-medium text-green-500 mb-1">Sense</p>
              <p className="text-lg font-bold text-green-600">
                {avgSense.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-rose-500 to-red-500 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reset
            </button>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10, 25, 50, 100, 200].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === s
                      ? "bg-rose-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Preset toggle */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Params:</span>
            {([
              ["source", "1x mutation, 100 food, 20 pop"],
              ["fast", "2x mutation, 150 food, 40 pop"],
              ["turbo", "4x mutation, 200 food, 50 pop"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === key
                    ? "bg-rose-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Observation */}
          <div className="bg-gradient-to-r from-rose-50 to-red-50 rounded-xl p-4 border border-rose-200">
            <p className="text-sm text-rose-700">
              <strong>Note:</strong> With these parameters, the food decline is
              fast relative to how quickly mutation and selection can shift
              trait averages. Populations often collapse abruptly because
              they simply can&apos;t adapt fast enough. Slowing the decline
              would help, but makes the simulation run too long to watch.
              This is a real tradeoff in evolution: when the environment
              changes faster than a population can adapt, extinction follows.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: KEY INSIGHTS
// ============================================================================

function KeyInsightsSection() {
  const insights = [
    {
      title: "Fitness is not a fixed property",
      text: "A creature isn't inherently \"fit.\" Fitness emerges from the interaction between its traits and the environment. Change the environment, and what's fit changes too.",
    },
    {
      title: "Selection doesn't require intent",
      text: "Nobody tells the simulation who should survive. The rules are simple: find food, get home, reproduce. Natural selection is just the inevitable result of variation + differential survival.",
    },
    {
      title: "Traits have tradeoffs",
      text: "There's no free lunch. Speed helps you get food but burns energy. Size lets you eat others but is incredibly expensive. Every advantage comes with a cost.",
    },
    {
      title: "Evolution can be bad for the population",
      text: "When speed evolved upward, population went down. Individuals evolved to be \"better\" at competing, but the population paid the price. What's good for the individual gene isn't always good for the group.",
    },
    {
      title: "Cheap traits spread easily",
      text: "Sense has a linear cost while speed and size are quadratic or cubic. Cheap-to-maintain advantages tend to spread more broadly through a population.",
    },
    {
      title: "Environmental change reshuffles everything",
      text: "Traits that were well-adapted to abundant food become liabilities when food is scarce. Evolution doesn't have a finish line because the environment keeps changing.",
    },
    {
      title: "Equilibrium is temporary",
      text: "Populations stabilize, trait averages settle, but it's always contingent on current conditions. A new mutation, a new competitor, or a change in resources can destabilize everything.",
    },
  ];

  return (
    <section>
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl shadow-lg shadow-emerald-200/50 overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Key Insights</h2>
              <p className="text-emerald-200 text-sm">
                The big ideas from this chapter
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="bg-white/10 rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <p className="text-white font-medium text-sm mb-1">
                  <span className="text-emerald-300 mr-2">{i + 1}.</span>
                  {insight.title}
                </p>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION: FULL SANDBOX
// ============================================================================

function FullSandboxSection() {
  // --- Parameter state ---
  const [foodCount, setFoodCount] = useState(100);
  const [initialPop, setInitialPop] = useState(20);
  const [fieldSize, setFieldSize] = useState(FIELD_SIZE);
  const [mutSpeed, setMutSpeed] = useState(true);
  const [mutSize, setMutSize] = useState(true);
  const [mutSense, setMutSense] = useState(true);
  const [predation, setPredation] = useState(true);
  const [mutChance, setMutChance] = useState(0.05);
  const [mutVariation, setMutVariation] = useState(0.1);
  const [initSpeed, setInitSpeed] = useState(1.0);
  const [initSize, setInitSize] = useState(1.0);
  const [initSense, setInitSense] = useState(1.0);
  const [foodMode, setFoodMode] = useState<"constant" | "decline">("constant");
  const [declineRate, setDeclineRate] = useState(4); // reduce by 1 every N days
  const [minFood, setMinFood] = useState(15);

  // --- Food override for decline mode ---
  const [foodOverride, setFoodOverride] = useState(foodCount);
  const foodOverrideRef = useRef(foodCount);
  foodOverrideRef.current = foodOverride;

  const config: SimConfig = useMemo(
    () => ({
      fieldSize,
      foodCount: foodMode === "decline" ? foodOverride : foodCount,
      initialPopulation: initialPop,
      mutateSpeed: mutSpeed,
      mutateSize: mutSize,
      mutateSense: mutSense,
      initialSpeed: initSpeed,
      initialSize: initSize,
      initialSense: initSense,
      enablePredation: predation,
      mutationChance: mutChance,
      mutationVariation: mutVariation,
    }),
    [
      fieldSize, foodCount, foodOverride, foodMode, initialPop,
      mutSpeed, mutSize, mutSense, initSpeed, initSize, initSense,
      predation, mutChance, mutVariation,
    ]
  );

  const {
    creatures,
    foods,
    day,
    tickInDay,
    dayLength,
    population,
    history,
    isRunning,
    setIsRunning,
    reset,
    renderTrigger,
    speedMultiplier,
    setSpeedMultiplier,
  } = useForagingSimulation(config);

  // --- Food decline logic ---
  const lastFoodUpdateDay = useRef(0);
  useEffect(() => {
    if (foodMode !== "decline") return;
    if (day > lastFoodUpdateDay.current && day > 1) {
      lastFoodUpdateDay.current = day;
      if (day % declineRate === 0) {
        setFoodOverride((prev) => Math.max(minFood, prev - 1));
      }
    }
  }, [day, foodMode, declineRate, minFood]);

  // --- Reset helper ---
  const handleReset = useCallback(() => {
    setFoodOverride(foodCount);
    lastFoodUpdateDay.current = 0;
    reset();
  }, [reset, foodCount]);

  // --- Reset when food mode changes ---
  const prevFoodMode = useRef(foodMode);
  useEffect(() => {
    if (prevFoodMode.current !== foodMode) {
      prevFoodMode.current = foodMode;
      setFoodOverride(foodCount);
      lastFoodUpdateDay.current = 0;
      reset();
    }
  }, [foodMode, reset, foodCount]);

  // --- Canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colorMode = (mutSpeed || mutSize || mutSense) ? "traits" : "uniform";
    renderCanvas(ctx, creatures, foods.current, fieldSize, CANVAS_SIZE, colorMode);
  }, [renderTrigger, creatures, foods, fieldSize, mutSpeed, mutSize, mutSense]);

  // --- Histograms ---
  const buildHistogram = useCallback(
    (trait: "speed" | "size" | "sense") => {
      const alive = creatures.filter((c) => c.alive);
      if (alive.length === 0) return [];
      const bucketSize = 0.2;
      const values = alive.map((c) => c[trait]);
      const lo = Math.floor(Math.min(...values) * 5) / 5;
      const hi = Math.ceil(Math.max(...values) * 5) / 5 + bucketSize;
      const buckets: { range: string; count: number; val: number }[] = [];
      for (
        let v = Math.max(0.1, lo - 0.2);
        v < hi + 0.2;
        v = Math.round((v + bucketSize) * 10) / 10
      ) {
        buckets.push({
          range: v.toFixed(1),
          count: alive.filter((c) => c[trait] >= v && c[trait] < v + bucketSize)
            .length,
          val: v,
        });
      }
      return buckets;
    },
    [creatures, day] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const speedHist = useMemo(() => buildHistogram("speed"), [buildHistogram]);
  const sizeHist = useMemo(() => buildHistogram("size"), [buildHistogram]);
  const senseHist = useMemo(() => buildHistogram("sense"), [buildHistogram]);

  // --- Stats ---
  const alive = creatures.filter((c) => c.alive);
  const avgSpeed = alive.length > 0 ? alive.reduce((s, c) => s + c.speed, 0) / alive.length : 0;
  const avgSize = alive.length > 0 ? alive.reduce((s, c) => s + c.size, 0) / alive.length : 0;
  const avgSense = alive.length > 0 ? alive.reduce((s, c) => s + c.sense, 0) / alive.length : 0;

  // --- Food supply in history for decline mode ---
  const historyWithFood = useMemo(() => {
    if (foodMode !== "decline") return history;
    return history.map((h) => ({
      ...h,
      foodSupply: Math.max(minFood, foodCount - Math.floor(Math.max(0, h.day - 1) / declineRate)),
    }));
  }, [history, foodMode, foodCount, declineRate, minFood]);

  // --- Slider helper ---
  const SliderRow = ({ label, value, onChange, min, max, step, displayValue }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; displayValue?: string;
  }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-violet-500"
      />
      <span className="text-xs font-mono text-gray-700 w-12 text-right">
        {displayValue ?? value}
      </span>
    </div>
  );

  // --- Toggle helper ---
  const Toggle = ({ label, checked, onChange }: {
    label: string; checked: boolean; onChange: (v: boolean) => void;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${checked ? "bg-violet-500" : "bg-gray-300"}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </label>
  );

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/50 border border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Sandbox Mode
          </h2>
          <p className="text-violet-100 text-sm">
            Full parameter control — tweak everything and see what emerges
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Controls panel */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 space-y-4">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Parameters</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {/* Left column: environment */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Environment</p>
                <SliderRow label="Food count" value={foodMode === "decline" ? foodCount : foodCount} onChange={(v) => { setFoodCount(v); if (foodMode === "constant") setFoodOverride(v); }} min={10} max={300} step={5} />
                <SliderRow label="Initial population" value={initialPop} onChange={setInitialPop} min={5} max={100} step={5} />
                <SliderRow label="Field size" value={fieldSize} onChange={setFieldSize} min={100} max={300} step={10} />

                <div className="pt-1 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Food Mode</p>
                  <div className="flex gap-2">
                    {(["constant", "decline"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setFoodMode(mode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          foodMode === mode
                            ? "bg-violet-600 text-white"
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {mode === "constant" ? "Constant" : "Declining"}
                      </button>
                    ))}
                  </div>
                  {foodMode === "decline" && (
                    <div className="space-y-2 pl-2 border-l-2 border-violet-200">
                      <SliderRow label="Decline every N days" value={declineRate} onChange={setDeclineRate} min={1} max={10} step={1} />
                      <SliderRow label="Min food" value={minFood} onChange={setMinFood} min={5} max={50} step={5} />
                    </div>
                  )}
                </div>

                <Toggle label="Predation" checked={predation} onChange={setPredation} />
              </div>

              {/* Right column: traits & mutations */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Traits &amp; Mutations</p>

                <div className="space-y-2">
                  <Toggle label="Mutate speed" checked={mutSpeed} onChange={setMutSpeed} />
                  <Toggle label="Mutate size" checked={mutSize} onChange={setMutSize} />
                  <Toggle label="Mutate sense" checked={mutSense} onChange={setMutSense} />
                </div>

                <SliderRow label="Mutation chance" value={mutChance} onChange={setMutChance} min={0.01} max={0.5} step={0.01} displayValue={`${(mutChance * 100).toFixed(0)}%`} />
                <SliderRow label="Mutation variation" value={mutVariation} onChange={setMutVariation} min={0.05} max={0.5} step={0.05} displayValue={`\u00b1${mutVariation.toFixed(2)}`} />

                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-500 mb-2">Initial Trait Values</p>
                  <div className="space-y-2">
                    <SliderRow label="Speed" value={initSpeed} onChange={setInitSpeed} min={0.5} max={3.0} step={0.1} displayValue={initSpeed.toFixed(1)} />
                    <SliderRow label="Size" value={initSize} onChange={setInitSize} min={0.5} max={3.0} step={0.1} displayValue={initSize.toFixed(1)} />
                    <SliderRow label="Sense" value={initSense} onChange={setInitSense} min={0.5} max={3.0} step={0.1} displayValue={initSense.toFixed(1)} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-violet-500 text-center italic">
              Changes apply on next Reset
            </p>
          </div>

          {/* Canvas + Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foraging Field{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (color: red=speed, blue=size, green=sense)
                </span>
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label="Natural selection simulation visualization"
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ imageRendering: "auto" }}
                />
                {speedMultiplier >= 25 && isRunning && (
                  <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex flex-col items-center justify-center">
                    <div className="text-white font-semibold text-lg">Fast Forwarding</div>
                    <div className="text-slate-300 text-sm mt-1">{speedMultiplier}x speed · Day {day}</div>
                    <div className="mt-3 w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Day {day}, tick {tickInDay}/{dayLength}</span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  Food: {foodMode === "decline" ? `${foodOverride}/day` : `${foods.current.filter((f) => !f.eaten).length}`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Day length is dynamic: the most efficient creature sets the pace ({dayLength} ticks)
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Traits &amp; Population
              </p>
              <ResponsiveContainer width="100%" height={CANVAS_SIZE - 20}>
                <LineChart data={historyWithFood}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    fontSize={11}
                    stroke="#9ca3af"
                    label={{ value: "Day", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                  />
                  <YAxis yAxisId="left" fontSize={11} stroke="#9ca3af" />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={30} />
                  <Line yAxisId="right" type="monotone" dataKey="population" name="Population" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
                  {foodMode === "decline" && (
                    <Line yAxisId="right" type="monotone" dataKey="foodSupply" name="Food/Day" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                  )}
                  <Line yAxisId="left" type="monotone" dataKey="avgSpeed" name="Avg Speed" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="left" type="monotone" dataKey="avgSize" name="Avg Size" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="left" type="monotone" dataKey="avgSense" name="Avg Sense" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Three histograms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-red-600 mb-1 text-center">Speed Distribution</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={speedHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar dataKey="count" fill="#ef4444" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 mb-1 text-center">Size Distribution</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sizeHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 mb-1 text-center">Sense Distribution</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={senseHist}>
                  <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" />
                  <YAxis fontSize={9} stroke="#9ca3af" width={25} />
                  <Bar dataKey="count" fill="#22c55e" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Day</p>
              <p className="text-lg font-bold text-gray-700">{day}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Pop</p>
              <p className="text-lg font-bold text-gray-700">{population}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <p className="text-xs font-medium text-orange-500 mb-1">Food</p>
              <p className="text-lg font-bold text-orange-600">{foodMode === "decline" ? foodOverride : foodCount}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
              <p className="text-xs font-medium text-red-500 mb-1">Speed</p>
              <p className="text-lg font-bold text-red-600">{avgSpeed.toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
              <p className="text-xs font-medium text-indigo-500 mb-1">Size</p>
              <p className="text-lg font-bold text-indigo-600">{avgSize.toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <p className="text-xs font-medium text-green-500 mb-1">Sense</p>
              <p className="text-lg font-bold text-green-600">{avgSense.toFixed(2)}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                isRunning
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              }`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Reset
            </button>
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10, 25, 50, 100, 200].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-3 py-2.5 min-w-[44px] min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                    speedMultiplier === s
                      ? "bg-violet-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Page5() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-cyan-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <HeroSection />
        <RecapSection />
        <EnvironmentRulesSection />
        <BaselineSimSection />
        <SpeedMutationSection />
        <EnergyCostModelSection />
        <ThreeTraitsSimSection />
        <EnvironmentalChangeSection />
        <KeyInsightsSection />
        <FullSandboxSection />

        <div className="h-8"></div>
      </div>
    </div>
  );
}
