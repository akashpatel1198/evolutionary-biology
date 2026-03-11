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

export default function Page1() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birthRate, setBirthRate] = useState(0.1);
  const [deathRate, setDeathRate] = useState(0.02);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const nextIdRef = useRef(0);

  const equilibrium = deathRate > 0 ? birthRate / deathRate : Infinity;

  const spawnEntity = useCallback((): Entity => {
    return {
      id: nextIdRef.current++,
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
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

        // Spontaneous birth: B is probability of one new entity spawning
        if (Math.random() < birthRate) {
          newEntities.push(spawnEntity());
        }

        // Death: each entity has D probability of dying
        newEntities = newEntities.filter(() => Math.random() >= deathRate);

        return newEntities;
      });

      setTick((t) => t + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, birthRate, deathRate, spawnEntity]);

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

    // Clear
    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
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

    // Draw entities
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
            1. Why Do Things Exist?
          </h1>
          <p className="text-emerald-700 text-lg max-w-3xl">
            Before modeling evolution, we need to answer a more fundamental question:{" "}
            <strong>why does anything persist?</strong> Something exists if it was
            created and hasn&apos;t been destroyed. This simulation establishes the
            mathematical foundation for population dynamics.
          </p>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Canvas and controls */}
          <div className="space-y-6">
            {/* Canvas */}
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
                  max="0.5"
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
            </div>
          </div>

          {/* Right: Chart and stats */}
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-emerald-900 text-lg mb-4">
                Population Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                  <XAxis
                    dataKey="tick"
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #d1fae5",
                      borderRadius: "8px",
                    }}
                  />
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

            {/* Stats and formula */}
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
    if random() < D:
        population -= 1`}
                  </pre>
                </div>

                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-700 mb-2">Equilibrium prediction:</p>
                  <p className="text-2xl font-mono text-amber-900 text-center">
                    N* = B / D = {birthRate.toFixed(2)} / {deathRate.toFixed(3)} ={" "}
                    <strong>{equilibrium.toFixed(1)}</strong>
                  </p>
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    At equilibrium, births equal deaths: B = N × D
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
                    <p className="text-sm text-gray-500">Tick</p>
                    <p className="text-3xl font-bold text-gray-700">{tick}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div className="bg-emerald-900 text-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-lg mb-2">💡 Key Insight</h3>
              <p className="text-emerald-100">
                Even without reproduction, populations stabilize around a predictable
                equilibrium determined solely by creation and destruction rates. Watch
                how the population oscillates around the yellow dashed line (N* = B/D).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
