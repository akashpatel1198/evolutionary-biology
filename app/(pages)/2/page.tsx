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

// Grid-related types kept for future use
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
  population: number;
}

// Grid constants kept for future use
const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 6;

const MAX_TICKS = 10000;
const MAX_SIMULATIONS = 10;
const MAX_HISTORY_POINTS = 500;
const MAX_POPULATION = 999_000_000_000; // 999 billion

const COLORS = [
  "#059669", "#2563eb", "#dc2626", "#7c3aed", "#ea580c",
  "#0891b2", "#be185d", "#65a30d", "#ca8a04", "#6366f1",
  "#14b8a6", "#f43f5e", "#8b5cf6", "#06b6d4", "#d946ef",
  "#84cc16", "#f97316", "#ec4899", "#10b981", "#3b82f6",
];

export default function Page2() {
  // Grid ref kept for future use
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Shared parameters for all simulations
  const [birthRate, setBirthRate] = useState(0.05);
  const [deathRate, setDeathRate] = useState(0.02);
  const [replicationRate, setReplicationRate] = useState(0.015);
  
  const [simulations, setSimulations] = useState<Simulation[]>([
    {
      id: "sim-0",
      color: COLORS[0],
      population: 0,
    },
  ]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const isExponential = replicationRate >= deathRate;
  const equilibrium = !isExponential && deathRate > replicationRate
    ? birthRate / (deathRate - replicationRate)
    : Infinity;

  const addSimulation = useCallback(() => {
    if (simulations.length >= MAX_SIMULATIONS) return;
    setSimulations((prev) => {
      const newIndex = prev.length;
      return [
        ...prev,
        {
          id: `sim-${newIndex}`,
          color: COLORS[newIndex % COLORS.length],
          population: 0,
        },
      ];
    });
  }, [simulations.length]);

  const removeSimulation = useCallback((id: string) => {
    setSimulations((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, index) => ({
        ...s,
        id: `sim-${index}`,
        color: COLORS[index % COLORS.length],
      }));
    });
    setHistory([]);
  }, []);

  const reset = useCallback(() => {
    setSimulations((prev) =>
      prev.map((s) => ({ ...s, population: 0 }))
    );
    setHistory([]);
    setTick(0);
  }, []);

  // Simulation using statistical model (much faster than tracking individuals)
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
          let pop = sim.population;

          // Spontaneous birth (B chance per tick)
          if (Math.random() < birthRate) {
            pop += 1;
          }

          // For each entity: replication and death
          // Using binomial approximation for large populations
          if (pop > 0) {
            // Expected replications: pop * R
            // Expected deaths: pop * D
            // We sample from binomial distributions
            const replications = binomialSample(pop, replicationRate);
            const deaths = binomialSample(pop, deathRate);
            pop = Math.max(0, pop + replications - deaths);
          }

          // Cap at 999 billion
          pop = Math.min(pop, MAX_POPULATION);

          return { ...sim, population: pop };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, tick, birthRate, deathRate, replicationRate]);

  // Binomial sampling for realistic stochastic simulation
  function binomialSample(n: number, p: number): number {
    if (p === 0) return 0;
    if (p === 1) return n;
    
    // For large n, use normal approximation
    if (n > 100) {
      const mean = n * p;
      const std = Math.sqrt(n * p * (1 - p));
      const sample = mean + std * gaussianRandom();
      return Math.max(0, Math.round(sample));
    }
    
    // For small n, direct sampling
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++;
    }
    return successes;
  }

  function gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const prevTickRef = useRef(-1);
  useEffect(() => {
    if (tick === prevTickRef.current) return;
    prevTickRef.current = tick;
    if (tick === 0) return;

    setHistory((prev) => {
      const newPoint: HistoryPoint = { tick };
      simulations.forEach((sim) => {
        newPoint[sim.id] = sim.population;
      });
      const newHistory = [...prev, newPoint];
      if (newHistory.length > MAX_HISTORY_POINTS) {
        return newHistory.slice(-MAX_HISTORY_POINTS);
      }
      return newHistory;
    });
  }, [tick, simulations]);

  // Grid rendering kept for future use
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
  }, []);

  const totalPopulation = simulations.reduce((sum, s) => sum + s.population, 0);

  // Format large numbers
  const formatNumber = (n: number): string => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Chapter 2
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            How Life Grows Exponentially
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Real organisms don&apos;t appear from nothing — they{" "}
            <span className="text-emerald-700 font-medium">reproduce</span>. Adding
            replication fundamentally changes population dynamics from stable
            equilibrium to potential{" "}
            <span className="text-emerald-700 font-medium">exponential growth</span>.
          </p>
        </section>

        {/* Simulation Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-emerald-100 text-sm">
                Watch entities reproduce and multiply
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" stroke="#9ca3af" fontSize={12} />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [formatNumber(value as number), "Population"]}
                  />
                  <Legend />
                  {!isExponential && equilibrium < 10000 && (
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
                      Run {index + 1}: {formatNumber(sim.population)}
                    </span>
                    {simulations.length > 1 && (
                      <button
                        onClick={() => removeSimulation(sim.id)}
                        className="ml-1 p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Remove"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-1">Tick</p>
                  <p className="text-3xl font-bold text-gray-700">{tick}</p>
                  <p className="text-xs text-gray-400 mt-1">/ {MAX_TICKS.toLocaleString()}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Population</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatNumber(totalPopulation)}</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">Avg Population</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {simulations.length > 0
                      ? formatNumber(Math.round(totalPopulation / simulations.length))
                      : "0"}
                  </p>
                </div>
              </div>

              {/* Regime Indicator */}
              <div
                className={`rounded-xl p-4 ${
                  isExponential
                    ? "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
                    : "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    isExponential ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {isExponential
                    ? "Exponential regime (R ≥ D)"
                    : "Equilibrium regime (D > R)"}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isExponential ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {isExponential
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Birth (B)</span>
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">
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
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Death (D)</span>
                    <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
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
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Replication (R)</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
                      {replicationRate.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={replicationRate}
                    onChange={(e) => setReplicationRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Model Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/50 hover:border-emerald-200">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">The Model</h2>
              <p className="text-violet-100 text-sm">
                Adding replication to the existence equation
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
    if random() < R:
        population += 1  // reproduction!
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
                  <p className="text-2xl font-mono text-amber-900">
                    N* = B / (D - R) ={" "}
                    <span className="font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">
                      {isExponential ? "∞ (no equilibrium!)" : equilibrium.toFixed(1)}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-amber-600 text-center mt-2">
                  When R ≥ D, no equilibrium exists — exponential growth!
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
                    Replication breaks the simple equilibrium. When the replication
                    rate exceeds the death rate (R ≥ D), populations explode
                    exponentially. Add multiple runs to see how randomness affects
                    growth trajectories!
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
