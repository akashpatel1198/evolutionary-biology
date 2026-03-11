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
} from "recharts";

interface Entity {
  id: number;
  x: number;
  y: number;
}

interface HistoryPoint {
  tick: number;
  population: number;
}

const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 6;
const MAX_ENTITIES = 500;

export default function Page2() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birthRate, setBirthRate] = useState(0.05);
  const [deathRate, setDeathRate] = useState(0.02);
  const [replicationRate, setReplicationRate] = useState(0.015);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const nextIdRef = useRef(0);

  // Equilibrium only exists when D > R
  const equilibrium = deathRate > replicationRate 
    ? birthRate / (deathRate - replicationRate) 
    : Infinity;
  
  const isExponential = replicationRate >= deathRate;

  const spawnEntity = useCallback((nearX?: number, nearY?: number): Entity => {
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
    };
  }, []);

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

        // Spontaneous birth
        if (Math.random() < birthRate) {
          toAdd.push(spawnEntity());
        }

        // Process each entity
        newEntities = newEntities.filter((entity) => {
          // Replication: entity might reproduce
          if (Math.random() < replicationRate && newEntities.length + toAdd.length < MAX_ENTITIES) {
            toAdd.push(spawnEntity(entity.x, entity.y));
          }
          
          // Death check
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
    
    setHistory((prev) => {
      const newHistory = [...prev, { tick, population: entities.length }];
      if (newHistory.length > 200) {
        return newHistory.slice(-200);
      }
      return newHistory;
    });
  }, [tick, entities.length]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#d1fae5";
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

    entities.forEach((entity) => {
      ctx.beginPath();
      ctx.arc(entity.x, entity.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#059669";
      ctx.fill();
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [entities]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            2. How Life Grows Exponentially
          </h1>
          <p className="text-emerald-700 text-lg max-w-3xl">
            Real organisms don&apos;t appear from nothing — they <strong>reproduce</strong>.
            Adding replication fundamentally changes population dynamics from stable
            equilibrium to potential <strong>exponential growth</strong>.
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
                className="border border-emerald-200 rounded-lg mx-auto block"
              />
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
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
              {entities.length >= MAX_ENTITIES && (
                <p className="text-amber-600 text-sm text-center mt-2">
                  ⚠️ Population capped at {MAX_ENTITIES} for performance
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h3 className="font-semibold text-emerald-900 text-lg">Parameters</h3>
              
              <div>
                <label className="flex justify-between text-sm text-emerald-700 mb-1">
                  <span>Birth Rate (B)</span>
                  <span className="font-mono">{birthRate.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={birthRate}
                  onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Probability of spontaneous creation per tick
                </p>
              </div>

              <div>
                <label className="flex justify-between text-sm text-emerald-700 mb-1">
                  <span>Death Rate (D)</span>
                  <span className="font-mono">{deathRate.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={deathRate}
                  onChange={(e) => setDeathRate(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Probability of destruction per tick per entity
                </p>
              </div>

              <div>
                <label className="flex justify-between text-sm text-emerald-700 mb-1">
                  <span>Replication Rate (R)</span>
                  <span className="font-mono">{replicationRate.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.001"
                  value={replicationRate}
                  onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Probability of reproduction per tick per entity
                </p>
              </div>

              {/* Regime indicator */}
              <div className={`rounded-lg p-3 ${isExponential ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm font-semibold ${isExponential ? 'text-red-700' : 'text-green-700'}`}>
                  {isExponential 
                    ? '🚀 Exponential regime (R ≥ D)' 
                    : '⚖️ Equilibrium regime (D > R)'}
                </p>
                <p className={`text-xs ${isExponential ? 'text-red-600' : 'text-green-600'}`}>
                  {isExponential
                    ? 'Population will grow without bound!'
                    : `Population will stabilize around N* = ${equilibrium.toFixed(1)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Chart and stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-emerald-900 text-lg mb-4">
                Population Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis dataKey="tick" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #d1fae5",
                      borderRadius: "8px",
                    }}
                  />
                  {!isExponential && equilibrium < 1000 && (
                    <ReferenceLine
                      y={equilibrium}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{
                        value: `N* = ${equilibrium.toFixed(1)}`,
                        fill: "#f59e0b",
                        fontSize: 12,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="population"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-emerald-900 text-lg mb-4">
                The Model
              </h3>
              
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-sm text-emerald-700 mb-2">Update rule (per tick):</p>
                  <pre className="text-sm font-mono text-emerald-900 whitespace-pre-wrap">
{`if random() < B:
    population += 1

for each entity:
    if random() < R:
        population += 1  // reproduction!
    if random() < D:
        population -= 1`}
                  </pre>
                </div>

                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-700 mb-2">Equilibrium prediction:</p>
                  <p className="text-xl font-mono text-amber-900 text-center">
                    N* = B / (D - R) = {birthRate.toFixed(2)} / ({deathRate.toFixed(3)} - {replicationRate.toFixed(3)})
                  </p>
                  <p className="text-2xl font-mono text-amber-900 text-center mt-1">
                    = <strong>{isExponential ? '∞ (no equilibrium!)' : equilibrium.toFixed(1)}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Current Population</p>
                    <p className="text-3xl font-bold text-emerald-700">
                      {entities.length}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Net Growth Rate</p>
                    <p className={`text-3xl font-bold ${replicationRate - deathRate >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {((replicationRate - deathRate) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900 text-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-lg mb-2">💡 Key Insight</h3>
              <p className="text-emerald-100">
                Replication breaks the simple equilibrium. When the replication rate 
                exceeds the death rate (R ≥ D), populations explode exponentially. 
                Try adjusting R above D to see the population take off!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
