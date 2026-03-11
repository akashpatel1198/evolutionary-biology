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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            3. Mutations and Variation
          </h1>
          <p className="text-slate-700 text-lg max-w-3xl">
            Imperfect replication creates <strong>variation</strong>. Mutations introduce 
            heritable differences between individuals. Watch how the trait distribution 
            spreads out over generations — this variation is the raw material for natural selection.
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
                className="border border-slate-200 rounded-lg mx-auto block"
              />
              
              {/* Color legend */}
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600">
                <span>Trait value:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: traitToColor(0) }}></div>
                  <span>Low</span>
                </div>
                <div className="w-16 h-3 rounded" style={{ 
                  background: `linear-gradient(to right, ${traitToColor(0)}, ${traitToColor(0.5)}, ${traitToColor(1)})`
                }}></div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: traitToColor(1) }}></div>
                  <span>High</span>
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
              <h3 className="font-semibold text-slate-900 text-lg">Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>Birth (B)</span>
                    <span className="font-mono">{birthRate.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.005"
                    value={birthRate}
                    onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>Death (D)</span>
                    <span className="font-mono">{deathRate.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.005"
                    max="0.05"
                    step="0.001"
                    value={deathRate}
                    onChange={(e) => setDeathRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>Replication (R)</span>
                    <span className="font-mono">{replicationRate.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.04"
                    step="0.001"
                    value={replicationRate}
                    onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>Mutation (σ)</span>
                    <span className="font-mono">{mutationRate.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={mutationRate}
                    onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Mutation rate (σ) is the standard deviation of Gaussian noise added to offspring traits.
              </p>
            </div>
          </div>

          {/* Right: Charts and stats */}
          <div className="space-y-6">
            {/* Trait distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 text-lg mb-4">
                Trait Distribution
              </h3>
              <ResponsiveContainer width="100%" height={120}>
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
              <div className="flex justify-between text-sm text-slate-600 mt-2">
                <span>Mean: <strong>{avgTrait.toFixed(3)}</strong></span>
                <span>Std Dev: <strong>{traitStdDev.toFixed(3)}</strong></span>
              </div>
            </div>

            {/* Population chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 text-lg mb-4">
                Population & Trait Over Time
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="tick" stroke="#6b7280" fontSize={12} />
                  <YAxis yAxisId="pop" stroke="#6b7280" fontSize={12} />
                  <YAxis yAxisId="trait" orientation="right" domain={[0, 1]} stroke="#8b5cf6" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    yAxisId="pop"
                    type="monotone"
                    dataKey="population"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="trait"
                    type="monotone"
                    dataKey="avgTrait"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 text-sm mt-2">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Population
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  Avg Trait
                </span>
              </div>
            </div>

            {/* Model explanation */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 text-lg mb-4">
                The Model
              </h3>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700 mb-2">Reproduction with mutation:</p>
                <pre className="text-sm font-mono text-purple-900 whitespace-pre-wrap">
{`offspring.trait = parent.trait 
                + gaussian(0, σ)`}
                </pre>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Population</p>
                  <p className="text-2xl font-bold text-blue-600">{entities.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Tick</p>
                  <p className="text-2xl font-bold text-gray-700">{tick}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-lg mb-2">💡 Key Insight</h3>
              <p className="text-slate-200">
                Mutations create a <strong>distribution</strong> of trait values. Without 
                selection pressure, traits drift randomly — the mean wanders and variance 
                grows. This variation is essential: without differences, there&apos;s nothing 
                for selection to act on.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
