"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  NodeProps,
  EdgeProps,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
} from "reactflow";
import "reactflow/dist/style.css";

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

// Custom Mutation Tree Types
interface Species {
  id: string;
  name: string;
  color: string;
  birthRate: number;
  deathRate: number;
  replicationRate: number;
}

interface MutationLink {
  from: string;
  to: string;
  chance: number;
}

// Free Evolution Types
interface EvolvingEntity {
  id: number;
  x: number;
  y: number;
  replicationRate: number;
  deathRate: number;
  generation: number;
  lineageId: number;
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
              <strong>this wasn&apos;t a very good mutation</strong> (no increase in fitness). Green has
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
                <p className="text-xs text-gray-500 mt-2 font-sans">
                  Change in blue = spontaneous births + (replication rate - death rate) × current blue population
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
                    <p className="text-xs text-gray-500 mt-2 font-sans">
                      Now only (1 - M) of replications produce blue offspring; the rest mutate into something else
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
                <p className="text-xs text-gray-500 mt-2 font-sans">
                  Change in green = (replication rate - death rate) × current green population (no spontaneous births!)
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
                    <p className="text-xs text-gray-500 mt-2 font-sans">
                      Green gains new creatures whenever blue replicates and makes a mistake
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
                their own (their birth rate is 0), but the mutation term shows
                how they get above zero. They&apos;ve{" "}
                <strong>hacked the system</strong> by depending on the
                replication of a different kind of creature. From their
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
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(80);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const MAX_POPULATION = 1000;

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
    setIsPaused(false);
    nextIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      const entities = entitiesRef.current;
      
      if (entities.length >= MAX_POPULATION) {
        setIsPaused(true);
        return;
      }

      setTick((t) => t + 1);

      const toAdd: Entity[] = [];

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

