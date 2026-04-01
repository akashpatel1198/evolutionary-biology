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
  Legend,
} from "recharts";

interface Entity {
  id: number;
  x: number;
  y: number;
}

interface HistoryPoint {
  tick: number;
  [key: string]: number;
}

interface Simulation {
  id: string;
  color: string;
  entities: Entity[];
  nextEntityId: number;
}

const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 6;
const MAX_TICKS = 10000;
const MAX_SIMULATIONS = 10;
const MAX_HISTORY_POINTS = 500;

const COLORS = [
  "#059669", "#2563eb", "#dc2626", "#7c3aed", "#ea580c",
  "#0891b2", "#be185d", "#65a30d", "#ca8a04", "#6366f1",
  "#14b8a6", "#f43f5e", "#8b5cf6", "#06b6d4", "#d946ef",
  "#84cc16", "#f97316", "#ec4899", "#10b981", "#3b82f6",
];

export default function Page1() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Shared parameters for all simulations
  const [birthRate, setBirthRate] = useState(0.1);
  const [deathRate, setDeathRate] = useState(0.02);
  
  const [simulations, setSimulations] = useState<Simulation[]>([
    {
      id: "sim-0",
      color: COLORS[0],
      entities: [],
      nextEntityId: 0,
    },
  ]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const equilibrium = deathRate > 0 ? birthRate / deathRate : Infinity;

  const addSimulation = useCallback(() => {
    if (simulations.length >= MAX_SIMULATIONS) return;
    setSimulations((prev) => {
      const newIndex = prev.length;
      return [
        ...prev,
        {
          id: `sim-${newIndex}`,
          color: COLORS[newIndex % COLORS.length],
          entities: [],
          nextEntityId: 0,
        },
      ];
    });
  }, [simulations.length]);

  const removeSimulation = useCallback((id: string) => {
    setSimulations((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      // Reassign IDs and colors based on new positions
      return filtered.map((s, index) => ({
        ...s,
        id: `sim-${index}`,
        color: COLORS[index % COLORS.length],
      }));
    });
    // Clear history since simulation IDs changed
    setHistory([]);
  }, []);

  const reset = useCallback(() => {
    setSimulations((prev) =>
      prev.map((s) => ({ ...s, entities: [], nextEntityId: 0 }))
    );
    setHistory([]);
    setTick(0);
  }, []);

  const spawnEntity = (nextId: number): Entity => {
    return {
      id: nextId,
      x: Math.random() * CANVAS_SIZE,
      y: Math.random() * CANVAS_SIZE,
    };
  };

  useEffect(() => {
    if (!isRunning) return;
    if (tick >= MAX_TICKS) {
      setIsRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setTick((t) => {
        if (t >= MAX_TICKS) {
          setIsRunning(false);
          return t;
        }
        return t + 1;
      });

      setSimulations((prev) =>
        prev.map((sim) => {
          let newEntities = [...sim.entities];
          let nextId = sim.nextEntityId;

          if (Math.random() < birthRate) {
            newEntities.push(spawnEntity(nextId++));
          }

          newEntities = newEntities.filter(() => Math.random() >= deathRate);

          return { ...sim, entities: newEntities, nextEntityId: nextId };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, tick, birthRate, deathRate]);

  const prevTickRef = useRef(-1);
  useEffect(() => {
    if (tick === prevTickRef.current) return;
    prevTickRef.current = tick;
    if (tick === 0) return;

    setHistory((prev) => {
      const newPoint: HistoryPoint = { tick };
      simulations.forEach((sim) => {
        newPoint[sim.id] = sim.entities.length;
      });
      const newHistory = [...prev, newPoint];
      if (newHistory.length > MAX_HISTORY_POINTS) {
        return newHistory.slice(-MAX_HISTORY_POINTS);
      }
      return newHistory;
    });
  }, [tick, simulations]);

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

    simulations.forEach((sim) => {
      sim.entities.forEach((entity) => {
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, ENTITY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = sim.color;
        ctx.fill();
        ctx.strokeStyle = sim.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
  }, [simulations]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Chapter 1
            </span>
            <a
              href="https://www.youtube.com/watch?v=oDvzbBRiNlA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Watch Video
            </a>
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
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-emerald-100 text-sm">
                Watch entities spontaneously appear and disappear
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Chart */}
              <ResponsiveContainer width="100%" height={300}>
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
                  <Legend />
                  {equilibrium < 10000 && (
                    <ReferenceLine
                      y={equilibrium}
                      stroke="#f59e0b"
                      strokeDasharray="8 4"
                      strokeWidth={2}
                      label={{
                        value: `N* = ${equilibrium.toFixed(1)}`,
                        fill: "#f59e0b",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  {simulations.map((sim, index) => (
                    <Line
                      key={sim.id}
                      type="monotone"
                      dataKey={sim.id}
                      name={`Run ${index + 1}`}
                      stroke={sim.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Simulation Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {simulations.map((sim, index) => (
                  <div
                    key={sim.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                    style={{ 
                      borderColor: sim.color,
                      backgroundColor: sim.color + "10"
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sim.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Run {index + 1}: {sim.entities.length}
                    </span>
                    {simulations.length > 1 && (
                      <button
                        onClick={() => removeSimulation(sim.id)}
                        className="ml-1 p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Remove"
                        aria-label="Remove simulation"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Tick</p>
                  <p className="text-3xl font-bold text-gray-700 tabular-nums">{tick}</p>
                  <p className="text-xs text-gray-400 mt-1 tabular-nums">/ {MAX_TICKS.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Population</p>
                  <p className="text-3xl font-bold text-emerald-600 tabular-nums">
                    {simulations.reduce((sum, s) => sum + s.entities.length, 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Avg Population</p>
                  <p className="text-3xl font-bold text-blue-600 tabular-nums">
                    {simulations.length > 0
                      ? (simulations.reduce((sum, s) => sum + s.entities.length, 0) / simulations.length).toFixed(1)
                      : "0"}
                  </p>
                </div>
              </div>

              {/* Regime Indicator */}
              <div
                className={`rounded-xl p-4 ${
                  deathRate === 0
                    ? "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
                    : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    deathRate === 0 ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {deathRate === 0
                    ? "Unbounded growth (D = 0)"
                    : "Equilibrium regime (D > 0)"}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    deathRate === 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {deathRate === 0
                    ? "Population will grow without bound!"
                    : `Population will stabilize around N* = ${equilibrium.toFixed(1)}`}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={tick >= MAX_TICKS}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRunning
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  }`}
                >
                  {tick >= MAX_TICKS ? "Finished" : isRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Reset
                </button>
                <button
                  onClick={addSimulation}
                  disabled={simulations.length >= MAX_SIMULATIONS}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Run
                </button>
              </div>

              {/* Shared Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    max="1"
                    step="0.01"
                    value={birthRate}
                    onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    aria-label="Birth rate"
                  />
                  <p className="text-xs text-gray-500">
                    Probability of creation per tick
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Death Rate (D)</span>
                    <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      {deathRate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={deathRate}
                    onChange={(e) => setDeathRate(parseFloat(e.target.value))}
                    className="w-full accent-red-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    aria-label="Death rate"
                  />
                  <p className="text-xs text-gray-500">
                    Probability of destruction per entity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Model Card */}
        <section className="group">
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
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
                    <span className="text-amber-600">{deathRate.toFixed(2)}</span> ={" "}
                    <span className="font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">
                      {equilibrium < 10000 ? equilibrium.toFixed(1) : "∞"}
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
                    aria-hidden="true"
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
                    destruction rates. Add multiple runs to see how randomness
                    causes variation around the equilibrium!
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
