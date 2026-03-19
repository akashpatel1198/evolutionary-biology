"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

interface Entity {
  id: number;
  x: number;
  y: number;
  type: string;
}

interface HistoryPoint {
  tick: number;
  [key: string]: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CANVAS_SIZE = 350;
const ENTITY_RADIUS = 5;

// ============================================================================
// SECTION 1: RECAP CARD
// ============================================================================

function RecapSection() {
  return (
    <section className="space-y-4">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
        <p className="text-sm font-medium text-amber-600 mb-2">
          Recap from Chapter 3
        </p>
        <p className="text-gray-700 leading-relaxed">
          We&apos;ve seen how creatures that replicate can have their numbers
          grow{" "}
          <span className="font-semibold text-amber-700">
            exponentially without limit
          </span>
          .
        </p>
        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-amber-100">
          <p className="text-gray-600 italic">
            But in the real world, there are limits. Resources are finite.
            Space is finite. A more realistic growth curve would level off at
            some point.
          </p>
          <p className="text-amber-700 font-semibold mt-3">
            How do we model this?
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 2: EXPONENTIAL GROWTH PROBLEM
// ============================================================================

function ExponentialGrowthSection() {
  const [R, setR] = useState(0.1);
  const [D, setD] = useState(0.05);

  const deltaData = useMemo(() => {
    const data = [];
    for (let N = 0; N <= 100; N += 2) {
      data.push({
        N,
        delta: (R - D) * N,
      });
    }
    return data;
  }, [R, D]);

  const slope = R - D;
  const isExponential = slope > 0;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-amber-100/50 border border-amber-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            The Exponential Growth Equation
          </h2>
          <p className="text-amber-100 text-sm">
            Why unchecked growth leads to explosion
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            From the last videos, we built an equation to predict expected
            change per time step:
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-xl font-mono text-slate-800">
              Δ = (R - D) × N
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Expected change = (Replication - Death) × Current population
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Replication Rate (R)</span>
                  <span className="font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    {(R * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={R}
                  onChange={(e) => setR(parseFloat(e.target.value))}
                  className="w-full accent-green-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Death Rate (D)</span>
                  <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {(D * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={D}
                  onChange={(e) => setD(parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
              </div>

              <div
                className={`rounded-xl p-3 ${
                  isExponential
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    isExponential ? "text-red-700" : "text-green-700"
                  }`}
                >
                  R - D = {(slope * 100).toFixed(1)}%
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isExponential ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {isExponential
                    ? "Positive slope → Exponential growth!"
                    : slope < 0
                    ? "Negative slope → Population declines"
                    : "Zero slope → No change"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Δ vs N (Expected change vs Population)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={deltaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="N"
                    fontSize={10}
                    label={{ value: "N", position: "right", fontSize: 12 }}
                  />
                  <YAxis
                    fontSize={10}
                    label={{
                      value: "Δ",
                      position: "top",
                      fontSize: 12,
                      offset: -5,
                    }}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" />
                  <Line
                    type="monotone"
                    dataKey="delta"
                    stroke={isExponential ? "#ef4444" : "#22c55e"}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>The problem:</strong> When R &gt; D, this graph is a
              straight line with positive slope. The more creatures there are,
              the more new creatures appear. This leads to exponential growth
              with no upper limit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 3: INTRODUCING CROWDING
// ============================================================================

function CrowdingSection() {
  const [R, setR] = useState(0.1);
  const [D, setD] = useState(0.05);
  const [C, setC] = useState(0.001);
  const [showCrowding, setShowCrowding] = useState(false);

  const carryingCapacity = C > 0 ? (R - D) / C : Infinity;

  const deltaData = useMemo(() => {
    const data = [];
    const maxN = showCrowding ? Math.min(150, Math.max(80, carryingCapacity * 1.5)) : 100;
    for (let N = 0; N <= maxN; N += 2) {
      if (showCrowding) {
        data.push({
          N,
          delta: (R - D - C * N) * N,
        });
      } else {
        data.push({
          N,
          delta: (R - D) * N,
        });
      }
    }
    return data;
  }, [R, D, C, showCrowding, carryingCapacity]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Introducing Crowding
          </h2>
          <p className="text-orange-100 text-sm">
            How limited resources create carrying capacity
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            What if creatures are more likely to die when it&apos;s crowded?
            There&apos;s only so much space and food. We can add an extra term
            to adjust the death chance based on population:
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-gray-500 mb-2">Without crowding:</p>
              <p className="text-lg font-mono text-slate-800 text-center">
                Δ = (R - D) × N
              </p>
            </div>

            {showCrowding && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <p className="text-sm text-orange-600 mb-2">With crowding:</p>
                <p className="text-lg font-mono text-orange-800 text-center">
                  Δ = (R - D -{" "}
                  <span className="bg-orange-200 px-1 rounded">C × N</span>) × N
                </p>
                <p className="text-xs text-orange-600 text-center mt-2">
                  Death chance increases by C for each creature in the
                  population
                </p>
              </div>
            )}

            <button
              onClick={() => setShowCrowding(!showCrowding)}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                showCrowding
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90"
              }`}
            >
              {showCrowding ? "Hide Crowding Term" : "Add Crowding Term"}
            </button>
          </div>

          {showCrowding && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>R</span>
                    <span className="font-mono text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-xs">
                      {(R * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={R}
                    onChange={(e) => setR(parseFloat(e.target.value))}
                    className="w-full accent-green-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>D</span>
                    <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-xs">
                      {(D * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.15"
                    step="0.01"
                    value={D}
                    onChange={(e) => setD(parseFloat(e.target.value))}
                    className="w-full accent-red-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>C</span>
                    <span className="font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded text-xs">
                      {C.toFixed(3)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.0005"
                    max="0.005"
                    step="0.0001"
                    value={C}
                    onChange={(e) => setC(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Δ vs N (now a parabola!)
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={deltaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="N" fontSize={10} />
                      <YAxis fontSize={10} />
                      <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                      {carryingCapacity > 0 && carryingCapacity < 200 && (
                        <ReferenceLine
                          x={Math.round(carryingCapacity)}
                          stroke="#f97316"
                          strokeDasharray="4 4"
                          label={{
                            value: `K=${Math.round(carryingCapacity)}`,
                            fill: "#f97316",
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="delta"
                        stroke="#f97316"
                        fill="#fed7aa"
                        fillOpacity={0.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <p className="text-sm font-semibold text-orange-700">
                      Carrying Capacity (K)
                    </p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">
                      {carryingCapacity > 0 && carryingCapacity < 1000
                        ? Math.round(carryingCapacity)
                        : "∞"}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      K = (R - D) / C
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-xs text-slate-600">
                      At K, the death chance (adjusted for crowding) equals the
                      replication chance. Births = Deaths. Equilibrium!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200">
                <p className="text-sm font-semibold text-teal-700 mb-1">
                  The Logistic Growth Curve
                </p>
                <p className="text-sm text-teal-600">
                  This parabola predicts an <strong>S-shaped</strong> population
                  curve. Growth is fast at first (like exponential), but slows
                  as population approaches K, eventually leveling off.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4: LOGISTIC GROWTH SIMULATION
// ============================================================================

function LogisticGrowthSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [population, setPopulation] = useState(5);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [C, setC] = useState(0.001);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const R = 0.1;
  const D = 0.05;
  const carryingCapacity = (R - D) / C;

  const reset = useCallback(() => {
    const initial: Entity[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push({
        id: nextIdRef.current++,
        x: Math.random() * CANVAS_SIZE,
        y: Math.random() * CANVAS_SIZE,
        type: "blue",
      });
    }
    entitiesRef.current = initial;
    setPopulation(5);
    setHistory([]);
    setTick(0);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      const entities = entitiesRef.current;
      const N = entities.length;
      const toAdd: Entity[] = [];

      const effectiveD = D + C * N;

      const surviving = entities.filter((e) => {
        if (Math.random() < R && entities.length + toAdd.length < 500) {
          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(0, Math.min(CANVAS_SIZE, e.x + (Math.random() - 0.5) * 30)),
            y: Math.max(0, Math.min(CANVAS_SIZE, e.y + (Math.random() - 0.5) * 30)),
            type: "blue",
          });
        }
        return Math.random() >= effectiveD;
      });

      entitiesRef.current = [...surviving, ...toAdd];
      setPopulation(entitiesRef.current.length);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, C]);

  useEffect(() => {
    if (tick === 0) return;
    setHistory((prev) => {
      const newPoint = { tick, population };
      const newHistory = [...prev, newPoint];
      return newHistory.length > 200 ? newHistory.slice(-200) : newHistory;
    });
  }, [tick, population]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += 35) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    entitiesRef.current.forEach((e) => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
    });
  }, [population]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-blue-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Logistic Growth in Action
          </h2>
          <p className="text-blue-100 text-sm">
            Watch the S-curve form as population approaches carrying capacity
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500" />
                  <span className="font-semibold text-gray-800">
                    Blue Creature
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">R</p>
                    <p className="font-mono font-bold text-green-600">10%</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">D (base)</p>
                    <p className="font-mono font-bold text-red-600">5%</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">C</p>
                    <p className="font-mono font-bold text-orange-600">
                      {C.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Crowding Coefficient (C)</span>
                  <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                    {C.toFixed(4)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0.0005"
                  max="0.003"
                  step="0.0001"
                  value={C}
                  onChange={(e) => setC(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
                <p className="text-xs text-gray-500">
                  Carrying Capacity K ={" "}
                  <span className="font-bold text-orange-600">
                    {Math.round(carryingCapacity)}
                  </span>
                </p>
              </div>

              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" fontSize={10} hide />
                  <YAxis fontSize={10} width={35} />
                  <Tooltip />
                  <ReferenceLine
                    y={carryingCapacity}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    label={{
                      value: `K=${Math.round(carryingCapacity)}`,
                      fill: "#f97316",
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="population"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRunning
                      ? "bg-amber-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {isRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700"
                >
                  Reset
                </button>
                <div className="flex-1 flex items-center justify-end">
                  <span className="text-sm text-gray-500">
                    Population:{" "}
                    <span className="font-bold text-blue-600">{population}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-gray-600">
              Notice the <strong>S-curve</strong>: population grows rapidly at
              first (like exponential), then slows as it approaches K. If it
              overshoots K, growth goes negative, pushing it back down.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 5: COMPETITION SIMULATION
// ============================================================================

function CompetitionSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [populations, setPopulations] = useState({
    blue: 10,
    green: 0,
    orange: 0,
  });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const C = 0.001;

  const CREATURES = {
    blue: { color: "#3b82f6", R: 0.1, D: 0.05 },
    green: { color: "#22c55e", R: 0.08, D: 0.05 },
    orange: { color: "#f97316", R: 0.1, D: 0.03 },
  };

  const reset = useCallback(() => {
    const initial: Entity[] = [];
    for (let i = 0; i < 10; i++) {
      initial.push({
        id: nextIdRef.current++,
        x: Math.random() * CANVAS_SIZE,
        y: Math.random() * CANVAS_SIZE,
        type: "blue",
      });
    }
    entitiesRef.current = initial;
    setPopulations({ blue: 10, green: 0, orange: 0 });
    setHistory([]);
    setTick(0);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      const entities = entitiesRef.current;
      const totalN = entities.length;
      const toAdd: Entity[] = [];

      const surviving = entities.filter((e) => {
        const stats = CREATURES[e.type as keyof typeof CREATURES];
        const effectiveD = stats.D + C * totalN;

        if (Math.random() < stats.R && entities.length + toAdd.length < 500) {
          let offspringType = e.type;

          if (e.type === "blue") {
            if (Math.random() < 0.01) {
              offspringType = "green";
            } else if (Math.random() < 0.01) {
              offspringType = "orange";
            }
          }

          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(0, Math.min(CANVAS_SIZE, e.x + (Math.random() - 0.5) * 30)),
            y: Math.max(0, Math.min(CANVAS_SIZE, e.y + (Math.random() - 0.5) * 30)),
            type: offspringType,
          });
        }

        return Math.random() >= effectiveD;
      });

      entitiesRef.current = [...surviving, ...toAdd];

      const counts = { blue: 0, green: 0, orange: 0 };
      entitiesRef.current.forEach((e) => {
        counts[e.type as keyof typeof counts]++;
      });
      setPopulations(counts);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (tick === 0) return;
    setHistory((prev) => {
      const newPoint = { tick, ...populations };
      const newHistory = [...prev, newPoint];
      return newHistory.length > 200 ? newHistory.slice(-200) : newHistory;
    });
  }, [tick, populations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += 35) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_SIZE, i);
      ctx.stroke();
    }

    entitiesRef.current.forEach((e) => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = CREATURES[e.type as keyof typeof CREATURES].color;
      ctx.fill();
    });
  }, [populations]);

  const totalPop = populations.blue + populations.green + populations.orange;
  const orangeDominant = populations.orange > populations.blue && populations.orange > populations.green;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Competition for Resources
          </h2>
          <p className="text-purple-100 text-sm">
            Multiple species sharing the same carrying capacity
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Now let&apos;s add mutations. Blue can mutate into{" "}
            <strong className="text-green-600">green</strong> (slightly worse
            replication) or{" "}
            <strong className="text-orange-600">orange</strong> (lower death
            rate). All three share the same resources, so crowding affects
            everyone.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-center">
              <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Blue</p>
              <p className="text-xs text-gray-500">R=10%, D=5%</p>
              <p className="text-lg font-bold text-blue-600">{populations.blue}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-center">
              <div className="w-5 h-5 rounded-full bg-green-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Green</p>
              <p className="text-xs text-gray-500">
                <span className="text-red-500">R=8%</span>, D=5%
              </p>
              <p className="text-lg font-bold text-green-600">{populations.green}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
              <div className="w-5 h-5 rounded-full bg-orange-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Orange</p>
              <p className="text-xs text-gray-500">
                R=10%, <span className="text-green-600">D=3%</span>
              </p>
              <p className="text-lg font-bold text-orange-600">{populations.orange}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex-1 space-y-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" fontSize={10} />
                  <YAxis fontSize={10} width={35} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="blue"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="green"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="orange"
                    stackId="1"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex flex-wrap gap-3 justify-center text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Blue
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Green
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  Orange
                </span>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    isRunning
                      ? "bg-amber-500 text-white"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  }`}
                >
                  {isRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={reset}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700"
                >
                  Reset
                </button>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-500">
                  Total:{" "}
                  <span className="font-bold text-gray-800">{totalPop}</span>
                </span>
              </div>
            </div>
          </div>

          {orangeDominant && (
            <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 border border-orange-300">
              <p className="text-sm font-semibold text-orange-800">
                Orange is dominating!
              </p>
              <p className="text-sm text-orange-700">
                With a lower death rate (3% vs 5%), orange survives better under
                crowding pressure and outcompetes the others.
              </p>
            </div>
          )}

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-sm font-semibold text-purple-700 mb-1">
              Key Observation
            </p>
            <p className="text-sm text-purple-600">
              It&apos;s not enough for blue to be good at surviving in
              isolation. It now needs to be{" "}
              <strong>better than its competitors</strong> to maintain numbers.
              Sometimes green beats blue due to luck, showing how chaotic
              evolution can be.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 6: KEY INSIGHT
// ============================================================================

function KeyInsightSection() {
  return (
    <section>
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl shadow-lg shadow-emerald-200/50 overflow-hidden">
        <div className="p-8 space-y-6">
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
              <h2 className="text-white font-bold text-xl mb-3">
                The Core of Evolution
              </h2>
              <p className="text-emerald-100 text-lg leading-relaxed">
                We&apos;ve now covered the three pillars:
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl mb-2">🔄</p>
              <p className="font-semibold text-white">Replication</p>
              <p className="text-emerald-200 text-sm mt-1">
                Populations can grow
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl mb-2">🎲</p>
              <p className="font-semibold text-white">Mutation</p>
              <p className="text-emerald-200 text-sm mt-1">
                Diversity appears
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl mb-2">⚔️</p>
              <p className="font-semibold text-white">Competition</p>
              <p className="text-emerald-200 text-sm mt-1">
                Finite resources select for fittest
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-emerald-100 leading-relaxed">
              Anywhere replicators exist, even if there&apos;s life on other
              planets, everything we&apos;ve said so far would apply.
            </p>
          </div>

          <div className="border-t border-white/20 pt-6">
            <p className="text-emerald-200 text-sm mb-2">Coming up next...</p>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white font-semibold">Natural Selection</p>
              <p className="text-emerald-100 text-sm mt-1">
                So far, we&apos;ve been making all the decisions ourselves. You
                could say we&apos;ve been artificially selecting successful
                creatures. Next, we&apos;ll let go of the reins and let
                selection happen a bit more naturally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Page4() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
              Chapter 4
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Limited Growth
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Exponential growth can&apos;t go on forever. Limited resources
            create competition, and competition shapes who survives.
          </p>
        </section>

        <RecapSection />
        <ExponentialGrowthSection />
        <CrowdingSection />
        <LogisticGrowthSection />
        <CompetitionSection />
        <KeyInsightSection />

        <div className="h-8"></div>
      </div>
    </div>
  );
}
