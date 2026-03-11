"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface Entity {
  id: number;
  x: number;
  y: number;
  hasFood: boolean;
}

interface Food {
  id: number;
  x: number;
  y: number;
}

interface HistoryPoint {
  tick: number;
  population: number;
  food: number;
}

const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 5;
const FOOD_RADIUS = 3;
const MAX_ENTITIES = 400;
const EAT_DISTANCE = 15;

export default function Page4() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [carryingCapacity, setCarryingCapacity] = useState(100);
  const [replicationRate, setReplicationRate] = useState(0.03);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [food, setFood] = useState<Food[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [dayTick, setDayTick] = useState(0);
  const nextEntityIdRef = useRef(0);
  const nextFoodIdRef = useRef(0);

  const DAY_LENGTH = 50; // ticks per day

  const spawnEntity = useCallback((nearX?: number, nearY?: number): Entity => {
    const x = nearX !== undefined 
      ? Math.max(0, Math.min(CANVAS_SIZE, nearX + (Math.random() - 0.5) * 40))
      : Math.random() * CANVAS_SIZE;
    const y = nearY !== undefined
      ? Math.max(0, Math.min(CANVAS_SIZE, nearY + (Math.random() - 0.5) * 40))
      : Math.random() * CANVAS_SIZE;
    return {
      id: nextEntityIdRef.current++,
      x,
      y,
      hasFood: false,
    };
  }, []);

  const spawnFood = useCallback((): Food => {
    return {
      id: nextFoodIdRef.current++,
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
    };
  }, []);

  const reset = useCallback(() => {
    // Start with a small population
    const initialPop: Entity[] = [];
    for (let i = 0; i < 5; i++) {
      initialPop.push(spawnEntity());
    }
    setEntities(initialPop);
    setFood([]);
    setHistory([]);
    setTick(0);
    setDayTick(0);
    nextEntityIdRef.current = initialPop.length;
    nextFoodIdRef.current = 0;
  }, [spawnEntity]);

  // Initialize on first render
  useEffect(() => {
    if (entities.length === 0 && tick === 0) {
      reset();
    }
  }, [entities.length, tick, reset]);

  // Simulation tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setDayTick((dt) => {
        const newDayTick = (dt + 1) % DAY_LENGTH;
        
        // Start of new day: spawn food and reset entity food status
        if (newDayTick === 0) {
          setFood(() => {
            const newFood: Food[] = [];
            for (let i = 0; i < carryingCapacity; i++) {
              newFood.push(spawnFood());
            }
            return newFood;
          });
          
          // Process day end: selection and reproduction
          setEntities((prev) => {
            const nextGen: Entity[] = [];
            
            for (const entity of prev) {
              if (entity.hasFood) {
                // Survives
                nextGen.push({ ...entity, hasFood: false });
                
                // Might reproduce
                if (Math.random() < replicationRate && nextGen.length < MAX_ENTITIES) {
                  nextGen.push(spawnEntity(entity.x, entity.y));
                }
              }
              // Entities without food die (not added to nextGen)
            }
            
            // If everyone died, add a few to restart
            if (nextGen.length === 0) {
              for (let i = 0; i < 3; i++) {
                nextGen.push(spawnEntity());
              }
            }
            
            return nextGen;
          });
        }
        
        return newDayTick;
      });

      // During the day: entities move and try to eat
      setEntities((prevEntities) => {
        return prevEntities.map((entity) => {
          if (entity.hasFood) {
            // Already has food, just wander
            return {
              ...entity,
              x: Math.max(0, Math.min(CANVAS_SIZE, entity.x + (Math.random() - 0.5) * 4)),
              y: Math.max(0, Math.min(CANVAS_SIZE, entity.y + (Math.random() - 0.5) * 4)),
            };
          }
          
          // Move toward nearest food or wander
          return {
            ...entity,
            x: Math.max(0, Math.min(CANVAS_SIZE, entity.x + (Math.random() - 0.5) * 8)),
            y: Math.max(0, Math.min(CANVAS_SIZE, entity.y + (Math.random() - 0.5) * 8)),
          };
        });
      });

      // Check for eating
      setFood((prevFood) => {
        const remainingFood = [...prevFood];
        
        setEntities((prevEntities) => {
          return prevEntities.map((entity) => {
            if (entity.hasFood) return entity;
            
            // Find nearby food
            const foodIndex = remainingFood.findIndex((f) => {
              const dx = entity.x - f.x;
              const dy = entity.y - f.y;
              return Math.sqrt(dx * dx + dy * dy) < EAT_DISTANCE;
            });
            
            if (foodIndex !== -1) {
              remainingFood.splice(foodIndex, 1);
              return { ...entity, hasFood: true };
            }
            
            return entity;
          });
        });
        
        return remainingFood;
      });

      setTick((t) => t + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, carryingCapacity, replicationRate, spawnEntity, spawnFood]);

  // Record history (only on tick changes)
  const prevTickRef = useRef(-1);
  useEffect(() => {
    if (tick === prevTickRef.current) return;
    prevTickRef.current = tick;
    
    if (tick === 0) return;
    
    setHistory((prev) => {
      const newHistory = [...prev, { 
        tick, 
        population: entities.length,
        food: food.length,
      }];
      if (newHistory.length > 300) {
        return newHistory.slice(-300);
      }
      return newHistory;
    });
  }, [tick, entities.length, food.length]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#fefce8";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    // Draw food
    food.forEach((f) => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, FOOD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#84cc16";
      ctx.fill();
    });

    // Draw entities
    entities.forEach((entity) => {
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = entity.hasFood ? "#059669" : "#dc2626";
      ctx.fill();
      ctx.strokeStyle = entity.hasFood ? "#047857" : "#b91c1c";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [entities, food]);

  const fedCount = entities.filter(e => e.hasFood).length;
  const hungryCount = entities.length - fedCount;
  const dayProgress = (dayTick / DAY_LENGTH) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-yellow-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
              Chapter 4
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Competition and Carrying Capacity
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Resources are <span className="text-amber-700 font-medium">finite</span>.
            When populations exceed what the environment can support, competition
            limits growth — producing the famous{" "}
            <span className="text-amber-700 font-medium">S-curve</span>.
          </p>
        </section>

        {/* Simulation Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100/50 border border-amber-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-100/50 hover:border-amber-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-amber-100 text-sm">
                Watch creatures compete for limited food
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="border-2 border-amber-200 rounded-xl shadow-inner"
                />
              </div>

              {/* Day progress bar */}
              <div>
                <div className="flex justify-between text-sm text-amber-700 mb-2">
                  <span className="font-medium">Day progress</span>
                  <span className="font-mono">
                    Tick {dayTick}/{DAY_LENGTH}
                  </span>
                </div>
                <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
                    style={{ width: `${dayProgress}%` }}
                  />
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                  Food
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                  Fed
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  Hungry
                </span>
              </div>

              {/* Inline Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    isRunning
                      ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
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

              {/* Parameter Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Carrying Capacity (K)</span>
                    <span className="font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {carryingCapacity}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="10"
                    value={carryingCapacity}
                    onChange={(e) => setCarryingCapacity(parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-500">Food spawned per day</p>
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Reproduction Rate</span>
                    <span className="font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {(replicationRate * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={replicationRate}
                    onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-500">Chance when fed</p>
                </div>
              </div>

              {/* Live Status */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600">Fed</p>
                  <p className="text-2xl font-bold text-emerald-700">{fedCount}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 text-center border border-red-100">
                  <p className="text-xs font-medium text-red-600">Hungry</p>
                  <p className="text-2xl font-bold text-red-700">{hungryCount}</p>
                </div>
                <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-xl p-3 text-center border border-lime-100">
                  <p className="text-xs font-medium text-lime-600">Food</p>
                  <p className="text-2xl font-bold text-lime-700">{food.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Population Chart Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100/50 border border-amber-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-100/50 hover:border-amber-200">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Population Over Time
              </h2>
              <p className="text-emerald-100 text-sm">
                Watch the S-curve of logistic growth
              </p>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <ReferenceLine
                    y={carryingCapacity}
                    stroke="#f59e0b"
                    strokeDasharray="8 4"
                    strokeWidth={2}
                    label={{
                      value: `K = ${carryingCapacity}`,
                      fill: "#f59e0b",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="population"
                    stroke="#059669"
                    fill="url(#populationGradient)"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  <defs>
                    <linearGradient
                      id="populationGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>

              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Population</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    {entities.length}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">% of K</p>
                  <p className="text-4xl font-bold text-amber-600">
                    {((entities.length / carryingCapacity) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Model Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100/50 border border-amber-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-100/50 hover:border-amber-200">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">The Model</h2>
              <p className="text-violet-100 text-sm">
                Resource competition and logistic growth
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <p className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Day Cycle
                </p>
                <pre className="text-sm font-mono text-amber-900 whitespace-pre-wrap leading-relaxed">
                  {`1. Spawn K food items
2. Creatures forage for food
3. At day's end:
   - Fed creatures survive
   - Fed creatures may reproduce
   - Hungry creatures die`}
                </pre>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Logistic Growth Equation
                </p>
                <div className="text-center py-3">
                  <p className="text-2xl font-mono text-emerald-900">
                    dN/dt = r × N × (1 - N/K)
                  </p>
                </div>
                <p className="text-sm text-emerald-600 text-center">
                  Growth rate slows as N approaches K
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Insight Card */}
        <section>
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl shadow-lg shadow-emerald-200/50 overflow-hidden">
            <div className="p-8">
              <div className="flex items-start gap-4">
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
                  <h2 className="text-white font-bold text-xl mb-3">Key Insight</h2>
                  <p className="text-emerald-100 text-lg leading-relaxed">
                    Competition for limited resources creates an upper bound on
                    population. Watch the <strong>S-curve</strong>: population grows
                    rapidly when small, then slows as it approaches K (carrying
                    capacity). Near K, births ≈ deaths.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-8"></div>
      </div>
    </div>
  );
}