        if (Math.random() < stats.replicationRate) {
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
    }, speed);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, speed]);

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

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="flex justify-between text-xs font-medium text-gray-600">
                    <span>Speed</span>
                    <span className="font-mono text-gray-500">
                      {speed}ms/tick
                    </span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    step="10"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    className="w-full accent-orange-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      if (isPaused) {
                        setIsPaused(false);
                      } else {
                        setIsRunning(!isRunning);
                      }
                    }}
                    className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                      isRunning && !isPaused
                        ? "bg-amber-500 text-white"
                        : "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    }`}
                  >
                    {isPaused ? "Continue" : isRunning ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="text-center">
                <span className="text-sm text-gray-500">
                  Total Population:{" "}
                  <span className="font-bold text-gray-800">{totalPop}</span>
                  {isPaused && (
                    <span className="ml-2 text-amber-600 font-medium">
                      (paused at limit)
                    </span>
                  )}
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
              <a
                href="https://en.wikipedia.org/wiki/RNA_world"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300 hover:text-white text-sm mt-3 transition-colors"
              >
                Learn more about the RNA World hypothesis
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 6: CUSTOM MUTATION TREE SANDBOX (React Flow)
// ============================================================================

const DEFAULT_SPECIES: Species[] = [
  { id: "blue", name: "Blue", color: "#3b82f6", birthRate: 1.0, deathRate: 0.1, replicationRate: 0.05 },
  { id: "green", name: "Green", color: "#22c55e", birthRate: 0, deathRate: 0.1, replicationRate: 0.05 },
  { id: "red", name: "Red", color: "#ef4444", birthRate: 0, deathRate: 0.05, replicationRate: 0.05 },
  { id: "orange", name: "Orange", color: "#f97316", birthRate: 0, deathRate: 0.05, replicationRate: 0.1 },
];

const DEFAULT_MUTATIONS: MutationLink[] = [
  { from: "blue", to: "green", chance: 0.1 },
  { from: "blue", to: "red", chance: 0.1 },
  { from: "red", to: "orange", chance: 0.05 },
];

const COLOR_PALETTE = [
  "#3b82f6", "#22c55e", "#ef4444", "#f97316", "#8b5cf6", 
  "#ec4899", "#14b8a6", "#f59e0b", "#6366f1", "#84cc16"
];

interface SpeciesNodeData {
  species: Species;
  isRoot: boolean;
  generation: number;
  onUpdate: (id: string, updates: Partial<Species>) => void;
  onDelete: (id: string) => void;
}

function SpeciesNode({ data, id }: NodeProps<SpeciesNodeData>) {
  const { species, isRoot, generation, onUpdate, onDelete } = data;
  const [expanded, setExpanded] = useState(false);
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(species.id);
  };
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-pink-400 !w-3 !h-3 !border-2 !border-white"
        style={{ visibility: isRoot ? 'hidden' : 'visible' }}
      />
      
      <div 
        className={`bg-white rounded-xl shadow-lg border-2 transition-all nodrag ${
          expanded ? 'w-56 p-3' : 'w-auto p-2'
        }`}
        style={{ borderColor: species.color }}
      >
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: species.color }}
            onClick={handleToggleExpand}
          >
            {species.name.charAt(0).toUpperCase()}
          </button>
          
          {expanded ? (
            <input
              type="text"
              value={species.name}
              onChange={e => onUpdate(species.id, { name: e.target.value })}
              className="bg-gray-50 text-gray-800 text-sm px-2 py-1 rounded border border-gray-200 flex-1 min-w-0 nopan"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span 
              className="text-sm font-medium text-gray-700 whitespace-nowrap pr-1 cursor-pointer"
              onClick={handleToggleExpand}
            >
              {species.name}
            </span>
          )}
          
          {!isRoot && !expanded && (
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-500 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
        
        <div 
          className="text-xs text-gray-400 mt-1 text-center cursor-pointer"
          onClick={handleToggleExpand}
        >
          Gen {generation} {isRoot && '• Root'}
        </div>
        
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 nopan">
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  onClick={(e) => { e.stopPropagation(); onUpdate(species.id, { color }); }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    species.color === color ? 'border-gray-700 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            <div>
              <label className="text-xs text-gray-500 flex justify-between">
                <span>Death Rate (D)</span>
                <span className="text-red-500">{(species.deathRate * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={species.deathRate * 100}
                onChange={e => onUpdate(species.id, { deathRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-red-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
            </div>
            
            <div>
              <label className="text-xs text-gray-500 flex justify-between">
                <span>Replication Rate (R)</span>
                <span className="text-green-500">{(species.replicationRate * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={species.replicationRate * 100}
                onChange={e => onUpdate(species.id, { replicationRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-green-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
            </div>
            
            <div className={`text-xs font-medium text-center py-1 rounded ${
              species.replicationRate > species.deathRate 
                ? 'text-green-600 bg-green-50' 
                : species.replicationRate < species.deathRate 
                  ? 'text-red-600 bg-red-50' 
                  : 'text-gray-500 bg-gray-50'
            }`}>
              R - D = {((species.replicationRate - species.deathRate) * 100).toFixed(0)}%
              {species.replicationRate > species.deathRate ? ' Growing' : species.replicationRate < species.deathRate ? ' Declining' : ' Stable'}
            </div>
            
            {!isRoot && (
              <button
                onClick={handleDelete}
                className="w-full text-xs px-2 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete Species
              </button>
            )}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-pink-400 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}

interface MutationEdgeData {
  chance: number;
  onUpdate: (from: string, to: string, chance: number) => void;
  onDelete: (from: string, to: string) => void;
}

function MutationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  source,
  target,
}: EdgeProps<MutationEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [editing, setEditing] = useState(false);
  const [tempChance, setTempChance] = useState(data?.chance ?? 0.1);

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={MarkerType.ArrowClosed}
        style={{ stroke: '#ec4899', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <div className="bg-white rounded-lg shadow-lg border border-pink-200 p-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={tempChance * 100}
                onChange={e => setTempChance(parseInt(e.target.value) / 100)}
                className="w-12 text-xs text-center border border-gray-200 rounded px-1 py-0.5"
                autoFocus
              />
              <span className="text-xs text-gray-500">%</span>
              <button
                onClick={() => {
                  data?.onUpdate(source, target, tempChance);
                  setEditing(false);
                }}
                className="text-xs px-2 py-0.5 bg-pink-500 text-white rounded hover:bg-pink-600"
              >
                ✓
              </button>
              <button
                onClick={() => data?.onDelete(source, target)}
                className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="bg-pink-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow hover:bg-pink-600 transition-colors"
            >
              {((data?.chance ?? 0.1) * 100).toFixed(0)}%
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { species: SpeciesNode };
const edgeTypes = { mutation: MutationEdge };

function CustomMutationTreeSection() {
  const [species, setSpecies] = useState<Species[]>(DEFAULT_SPECIES);
  const [mutations, setMutations] = useState<MutationLink[]>(DEFAULT_MUTATIONS);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(80);
  const [tick, setTick] = useState(0);
  const [populations, setPopulations] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  
  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const MAX_POPULATION = 1500;
  const SANDBOX_CANVAS = 350;

  const getSpeciesGenerations = useCallback((): Record<string, number> => {
    const generations: Record<string, number> = {};
    if (species.length === 0) return generations;
    
    generations[species[0].id] = 0;
    
    let changed = true;
    while (changed) {
      changed = false;
      for (const mut of mutations) {
        if (generations[mut.from] !== undefined && generations[mut.to] === undefined) {
          generations[mut.to] = generations[mut.from] + 1;
          changed = true;
        }
      }
    }
    
    species.forEach(s => {
      if (generations[s.id] === undefined) {
        generations[s.id] = -1;
      }
    });
    
    return generations;
  }, [species, mutations]);

  const speciesGenerations = useMemo(() => getSpeciesGenerations(), [getSpeciesGenerations]);

  const updateSpecies = useCallback((id: string, updates: Partial<Species>) => {
    setSpecies(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removeSpecies = useCallback((id: string) => {
    if (species.length <= 1) return;
    if (species[0].id === id) return;
    setSpecies(prev => prev.filter(s => s.id !== id));
    setMutations(prev => prev.filter(m => m.from !== id && m.to !== id));
  }, [species]);

  const updateMutationChance = useCallback((from: string, to: string, chance: number) => {
    setMutations(prev => prev.map(m => 
      m.from === from && m.to === to ? { ...m, chance } : m
    ));
  }, []);

  const removeMutation = useCallback((from: string, to: string) => {
    setMutations(prev => prev.filter(m => !(m.from === from && m.to === to)));
  }, []);

  const initialNodes = useMemo((): Node<SpeciesNodeData>[] => {
    const gens = getSpeciesGenerations();
    const maxGen = Math.max(0, ...Object.values(gens).filter(g => g >= 0));
    
    const speciesByGen: Record<number, Species[]> = {};
    for (let g = 0; g <= maxGen; g++) {
      speciesByGen[g] = species.filter(s => gens[s.id] === g);
    }
    const unconnected = species.filter(s => gens[s.id] === -1);
    
    const nodes: Node<SpeciesNodeData>[] = [];
    const xSpacing = 180;
    const ySpacing = 100;
    
    for (let gen = 0; gen <= maxGen; gen++) {
      const speciesInGen = speciesByGen[gen] || [];
      speciesInGen.forEach((spec, idx) => {
        nodes.push({
          id: spec.id,
          type: 'species',
          position: { 
            x: gen * xSpacing + 50, 
            y: idx * ySpacing + 50 
          },
          data: {
            species: spec,
            isRoot: spec.id === species[0]?.id,
            generation: gen,
            onUpdate: updateSpecies,
            onDelete: removeSpecies,
          },
        });
      });
    }
    
    unconnected.forEach((spec, idx) => {
      nodes.push({
        id: spec.id,
        type: 'species',
        position: { 
          x: (maxGen + 1) * xSpacing + 100, 
          y: idx * ySpacing + 50 
        },
        data: {
          species: spec,
          isRoot: false,
          generation: -1,
          onUpdate: updateSpecies,
          onDelete: removeSpecies,
        },
      });
    });
    
    return nodes;
  }, [species, getSpeciesGenerations, updateSpecies, removeSpecies]);

  const initialEdges = useMemo((): Edge<MutationEdgeData>[] => {
    return mutations.map(m => ({
      id: `${m.from}-${m.to}`,
      source: m.from,
      target: m.to,
      type: 'mutation',
      data: {
        chance: m.chance,
        onUpdate: updateMutationChance,
        onDelete: removeMutation,
      },
    }));
  }, [mutations, updateMutationChance, removeMutation]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const sourceGen = speciesGenerations[connection.source];
    const targetGen = speciesGenerations[connection.target];
    
    if (sourceGen === -1) {
      return;
    }
    
    const targetHasIncoming = mutations.some(m => m.to === connection.target);
    if (targetHasIncoming) {
      return;
    }
    
    if (targetGen !== -1 && targetGen <= sourceGen) {
      return;
    }
    
    setMutations(prev => [...prev, { 
      from: connection.source!, 
      to: connection.target!, 
      chance: 0.1 
    }]);
  }, [speciesGenerations, mutations]);

  const reset = useCallback(() => {
    entitiesRef.current = [];
    const initialPops: Record<string, number> = {};
    species.forEach(s => initialPops[s.id] = 0);
    setPopulations(initialPops);
    setHistory([]);
    setTick(0);
    setIsPaused(false);
    setIsRunning(false);
    nextIdRef.current = 0;
  }, [species]);

  const loadPreset = () => {
    setSpecies(DEFAULT_SPECIES);
    setMutations(DEFAULT_MUTATIONS);
    reset();
  };

  const addSpecies = () => {
    const usedColors = species.map(s => s.color);
    const availableColor = COLOR_PALETTE.find(c => !usedColors.includes(c)) || "#888888";
    const newId = `species_${Date.now()}`;
    const lastSpecies = species[species.length - 1];
    setSpecies([...species, {
      id: newId,
      name: `Species ${species.length + 1}`,
      color: availableColor,
      birthRate: 0,
      deathRate: lastSpecies?.deathRate || 0.1,
      replicationRate: lastSpecies?.replicationRate || 0.05,
    }]);
  };

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      const entities = entitiesRef.current;
      
      if (entities.length >= MAX_POPULATION) {
        setIsPaused(true);
        return;
      }

      setTick(t => t + 1);

      const toAdd: Entity[] = [];
      const speciesMap = Object.fromEntries(species.map(s => [s.id, s]));
      const mutationMap: Record<string, MutationLink[]> = {};
      mutations.forEach(m => {
        if (!mutationMap[m.from]) mutationMap[m.from] = [];
        mutationMap[m.from].push(m);
      });

      species.forEach(s => {
        if (s.birthRate > 0 && Math.random() < s.birthRate) {
          toAdd.push({
            id: nextIdRef.current++,
            x: Math.random() * SANDBOX_CANVAS,
            y: Math.random() * SANDBOX_CANVAS,
            type: s.id,
          });
        }
      });

      const surviving = entities.filter(e => {
        const spec = speciesMap[e.type];
        if (!spec) return false;

        if (Math.random() < spec.replicationRate) {
          let offspringType = e.type;
          const muts = mutationMap[e.type];
          if (muts) {
            for (const mut of muts) {
              if (Math.random() < mut.chance) {
                offspringType = mut.to;
                break;
              }
            }
          }

          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(0, Math.min(SANDBOX_CANVAS, e.x + (Math.random() - 0.5) * 30)),
            y: Math.max(0, Math.min(SANDBOX_CANVAS, e.y + (Math.random() - 0.5) * 30)),
            type: offspringType,
          });
        }

        return Math.random() >= spec.deathRate;
      });

      entitiesRef.current = [...surviving, ...toAdd];

      const counts: Record<string, number> = {};
      species.forEach(s => counts[s.id] = 0);
      entitiesRef.current.forEach(e => {
        if (counts[e.type] !== undefined) counts[e.type]++;
      });
      setPopulations(counts);
    }, speed);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, speed, species, mutations]);

  useEffect(() => {
    if (tick === 0) return;
    setHistory(prev => {
      const newPoint: HistoryPoint = { tick, ...populations };
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
    ctx.fillRect(0, 0, SANDBOX_CANVAS, SANDBOX_CANVAS);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SANDBOX_CANVAS; i += 35) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, SANDBOX_CANVAS);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(SANDBOX_CANVAS, i);
      ctx.stroke();
    }

    const speciesMap = Object.fromEntries(species.map(s => [s.id, s]));
    entitiesRef.current.forEach(e => {
      const spec = speciesMap[e.type];
      if (!spec) return;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = spec.color;
      ctx.fill();
    });
  }, [populations, species]);

  const totalPop = Object.values(populations).reduce((a, b) => a + b, 0);

  const unconnectedSpecies = species.filter(s => speciesGenerations[s.id] === -1);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-violet-100/50 border border-violet-100 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-violet-200 bg-white/20 px-2 py-0.5 rounded">
              Sandbox
            </span>
          </div>
          <h2 className="text-white font-semibold text-lg mt-1">
            Design Your Own Mutation Tree
          </h2>
          <p className="text-violet-100 text-sm">
            Drag to connect species and create mutation paths. Click nodes to edit.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Mutation Tree Editor</p>
            <div className="flex gap-2">
              <button
                onClick={loadPreset}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Load Default
              </button>
              <button
                onClick={addSpecies}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
              >
                + Add Species
              </button>
            </div>
          </div>

          <div className="h-80 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                type: 'mutation',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#ec4899',
                },
              }}
              connectionLineStyle={{ stroke: '#ec4899', strokeWidth: 2 }}
              className="bg-transparent"
            >
              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-500 shadow-sm border border-gray-100">
                <span className="font-medium">Tip:</span> Drag from right handle → left handle to connect
              </div>
            </ReactFlow>
          </div>

          {unconnectedSpecies.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-700">
                <span className="font-medium">Unconnected species:</span>{' '}
                {unconnectedSpecies.map(s => s.name).join(', ')}
                {' '}— drag a connection from an existing species to include them in the tree.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <canvas
                ref={canvasRef}
                width={SANDBOX_CANVAS}
                height={SANDBOX_CANVAS}
                className="rounded-xl border border-gray-200 w-full"
              />
            </div>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Population</p>
                <div className="grid grid-cols-2 gap-2">
                  {species.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-gray-600 text-sm">{s.name}:</span>
                      <span className="text-gray-800 font-semibold text-sm">{populations[s.id] || 0}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-500 text-sm">Total: </span>
                  <span className="text-gray-800 font-bold">{totalPop}</span>
                  {isPaused && <span className="ml-2 text-amber-600 text-xs">(paused at limit)</span>}
                </div>
              </div>

              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="tick" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      labelStyle={{ color: "#64748b" }}
                    />
                    {species.map(s => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        stackId="1"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed:</span>
              <input
                type="range"
                min="30"
                max="150"
                step="10"
                value={speed}
                onChange={e => setSpeed(parseInt(e.target.value))}
                className="w-20 accent-violet-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
            </div>
            <button
              onClick={() => {
                if (isPaused) {
                  setIsPaused(false);
                } else {
                  setIsRunning(!isRunning);
                }
              }}
              className={`px-4 py-2 rounded-xl font-semibold transition-all text-sm ${
                isRunning && !isPaused
                  ? "bg-amber-500 text-white"
                  : "bg-gradient-to-r from-violet-500 to-purple-500 text-white"
              }`}
            >
              {isPaused ? "Continue" : isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 7: FREE EVOLUTION SANDBOX
// ============================================================================

interface ExtinctLineage {
  r: number;
  d: number;
  extinctAt: number;
}

function FreeEvolutionSection() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [tick, setTick] = useState(0);
  
  const [birthRate, setBirthRate] = useState(0.5);
  const [mutationRate, setMutationRate] = useState(0.15);
  const [mutationImpact, setMutationImpact] = useState(0.02);
  const [startingR, setStartingR] = useState(0.05);
  const [startingD, setStartingD] = useState(0.10);
  const [visibilityThreshold, setVisibilityThreshold] = useState(5);
  
  const entitiesRef = useRef<EvolvingEntity[]>([]);
  const nextIdRef = useRef(0);
  const nextLineageRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousLineagesRef = useRef<Set<number>>(new Set());
  
  const [stats, setStats] = useState({
    total: 0,
    lineages: 0,
    avgR: 0,
    avgD: 0,
    fittestR: 0,
    fittestD: 0,
    baseCount: 0,
  });
  
  const [extinctLineages, setExtinctLineages] = useState<ExtinctLineage[]>([]);
  const lineageDataRef = useRef<Record<number, { r: number; d: number }>>({});

  const MAX_POPULATION = 1500;
  const SANDBOX_CANVAS = 400;
  const BASE_LINEAGE_ID = 0;
  const EXTINCT_FADE_TICKS = 50;
  const MAX_EXTINCT_DISPLAY = 8;

  const getFitnessColor = (r: number, d: number): string => {
    const fitness = (r - d) * 10;
    const hue = Math.max(0, Math.min(120, 60 + fitness * 600));
    const saturation = 70;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const reset = useCallback(() => {
    entitiesRef.current = [];
    setStats({ total: 0, lineages: 0, avgR: 0, avgD: 0, fittestR: 0, fittestD: 0, baseCount: 0 });
    setTick(0);
    setIsPaused(false);
    setIsRunning(false);
    setExtinctLineages([]);
    nextIdRef.current = 0;
    nextLineageRef.current = 1;
    previousLineagesRef.current = new Set();
    lineageDataRef.current = {};
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      const entities = entitiesRef.current;
      const currentTick = tick + 1;
      
      if (entities.length >= MAX_POPULATION) {
        setIsPaused(true);
        return;
      }

      setTick(currentTick);

      const toAdd: EvolvingEntity[] = [];

      if (Math.random() < birthRate) {
        toAdd.push({
          id: nextIdRef.current++,
          x: Math.random() * SANDBOX_CANVAS,
          y: Math.random() * SANDBOX_CANVAS,
          replicationRate: startingR,
          deathRate: startingD,
          generation: 0,
          lineageId: BASE_LINEAGE_ID,
        });
        if (!lineageDataRef.current[BASE_LINEAGE_ID]) {
          lineageDataRef.current[BASE_LINEAGE_ID] = { r: startingR, d: startingD };
        }
      }

      const surviving = entities.filter(e => {
        if (Math.random() < e.replicationRate) {
          let offspringR = e.replicationRate;
          let offspringD = e.deathRate;
          let offspringLineage = e.lineageId;

          if (Math.random() < mutationRate) {
            offspringR = Math.max(0.01, Math.min(0.30, offspringR + (Math.random() - 0.5) * 2 * mutationImpact));
            offspringD = Math.max(0.01, Math.min(0.30, offspringD + (Math.random() - 0.5) * 2 * mutationImpact));
            offspringLineage = nextLineageRef.current++;
            lineageDataRef.current[offspringLineage] = { r: offspringR, d: offspringD };
          }

          toAdd.push({
            id: nextIdRef.current++,
            x: Math.max(0, Math.min(SANDBOX_CANVAS, e.x + (Math.random() - 0.5) * 30)),
            y: Math.max(0, Math.min(SANDBOX_CANVAS, e.y + (Math.random() - 0.5) * 30)),
            replicationRate: offspringR,
            deathRate: offspringD,
            generation: e.generation + 1,
            lineageId: offspringLineage,
          });
        }

        return Math.random() >= e.deathRate;
      });

      entitiesRef.current = [...surviving, ...toAdd];

      const all = entitiesRef.current;
      const currentLineages = new Set(all.map(e => e.lineageId));
      
      const newExtinct: ExtinctLineage[] = [];
      previousLineagesRef.current.forEach(lineageId => {
        if (!currentLineages.has(lineageId) && lineageId !== BASE_LINEAGE_ID) {
          const data = lineageDataRef.current[lineageId];
          if (data) {
            newExtinct.push({ r: data.r, d: data.d, extinctAt: currentTick });
          }
        }
      });
      
      if (newExtinct.length > 0) {
        setExtinctLineages(prev => {
          const updated = [...prev, ...newExtinct]
            .filter(e => currentTick - e.extinctAt < EXTINCT_FADE_TICKS)
            .slice(-20);
          return updated;
        });
      } else {
        setExtinctLineages(prev => 
          prev.filter(e => currentTick - e.extinctAt < EXTINCT_FADE_TICKS)
        );
      }
      
      previousLineagesRef.current = currentLineages;

      if (all.length > 0) {
        const lineageSet = new Set(all.map(e => e.lineageId));
        const avgR = all.reduce((sum, e) => sum + e.replicationRate, 0) / all.length;
        const avgD = all.reduce((sum, e) => sum + e.deathRate, 0) / all.length;
        const baseCount = all.filter(e => e.lineageId === BASE_LINEAGE_ID).length;
        
        let fittest = all[0];
        all.forEach(e => {
          if ((e.replicationRate - e.deathRate) > (fittest.replicationRate - fittest.deathRate)) {
            fittest = e;
          }
        });

        setStats({
          total: all.length,
          lineages: lineageSet.size,
          avgR,
          avgD,
          fittestR: fittest.replicationRate,
          fittestD: fittest.deathRate,
          baseCount,
        });
      } else {
        setStats({ total: 0, lineages: 0, avgR: 0, avgD: 0, fittestR: 0, fittestD: 0, baseCount: 0 });
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, speed, birthRate, mutationRate, mutationImpact, startingR, startingD, tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SANDBOX_CANVAS, SANDBOX_CANVAS);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= SANDBOX_CANVAS; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, SANDBOX_CANVAS);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(SANDBOX_CANVAS, i);
      ctx.stroke();
    }

    const lineageCounts: Record<number, number> = {};
    entitiesRef.current.forEach(e => {
      lineageCounts[e.lineageId] = (lineageCounts[e.lineageId] || 0) + 1;
    });

    entitiesRef.current.forEach(e => {
      const isBaseSpecies = e.lineageId === BASE_LINEAGE_ID;
      if (!isBaseSpecies && lineageCounts[e.lineageId] < visibilityThreshold) return;
      
      const fitness = e.replicationRate - e.deathRate;
      const size = fitness > 0 ? 4 + fitness * 20 : Math.max(2, 4 + fitness * 20);
      
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(2, Math.min(8, size)), 0, Math.PI * 2);
      ctx.fillStyle = getFitnessColor(e.replicationRate, e.deathRate);
      ctx.fill();
    });
  }, [stats, visibilityThreshold]);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-100 bg-white/20 px-2 py-0.5 rounded">
              Sandbox
            </span>
          </div>
          <h2 className="text-white font-semibold text-lg mt-1">
            Watch Evolution Happen
          </h2>
          <p className="text-emerald-100 text-sm">
            Mutations randomly adjust R and D values. Watch winners emerge naturally.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Base Species Display & Controls */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                style={{ backgroundColor: getFitnessColor(startingR, startingD) }}
              >
                B
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Base Species</p>
                <p className="text-xs text-gray-500">The only species with spontaneous birth. Must be stable or declining.</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-sm">
                  <span className="text-blue-600 font-medium">Pop: {stats.baseCount}</span>
                </div>
                <span className={`text-xs ${startingR < startingD ? 'text-amber-600' : 'text-gray-500'}`}>
                  Net: {((startingR - startingD) * 100).toFixed(0)}% ({startingR < startingD ? 'Declining' : 'Stable'})
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Birth Rate (B): {(birthRate * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={birthRate * 100}
                  onChange={e => setBirthRate(parseInt(e.target.value) / 100)}
                  className="w-full accent-blue-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Replication (R): {(startingR * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={startingR * 100}
                  onChange={e => {
                    const newR = parseInt(e.target.value) / 100;
                    setStartingR(newR);
                    if (newR > startingD) {
                      setStartingD(newR);
                    }
                  }}
                  className="w-full accent-green-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-emerald-200"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Death (D): {(startingD * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min={startingR * 100}
                  max="30"
                  value={startingD * 100}
                  onChange={e => setStartingD(parseInt(e.target.value) / 100)}
                  className="w-full accent-red-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-emerald-200"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">D must be ≥ R (base species cannot have exponential growth)</p>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            While chance still plays a role in every run, certain parameters affect how quickly an exponential 
            species can take over. Experiment to test how many ticks (time passed) until the simulation 
            population limit is reached.
          </p>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Parameters</p>
              
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Mutation Rate: {(mutationRate * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={mutationRate * 100}
                  onChange={e => setMutationRate(parseInt(e.target.value) / 100)}
                  className="w-full accent-pink-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Mutation Impact: ±{(mutationImpact * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={mutationImpact * 1000}
                  onChange={e => setMutationImpact(parseInt(e.target.value) / 1000)}
                  className="w-full accent-orange-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Visibility Threshold: {visibilityThreshold} individuals
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={visibilityThreshold}
                  onChange={e => setVisibilityThreshold(parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Only show lineages with at least this many individuals
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Statistics</p>
                <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                  Tick: {tick}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Population:</span>
                  <span className="text-gray-800 font-bold ml-2">{stats.total}</span>
                </div>
                <div>
                  <span className="text-gray-500">Lineages:</span>
                  <span className="text-gray-800 font-bold ml-2">{stats.lineages}</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg R:</span>
                  <span className="text-green-600 font-bold ml-2">{(stats.avgR * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg D:</span>
                  <span className="text-red-600 font-bold ml-2">{(stats.avgD * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Fittest Individual (current)</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full shadow"
                    style={{ backgroundColor: getFitnessColor(stats.fittestR, stats.fittestD) }}
                  />
                  <div className="text-sm">
                    <span className="text-green-600">R={(stats.fittestR * 100).toFixed(1)}%</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-red-600">D={(stats.fittestD * 100).toFixed(1)}%</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className={stats.fittestR > stats.fittestD ? "text-emerald-600" : "text-amber-600"}>
                      Net: {((stats.fittestR - stats.fittestD) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Color Legend</p>
                <div className="flex items-center gap-1">
                  <div className="h-3 flex-1 rounded" style={{ background: "linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%))" }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>R &lt; D (Declining)</span>
                  <span>R &gt; D (Growing)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extinct Lineages */}
          {extinctLineages.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Recently Extinct Mutations</p>
              <div className="flex flex-wrap gap-1.5">
                {extinctLineages.slice(-MAX_EXTINCT_DISPLAY).map((extinct, idx) => {
                  const age = tick - extinct.extinctAt;
                  const opacity = Math.max(0.2, 1 - (age / EXTINCT_FADE_TICKS));
                  return (
                    <div
                      key={`extinct-${idx}-${extinct.extinctAt}`}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-gray-200"
                      style={{ opacity }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getFitnessColor(extinct.r, extinct.d) }}
                      />
                      <span className="text-xs text-gray-500">
                        {((extinct.r - extinct.d) * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
                {extinctLineages.length > MAX_EXTINCT_DISPLAY && (
                  <span className="text-xs text-gray-400 self-center">
                    +{extinctLineages.length - MAX_EXTINCT_DISPLAY} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={SANDBOX_CANVAS}
              height={SANDBOX_CANVAS}
              className="rounded-xl border border-gray-200"
            />
          </div>

          {/* Play Controls */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Speed:</span>
              <input
                type="range"
                min="20"
                max="120"
                step="10"
                value={speed}
                onChange={e => setSpeed(parseInt(e.target.value))}
                className="w-20 accent-emerald-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
            </div>
            <button
              onClick={() => {
                if (isPaused) {
                  setIsPaused(false);
                } else {
                  setIsRunning(!isRunning);
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                isRunning && !isPaused
                  ? "bg-amber-500 text-white"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              }`}
            >
              {isPaused ? "Continue" : isRunning ? "Pause" : "Start Evolution"}
            </button>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              Reset
            </button>
          </div>

          {isPaused && (
            <p className="text-center text-amber-600 text-sm">
              Simulation paused at {MAX_POPULATION} entities to maintain performance.
            </p>
          )}

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-700">How it works:</strong> Each entity has its own R and D values. 
              When they replicate, there&apos;s a chance the offspring mutates with slightly different rates. 
              Over time, entities with R &gt; D thrive and dominate. Watch the colors shift from red 
              (struggling) toward green (thriving) as evolution favors the fittest.
            </p>
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

        {/* Sandbox Section Divider */}
        <div className="relative py-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gradient-to-b from-purple-50 via-white to-indigo-50 px-4 text-sm text-slate-500 font-medium">
              Sandbox Mode
            </span>
          </div>
        </div>

        <CustomMutationTreeSection />
        <FreeEvolutionSection />

        <div className="h-8"></div>
      </div>
    </div>
  );
}
