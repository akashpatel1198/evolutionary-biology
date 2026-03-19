"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const SMALL_CANVAS = 300;
const LARGE_CANVAS = 400;
const ENTITY_RADIUS = 5;

// ============================================================================
// SECTION 1: RECAP CARD
// ============================================================================

function RecapSection() {
  return (
    <section className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <p className="text-sm font-medium text-indigo-600 mb-2">
          Recap from Chapter 2
        </p>
        <p className="text-gray-700 leading-relaxed">
          We saw that when a creature&apos;s{" "}
          <span className="font-semibold text-green-600">
            replication chance (R)
          </span>{" "}
          is higher than its{" "}
          <span className="font-semibold text-red-600">death chance (D)</span>,
          its numbers can grow exponentially.
        </p>
        <div className="mt-4 p-4 bg-white/60 rounded-xl border border-indigo-100">
          <p className="text-gray-600 italic">
            But we were left with a mystery: Since complex organisms can&apos;t
            form without replication, it doesn&apos;t matter how good they are
            at replicating if there aren&apos;t any around to replicate.
          </p>
          <p className="text-indigo-700 font-semibold mt-3">
            So how do they get their start?
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 2: INTRODUCING MUTATIONS
// ============================================================================

function MutationIntroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blueCount, setBlueCount] = useState(0);
  const [greenCount, setGreenCount] = useState(0);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mutationChance, setMutationChance] = useState(0.1);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const BLUE = { birthRate: 1.0, deathRate: 0.1, replicationRate: 0.05 };
  const GREEN = { birthRate: 0, deathRate: 0.1, replicationRate: 0.05 };

  const reset = useCallback(() => {
    entitiesRef.current = [];
    setBlueCount(0);
    setGreenCount(0);
    setHistory([]);
    setTick(0);
    nextIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      const entities = entitiesRef.current;
      const toAdd: Entity[] = [];

      if (Math.random() < BLUE.birthRate) {
        toAdd.push({
          id: nextIdRef.current++,
          x: Math.random() * SMALL_CANVAS,
          y: Math.random() * SMALL_CANVAS,
          type: "blue",
        });
      }

      const surviving = entities.filter((e) => {
        const stats = e.type === "blue" ? BLUE : GREEN;

        if (Math.random() < stats.replicationRate && entities.length + toAdd.length < 200) {
          const isMutation = e.type === "blue" && Math.random() < mutationChance;
          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(0, Math.min(SMALL_CANVAS, e.x + (Math.random() - 0.5) * 30)),
            y: Math.max(0, Math.min(SMALL_CANVAS, e.y + (Math.random() - 0.5) * 30)),
            type: isMutation ? "green" : e.type,
          });
        }

        return Math.random() >= stats.deathRate;
      });

      entitiesRef.current = [...surviving, ...toAdd];
      setBlueCount(entitiesRef.current.filter((e) => e.type === "blue").length);
      setGreenCount(entitiesRef.current.filter((e) => e.type === "green").length);
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, mutationChance]);

  useEffect(() => {
    if (tick === 0) return;
    setHistory((prev) => {
      const newPoint = { tick, blue: blueCount, green: greenCount };
      const newHistory = [...prev, newPoint];
      return newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
    });
  }, [tick, blueCount, greenCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SMALL_CANVAS, SMALL_CANVAS);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SMALL_CANVAS; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, SMALL_CANVAS);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(SMALL_CANVAS, i);
      ctx.stroke();
    }

    entitiesRef.current.forEach((e) => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = e.type === "blue" ? "#3b82f6" : "#22c55e";
      ctx.fill();
    });
  }, [blueCount, greenCount]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Introducing Mutations
          </h2>
          <p className="text-purple-100 text-sm">
            Sometimes replication makes mistakes
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            So far, each time one of our creatures has replicated, it&apos;s done
            a perfect job. But sometimes a mistake during replication causes a{" "}
            <strong>new kind of creature</strong> to appear. We call these
            mistakes <strong>mutations</strong>.
          </p>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <canvas
                ref={canvasRef}
                width={SMALL_CANVAS}
                height={SMALL_CANVAS}
                className="border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="font-semibold text-sm text-gray-800">
                      Blue
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-gray-600">
                    <p>
                      B = <span className="font-mono text-emerald-600">1</span>
                    </p>
                    <p>
                      D ={" "}
                      <span className="font-mono text-red-600">10%</span>
                    </p>
                    <p>
                      R ={" "}
                      <span className="font-mono text-green-600">5%</span>
                    </p>
                  </div>
                  <p className="text-lg font-bold text-blue-600 mt-2">
                    {blueCount}
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full bg-green-500" />
                    <span className="font-semibold text-sm text-gray-800">
                      Green
                    </span>
                    <span className="text-xs text-gray-400">(mutant)</span>
                  </div>
                  <div className="text-xs space-y-1 text-gray-600">
                    <p>
                      B = <span className="font-mono text-gray-400">0</span>
                    </p>
                    <p>
                      D ={" "}
                      <span className="font-mono text-red-600">10%</span>
                    </p>
                    <p>
                      R ={" "}
                      <span className="font-mono text-green-600">5%</span>
                    </p>
                  </div>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    {greenCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Mutation Chance (M)</span>
                  <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                    {(mutationChance * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={mutationChance}
                  onChange={(e) => setMutationChance(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
              </div>

              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" hide />
                  <YAxis fontSize={10} width={30} />
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
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRunning
                      ? "bg-amber-500 text-white"
                      : "bg-purple-500 text-white"
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
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-semibold text-amber-700 mb-1">
              Observation
            </p>
            <p className="text-sm text-amber-600">
              The green ones are having a hard time compared to the blue ones.
              No offense to the green creatures, but{" "}
              <strong>this wasn&apos;t a very good mutation</strong>. Green has
              no spontaneous birth (B = 0), so it can only exist through
              mutation from blue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4: THE MUTATION EQUATION
// ============================================================================

function MutationEquationSection() {
  const [showMutation, setShowMutation] = useState(false);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/50 border border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            The Mutation Equation
          </h2>
          <p className="text-violet-100 text-sm">
            How mutations change our mathematical model
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Let&apos;s add mutations to our equations from the last video.
            Mutation affects what happens when a creature replicates.
          </p>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="font-semibold text-gray-800">
                  Blue&apos;s Equation
                </span>
              </div>
              <div className="font-mono text-sm bg-white p-3 rounded-lg border border-blue-200">
                <p className="text-gray-500 mb-2">Without mutation:</p>
                <p className="text-blue-800">
                  ΔN<sub>blue</sub> = B + (R - D) × N<sub>blue</sub>
                </p>
                {showMutation && (
                  <>
                    <p className="text-gray-500 mt-4 mb-2">With mutation:</p>
                    <p className="text-blue-800">
                      ΔN<sub>blue</sub> = B + (R ×{" "}
                      <span className="bg-pink-100 px-1 rounded text-pink-700">
                        (1 - M)
                      </span>{" "}
                      - D) × N<sub>blue</sub>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Only (1 - M) of replications stay blue; M become something
                      else
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="font-semibold text-gray-800">
                  Green&apos;s Equation
                </span>
              </div>
              <div className="font-mono text-sm bg-white p-3 rounded-lg border border-green-200">
                <p className="text-gray-500 mb-2">Without mutation term:</p>
                <p className="text-green-800">
                  ΔN<sub>green</sub> = (R - D) × N<sub>green</sub>
                </p>
                {showMutation && (
                  <>
                    <p className="text-gray-500 mt-4 mb-2">
                      Adding blue&apos;s mutations:
                    </p>
                    <p className="text-green-800">
                      ΔN<sub>green</sub> = (R - D) × N<sub>green</sub> +{" "}
                      <span className="bg-pink-100 px-1 rounded text-pink-700">
                        R × M × N<sub>blue</sub>
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Green gains creatures from blue&apos;s replication
                      mistakes
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowMutation(!showMutation)}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                showMutation
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
              }`}
            >
              {showMutation ? "Hide Mutation Terms" : "Add Mutation Terms"}
            </button>
          </div>

          {showMutation && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-700 mb-2">
                Key Insight
              </p>
              <p className="text-sm text-emerald-600">
                This is a big moment! The green creatures can&apos;t form on
                their own, but the mutation term shows how they get above zero.
                They&apos;ve <strong>hacked the system</strong> by depending on
                the replication of a different kind of creature. From their
                perspective, it&apos;s basically the same as being able to form
                without replication.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 5: BUILDING THE TREE
// ============================================================================

function TreeSimulationSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [populations, setPopulations] = useState({
    blue: 0,
    green: 0,
    red: 0,
    orange: 0,
  });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const CREATURES = {
    blue: {
      color: "#3b82f6",
      birthRate: 1.0,
      deathRate: 0.1,
      replicationRate: 0.05,
    },
    green: {
      color: "#22c55e",
      birthRate: 0,
      deathRate: 0.1,
      replicationRate: 0.05,
    },
    red: {
      color: "#ef4444",
      birthRate: 0,
      deathRate: 0.05,
      replicationRate: 0.05,
    },
    orange: {
      color: "#f97316",
      birthRate: 0,
      deathRate: 0.05,
      replicationRate: 0.1,
    },
  };

  const MUTATIONS = {
    blue: [
      { to: "green", chance: 0.1 },
      { to: "red", chance: 0.1 },
    ],
    red: [{ to: "orange", chance: 0.05 }],
  };

  const reset = useCallback(() => {
    entitiesRef.current = [];
    setPopulations({ blue: 0, green: 0, red: 0, orange: 0 });
    setHistory([]);
    setTick(0);
    nextIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      const entities = entitiesRef.current;
      const toAdd: Entity[] = [];
      const maxEntities = 500;

      if (Math.random() < CREATURES.blue.birthRate) {
        toAdd.push({
          id: nextIdRef.current++,
          x: Math.random() * LARGE_CANVAS,
          y: Math.random() * LARGE_CANVAS,
          type: "blue",
        });
      }

      const surviving = entities.filter((e) => {
        const stats = CREATURES[e.type as keyof typeof CREATURES];

        if (
          Math.random() < stats.replicationRate &&
          entities.length + toAdd.length < maxEntities
        ) {
          let offspringType = e.type;

          const mutations = MUTATIONS[e.type as keyof typeof MUTATIONS];
          if (mutations) {
            for (const mut of mutations) {
              if (Math.random() < mut.chance) {
                offspringType = mut.to;
                break;
              }
            }
          }

          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(
              0,
              Math.min(LARGE_CANVAS, e.x + (Math.random() - 0.5) * 30)
            ),
            y: Math.max(
              0,
              Math.min(LARGE_CANVAS, e.y + (Math.random() - 0.5) * 30)
            ),
            type: offspringType,
          });
        }

        return Math.random() >= stats.deathRate;
      });

      entitiesRef.current = [...surviving, ...toAdd];

      const counts = { blue: 0, green: 0, red: 0, orange: 0 };
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
      return newHistory.length > 150 ? newHistory.slice(-150) : newHistory;
    });
  }, [tick, populations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, LARGE_CANVAS, LARGE_CANVAS);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= LARGE_CANVAS; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, LARGE_CANVAS);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(LARGE_CANVAS, i);
      ctx.stroke();
    }

    entitiesRef.current.forEach((e) => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = CREATURES[e.type as keyof typeof CREATURES].color;
      ctx.fill();
    });
  }, [populations]);

  const totalPop = populations.blue + populations.green + populations.red + populations.orange;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Building the Tree of Life
          </h2>
          <p className="text-orange-100 text-sm">
            Multiple mutations can lead to exponential growers
          </p>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-gray-600">
            Blue can also mutate into <strong>red</strong> (with lower death
            rate), and red can mutate into <strong>orange</strong> (with higher
            replication rate). Watch what happens when orange appears!
          </p>

          {/* Mutation Tree Diagram */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Mutation Tree
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  B
                </div>
                <span className="text-xs text-gray-500 mt-1">Blue</span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-xs text-pink-500">10%</span>
                  <span className="text-gray-400">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                      G
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Green</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-xs text-pink-500">10%</span>
                  <span className="text-gray-400">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                      R
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Red</span>
                  </div>
                  <span className="text-gray-400">→</span>
                  <span className="text-xs text-pink-500">5%</span>
                  <span className="text-gray-400">→</span>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      O
                    </div>
                    <span className="text-xs text-gray-500 mt-1">Orange</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Creature Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
              <div className="w-6 h-6 rounded-full bg-blue-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Blue</p>
              <p className="text-xs text-gray-500">
                D=10%, R=5%
              </p>
              <p className="text-xs text-gray-400">B=1</p>
              <p className="text-lg font-bold text-blue-600">{populations.blue}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
              <div className="w-6 h-6 rounded-full bg-green-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Green</p>
              <p className="text-xs text-gray-500">
                D=10%, R=5%
              </p>
              <p className="text-xs text-gray-400">B=0</p>
              <p className="text-lg font-bold text-green-600">{populations.green}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 border border-red-100 text-center">
              <div className="w-6 h-6 rounded-full bg-red-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Red</p>
              <p className="text-xs text-gray-500">
                <span className="text-emerald-600 font-medium">D=5%</span>, R=5%
              </p>
              <p className="text-xs text-gray-400">B=0</p>
              <p className="text-lg font-bold text-red-600">{populations.red}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2 border border-orange-200 text-center">
              <div className="w-6 h-6 rounded-full bg-orange-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Orange</p>
              <p className="text-xs text-gray-500">
                <span className="text-emerald-600 font-medium">D=5%</span>,{" "}
                <span className="text-blue-600 font-medium">R=10%</span>
              </p>
              <p className="text-xs text-orange-600 font-medium">R &gt; D!</p>
              <p className="text-lg font-bold text-orange-600">{populations.orange}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <canvas
                ref={canvasRef}
                width={LARGE_CANVAS}
                height={LARGE_CANVAS}
                className="border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex-1 space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" fontSize={10} />
                  <YAxis fontSize={10} width={40} />
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
                    dataKey="red"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
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
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Red
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
                      : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
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
                  Total Population:{" "}
                  <span className="font-bold text-gray-800">{totalPop}</span>
                </span>
              </div>
            </div>
          </div>

          {populations.orange > 0 && populations.orange > populations.blue && (
            <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 border border-orange-300 animate-pulse">
              <p className="text-sm font-semibold text-orange-800">
                Orange is taking over!
              </p>
              <p className="text-sm text-orange-700">
                With R (10%) &gt; D (5%), orange grows exponentially and blows
                past the other species.
              </p>
            </div>
          )}
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
              <h2 className="text-white font-bold text-xl mb-3">Key Insight</h2>
              <p className="text-emerald-100 text-lg leading-relaxed">
                Two creatures are extra special in our tree:
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500" />
                <span className="font-semibold text-white">
                  Blue: The First Replicator
                </span>
              </div>
              <p className="text-emerald-100 text-sm">
                Simple enough to form without replication (B = 1), yet complex
                enough to make more of itself. It&apos;s the seed that
                everything else comes from.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-orange-500" />
                <span className="font-semibold text-white">
                  Orange: First Exponential Grower
                </span>
              </div>
              <p className="text-emerald-100 text-sm">
                The first type where R &gt; D. Once it appears, exponential
                growth takes over, leading to lots more replication and lots
                more chances for new mutations.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-emerald-100 leading-relaxed">
              The real power of this way of looking at replicators: even a{" "}
              <strong>messy system full of bad mutations</strong> can lead to
              exponentially growing replicators. As long as there&apos;s a first
              replicator and it makes mistakes, odds are good that we&apos;ll
              eventually stumble onto a creature where R &gt; D.
            </p>
          </div>

          <div className="border-t border-white/20 pt-6">
            <p className="text-emerald-200 text-sm mb-2">
              The leading candidate for Earth&apos;s first replicator:
            </p>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white font-semibold text-lg">RNA</p>
              <p className="text-emerald-100 text-sm mt-1">
                A molecule simple enough to form without replication, yet it
                replicates, creating more of itself, just like our blue blobs.
                You might be looking at a portrait of one of your ancestors.
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

export default function Page3() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Chapter 3
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Mutations
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Sometimes replication makes mistakes, creating new kinds of
            creatures. That&apos;s how complex life gets its start.
          </p>
        </section>

        <RecapSection />
        <MutationIntroSection />
        <MutationEquationSection />
        <TreeSimulationSection />
        <KeyInsightSection />

        <div className="h-8"></div>
      </div>
    </div>
  );
}
