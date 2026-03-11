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

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setEntities((prev) => {
        let newEntities = [...prev];

        if (Math.random() < birthRate) {
          newEntities.push(spawnEntity());
        }

        newEntities = newEntities.filter(() => Math.random() >= deathRate);

        return newEntities;
      });

      setTick((t) => t + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, birthRate, deathRate, spawnEntity]);

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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Chapter 1
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Why Do Things Exist?
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Before modeling evolution, we need to answer a more fundamental question:{" "}
            <span className="text-emerald-700 font-medium">
              why does anything persist?
            </span>{" "}
            Something exists if it was created and hasn&apos;t been destroyed.
          </p>
        </section>

        {/* Simulation Card */}
        <section className="group">
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-200">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-emerald-100 text-sm">
                Watch entities spontaneously appear and disappear
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  className="border-2 border-emerald-200 rounded-xl shadow-inner"
                />
              </div>

              {/* Inline Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    isRunning
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
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
                    <span>Birth Rate (B)</span>
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {birthRate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={birthRate}
                    onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-500">
                    Probability of creation per tick
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Death Rate (D)</span>
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {deathRate.toFixed(3)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.1"
                    step="0.001"
                    value={deathRate}
                    onChange={(e) => setDeathRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-500">
                    Probability of destruction per entity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Population Chart Card */}
        <section className="group">
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Population Over Time
              </h2>
              <p className="text-blue-100 text-sm">
                Track how the population fluctuates around equilibrium
              </p>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="tick"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(v) => `${v}`}
                  />
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
                    y={equilibrium}
                    stroke="#f59e0b"
                    strokeDasharray="8 4"
                    strokeWidth={2}
                    label={{
                      value: `Equilibrium: ${equilibrium.toFixed(1)}`,
                      fill: "#f59e0b",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="population"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Live Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Current Population
                  </p>
                  <p className="text-4xl font-bold text-emerald-600">
                    {entities.length}
                  </p>
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
        <section className="group">
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-200">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">The Model</h2>
              <p className="text-violet-100 text-sm">
                Mathematical foundation of existence dynamics
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-5 border border-slate-200">
                <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  Update Rule (per tick)
                </p>
                <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {`if random() < B:
    population += 1

for each entity:
    if random() < D:
        population -= 1`}
                </pre>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <p className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Equilibrium Prediction
                </p>
                <div className="text-center py-4">
                  <p className="text-3xl font-mono text-amber-900">
                    N* = B / D ={" "}
                    <span className="text-amber-600">{birthRate.toFixed(2)}</span> /{" "}
                    <span className="text-amber-600">{deathRate.toFixed(3)}</span> ={" "}
                    <span className="font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">
                      {equilibrium.toFixed(1)}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-amber-600 text-center mt-2">
                  At equilibrium, births equal deaths: B = N × D
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
                    Even without reproduction, populations stabilize around a
                    predictable equilibrium determined solely by creation and
                    destruction rates. Watch how the population oscillates around the
                    yellow dashed line (N* = B/D).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
