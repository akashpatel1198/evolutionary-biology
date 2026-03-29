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

function mutateTrait(value: number): number {
  if (Math.random() < MUTATION_CHANCE) {
    const delta = Math.random() < 0.5 ? MUTATION_VARIATION : -MUTATION_VARIATION;
    return Math.max(0.1, value + delta);
  }
  return value;
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

  const configRef = useRef(config);
  configRef.current = config;

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
    return Math.max(100, maxTicks);
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
    setHistory([]);
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
          // Near walls, bias heading toward center
          if (c.x < 20) c.headingTarget = Math.atan2(c.y - fs / 2, fs / 2);
          else if (c.x > fs - 20)
            c.headingTarget = Math.atan2(c.y - fs / 2, -(fs / 2));
          if (c.y < 20)
            c.headingTarget = Math.atan2(fs / 2, c.x - fs / 2);
          else if (c.y > fs - 20)
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
            const childSpeed = cfg.mutateSpeed
              ? mutateTrait(c.speed)
              : c.speed;
            const childSize = cfg.mutateSize
              ? mutateTrait(c.size)
              : c.size;
            const childSense = cfg.mutateSense
              ? mutateTrait(c.sense)
              : c.sense;

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
          setIsRunning(false);
        }
      }

      setTickInDay(tickInDayRef.current);
      setCurrentCreatures([...creaturesRef.current]);
      setRenderTrigger((r) => r + 1);
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
      // Map speed to hue: blue (slow, 0.2) -> yellow (1.0) -> red (fast, 2.5+)
      const t = clamp((creature.speed - 0.2) / 2.3, 0, 1);
      const hue = (1 - t) * 200 + t * 0; // 200=blue -> 0=red
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
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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

          <div className="grid grid-cols-3 gap-3">
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
      initialPopulation: 50,
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
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="w-full rounded-xl border border-gray-200"
                style={{ imageRendering: "auto" }}
              />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  Day {day}, tick {tickInDay}/{dayLength}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  Food: {foods.current.filter((f) => !f.eaten).length}
                </span>
              </div>
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
          <div className="grid grid-cols-3 gap-4">
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
          </div>

          {/* Observation */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200">
            <p className="text-sm text-teal-700">
              <strong>What to watch for:</strong> The population starts at 50
              creatures with 100 food. It should expand over the first few days
              and then level off. The population starts below carrying capacity,
              but once it expands, the creatures really have to compete with each
              other for food.
            </p>
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

        <div className="h-8"></div>
      </div>
    </div>
  );
}
