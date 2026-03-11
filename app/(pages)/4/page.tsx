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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            4. Competition and Carrying Capacity
          </h1>
          <p className="text-amber-700 text-lg max-w-3xl">
            Resources are <strong>finite</strong>. When populations exceed what the environment 
            can support, competition limits growth. This produces the famous <strong>S-curve</strong> 
            (logistic growth) seen in real populations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Canvas and controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="border border-amber-200 rounded-lg mx-auto block"
              />
              
              {/* Day progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-sm text-amber-700 mb-1">
                  <span>Day progress</span>
                  <span>Tick {dayTick}/{DAY_LENGTH}</span>
                </div>
                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-100"
                    style={{ width: `${dayProgress}%` }}
                  />
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-6 text-sm text-slate-600">
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

              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {isRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="font-semibold text-amber-900 text-lg">Parameters</h3>
              
              <div>
                <label className="flex justify-between text-sm text-amber-700 mb-1">
                  <span>Carrying Capacity (K)</span>
                  <span className="font-mono">{carryingCapacity}</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={carryingCapacity}
                  onChange={(e) => setCarryingCapacity(parseInt(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Food spawned per day (maximum sustainable population)
                </p>
              </div>

              <div>
                <label className="flex justify-between text-sm text-amber-700 mb-1">
                  <span>Reproduction Rate</span>
                  <span className="font-mono">{(replicationRate * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={replicationRate}
                  onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                  className="w-full accent-amber-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Chance of reproducing when fed (per day)
                </p>
              </div>

              {/* Status */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-emerald-600">Fed</p>
                  <p className="text-xl font-bold text-emerald-700">{fedCount}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-red-600">Hungry</p>
                  <p className="text-xl font-bold text-red-700">{hungryCount}</p>
                </div>
                <div className="bg-lime-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-lime-600">Food</p>
                  <p className="text-xl font-bold text-lime-700">{food.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chart and stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-amber-900 text-lg mb-4">
                Population Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fef08a" />
                  <XAxis dataKey="tick" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #fef08a",
                      borderRadius: "8px",
                    }}
                  />
                  <ReferenceLine
                    y={carryingCapacity}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{
                      value: `K = ${carryingCapacity}`,
                      fill: "#f59e0b",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="population"
                    stroke="#059669"
                    fill="#d1fae5"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-amber-900 text-lg mb-4">
                The Model
              </h3>
              
              <div className="space-y-4">
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-700 mb-2">Day cycle:</p>
                  <pre className="text-sm font-mono text-amber-900 whitespace-pre-wrap">
{`1. Spawn K food items
2. Creatures forage for food
3. At day's end:
   - Fed creatures survive
   - Fed creatures may reproduce
   - Hungry creatures die`}
                  </pre>
                </div>

                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-sm text-emerald-700 mb-2">Logistic growth equation:</p>
                  <p className="text-xl font-mono text-emerald-900 text-center">
                    dN/dt = r × N × (1 - N/K)
                  </p>
                  <p className="text-xs text-emerald-600 mt-2 text-center">
                    Growth rate slows as N approaches K
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Population</p>
                    <p className="text-3xl font-bold text-emerald-700">{entities.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">% of K</p>
                    <p className="text-3xl font-bold text-amber-700">
                      {((entities.length / carryingCapacity) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-900 text-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-lg mb-2">💡 Key Insight</h3>
              <p className="text-amber-100">
                Competition for limited resources creates an upper bound on population. 
                Watch the <strong>S-curve</strong>: population grows rapidly when small, 
                then slows as it approaches K (carrying capacity). Near K, births ≈ deaths.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
