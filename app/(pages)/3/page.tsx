"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";

interface Entity {
  id: number;
  x: number;
  y: number;
  trait: number; // heritable trait value (0-1 range, affects color)
}

interface HistoryPoint {
  tick: number;
  population: number;
  avgTrait: number;
  minTrait: number;
  maxTrait: number;
}

const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 6;
const MAX_ENTITIES = 300;

// Box-Muller transform for gaussian random
function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

// Map trait value to color (blue = low, green = mid, yellow = high)
function traitToColor(trait: number): string {
  const clamped = Math.max(0, Math.min(1, trait));
  const hue = 120 + (clamped - 0.5) * 120; // 60 (yellow) to 180 (cyan)
  return `hsl(${hue}, 70%, 45%)`;
}

export default function Page3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birthRate, setBirthRate] = useState(0.03);
  const [deathRate, setDeathRate] = useState(0.02);
  const [replicationRate, setReplicationRate] = useState(0.018);
  const [mutationRate, setMutationRate] = useState(0.05);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const nextIdRef = useRef(0);

  const avgTrait = entities.length > 0 
    ? entities.reduce((sum, e) => sum + e.trait, 0) / entities.length 
    : 0.5;

  const traitStdDev = entities.length > 1
    ? Math.sqrt(entities.reduce((sum, e) => sum + Math.pow(e.trait - avgTrait, 2), 0) / entities.length)
    : 0;

  const spawnEntity = useCallback((parentTrait?: number, nearX?: number, nearY?: number): Entity => {
    let trait: number;
    if (parentTrait !== undefined) {
      // Offspring inherits with mutation
      trait = parentTrait + gaussianRandom(0, mutationRate);
      trait = Math.max(0, Math.min(1, trait)); // clamp to 0-1
    } else {
      // Spontaneous creation: random trait
      trait = Math.random();
    }

    const x = nearX !== undefined 
      ? Math.max(0, Math.min(CANVAS_SIZE, nearX + (Math.random() - 0.5) * 30))
      : Math.random() * CANVAS_SIZE;
    const y = nearY !== undefined
      ? Math.max(0, Math.min(CANVAS_SIZE, nearY + (Math.random() - 0.5) * 30))
      : Math.random() * CANVAS_SIZE;

    return {
      id: nextIdRef.current++,
      x,
      y,
      trait,
    };
  }, [mutationRate]);

  const reset = useCallback(() => {
    setEntities([]);
    setHistory([]);
    setTick(0);
    nextIdRef.current = 0;
  }, []);

  // Simulation tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setEntities((prev) => {
        let newEntities = [...prev];
        const toAdd: Entity[] = [];

        // Spontaneous birth (random trait)
        if (Math.random() < birthRate) {
          toAdd.push(spawnEntity());
        }

        // Process each entity
        newEntities = newEntities.filter((entity) => {
          // Replication with inherited (mutated) trait
          if (Math.random() < replicationRate && newEntities.length + toAdd.length < MAX_ENTITIES) {
            toAdd.push(spawnEntity(entity.trait, entity.x, entity.y));
          }
          
          return Math.random() >= deathRate;
        });

        return [...newEntities, ...toAdd];
      });

      setTick((t) => t + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, birthRate, deathRate, replicationRate, spawnEntity]);

  // Record history (only on tick changes)
  const prevTickRef = useRef(-1);
  useEffect(() => {
    if (tick === prevTickRef.current) return;
    prevTickRef.current = tick;
    
    if (tick === 0) return;
    
    const traits = entities.map(e => e.trait);
    const avg = traits.length > 0 ? traits.reduce((a, b) => a + b, 0) / traits.length : 0.5;
    const min = traits.length > 0 ? Math.min(...traits) : 0;
    const max = traits.length > 0 ? Math.max(...traits) : 1;
    
    setHistory((prev) => {
      const newHistory = [...prev, { 
        tick, 
        population: entities.length,
        avgTrait: avg,
        minTrait: min,
        maxTrait: max,
      }];
      if (newHistory.length > 200) {
        return newHistory.slice(-200);
      }
      return newHistory;
    });
  }, [tick, entities]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#e2e8f0";
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

    // Draw entities with trait-based colors
    entities.forEach((entity) => {
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = traitToColor(entity.trait);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [entities]);

  // Trait distribution data for scatter
  const traitDistribution = entities.map((e, i) => ({
    x: e.trait,
    y: Math.random() * 0.8 + 0.1, // jitter for visibility
    trait: e.trait,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Chapter 3
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Mutations and Variation
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Imperfect replication creates{" "}
            <span className="text-purple-700 font-medium">variation</span>. Mutations
            introduce heritable differences between individuals — the raw material for
            natural selection.
          </p>
        </section>

        {/* Simulation Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-blue-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-blue-100 text-sm">
                Watch traits drift and spread across generations
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="border-2 border-slate-200 rounded-xl shadow-inner"
                />
              </div>

              {/* Color legend */}
              <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                <span>Trait value:</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: traitToColor(0) }}
                  ></div>
                  <span>Low</span>
                </div>
                <div
                  className="w-20 h-3 rounded"
                  style={{
                    background: `linear-gradient(to right, ${traitToColor(0)}, ${traitToColor(0.5)}, ${traitToColor(1)})`,
                  }}
                ></div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: traitToColor(1) }}
                  ></div>
                  <span>High</span>
                </div>
              </div>

              {/* Inline Controls */}
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
              </div>

              {/* Parameter Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Birth (B)</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {birthRate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.005"
                    value={birthRate}
                    onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Death (D)</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {deathRate.toFixed(3)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.005"
                    max="0.05"
                    step="0.001"
                    value={deathRate}
                    onChange={(e) => setDeathRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Replication (R)</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {replicationRate.toFixed(3)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.04"
                    step="0.001"
                    value={replicationRate}
                    onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Mutation (σ)</span>
                    <span className="font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                      {mutationRate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={mutationRate}
                    onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Mutation rate (σ) is the standard deviation of Gaussian noise added to
                offspring traits.
              </p>
            </div>
          </div>
        </section>

        {/* Trait Distribution Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">Trait Distribution</h2>
              <p className="text-purple-100 text-sm">
                Current spread of trait values in the population
              </p>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={140}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, 1]}
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <YAxis type="number" dataKey="y" domain={[0, 1]} hide />
                  <Scatter data={traitDistribution}>
                    {traitDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={traitToColor(entry.trait)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Mean Trait</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {avgTrait.toFixed(3)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Std Dev</p>
                  <p className="text-3xl font-bold text-slate-600">
                    {traitStdDev.toFixed(3)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Population & Trait Over Time Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-blue-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-200">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Population & Trait Over Time
              </h2>
              <p className="text-blue-100 text-sm">
                Track population size and average trait value
              </p>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" stroke="#9ca3af" fontSize={12} />
                  <YAxis yAxisId="pop" stroke="#3b82f6" fontSize={12} />
                  <YAxis
                    yAxisId="trait"
                    orientation="right"
                    domain={[0, 1]}
                    stroke="#8b5cf6"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    yAxisId="pop"
                    type="monotone"
                    dataKey="population"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="trait"
                    type="monotone"
                    dataKey="avgTrait"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-gray-100">
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Population
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  Avg Trait
                </span>
              </div>

              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Population</p>
                  <p className="text-4xl font-bold text-blue-600">{entities.length}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Tick</p>
                  <p className="text-4xl font-bold text-gray-700">{tick}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Model Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">The Model</h2>
              <p className="text-violet-100 text-sm">
                Inheritance with imperfect copying
              </p>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <p className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  Reproduction with Mutation
                </p>
                <pre className="text-sm font-mono text-purple-900 whitespace-pre-wrap leading-relaxed">
                  {`offspring.trait = parent.trait 
                + gaussian(0, σ)`}
                </pre>
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
                    Mutations create a <strong>distribution</strong> of trait values.
                    Without selection pressure, traits drift randomly — the mean wanders
                    and variance grows. This variation is essential: without differences,
                    there&apos;s nothing for selection to act on.
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
