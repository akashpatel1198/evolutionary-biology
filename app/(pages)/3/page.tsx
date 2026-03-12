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
  AreaChart,
  Area,
  Legend,
} from "recharts";

interface Species {
  id: number;
  parentId: number | null;
  color: string;
  deathRate: number;
  replicationRate: number;
}

interface Entity {
  id: number;
  x: number;
  y: number;
  speciesId: number;
}

interface HistoryPoint {
  tick: number;
  total: number;
  [key: string]: number; // species_0, species_1, etc.
}

const CANVAS_SIZE = 400;
const ENTITY_RADIUS = 6;
const MAX_ENTITIES = 300;

const SPECIES_COLORS = [
  "#059669", // emerald (original)
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // violet
  "#eab308", // yellow
  "#22c55e", // green
  "#e11d48", // rose
];

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function Page3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birthRate, setBirthRate] = useState(0.05);
  const [baseDeathRate, setBaseDeathRate] = useState(0.015);
  const [baseReplicationRate, setBaseReplicationRate] = useState(0.04);
  const [mutationChance, setMutationChance] = useState(0.15);
  const [mutationStrength, setMutationStrength] = useState(0.008);
  const [maxSpecies, setMaxSpecies] = useState(10);

  const [species, setSpecies] = useState<Species[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [chartMode, setChartMode] = useState<"stacked" | "lines">("stacked");

  const nextEntityIdRef = useRef(0);
  const nextSpeciesIdRef = useRef(0);

  const createOriginalSpecies = useCallback((): Species => {
    return {
      id: 0,
      parentId: null,
      color: SPECIES_COLORS[0],
      deathRate: baseDeathRate,
      replicationRate: baseReplicationRate,
    };
  }, [baseDeathRate, baseReplicationRate]);

  // Update original species when sliders change
  useEffect(() => {
    setSpecies((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const originalIndex = updated.findIndex((s) => s.id === 0);
      if (originalIndex !== -1) {
        updated[originalIndex] = {
          ...updated[originalIndex],
          deathRate: baseDeathRate,
          replicationRate: baseReplicationRate,
        };
      }
      return updated;
    });
  }, [baseDeathRate, baseReplicationRate]);

  const reset = useCallback(() => {
    const originalSpecies = createOriginalSpecies();
    setSpecies([originalSpecies]);
    setEntities([]);
    setHistory([]);
    setTick(0);
    nextEntityIdRef.current = 0;
    nextSpeciesIdRef.current = 1;
  }, [createOriginalSpecies]);

  useEffect(() => {
    if (species.length === 0) {
      reset();
    }
  }, [species.length, reset]);

  const getSpeciesById = useCallback(
    (id: number): Species | undefined => {
      return species.find((s) => s.id === id);
    },
    [species]
  );

  const spawnEntity = useCallback(
    (speciesId: number, nearX?: number, nearY?: number): Entity => {
      const x =
        nearX !== undefined
          ? Math.max(0, Math.min(CANVAS_SIZE, nearX + (Math.random() - 0.5) * 30))
          : Math.random() * CANVAS_SIZE;
      const y =
        nearY !== undefined
          ? Math.max(0, Math.min(CANVAS_SIZE, nearY + (Math.random() - 0.5) * 30))
          : Math.random() * CANVAS_SIZE;
      return {
        id: nextEntityIdRef.current++,
        x,
        y,
        speciesId,
      };
    },
    []
  );

  const tryCreateMutatedSpecies = useCallback(
    (parentSpecies: Species): Species | null => {
      if (species.length >= maxSpecies) {
        return null;
      }

      const rand = Math.random();
      let statsToChange: number;
      if (rand < 0.7) {
        statsToChange = 1;
      } else if (rand < 0.95) {
        statsToChange = 2;
      } else {
        statsToChange = 3;
      }

      const stats = ["deathRate", "replicationRate"] as const;
      const toChange = new Set<number>();
      while (toChange.size < Math.min(statsToChange, stats.length)) {
        toChange.add(Math.floor(Math.random() * stats.length));
      }

      let newDeathRate = parentSpecies.deathRate;
      let newReplicationRate = parentSpecies.replicationRate;

      if (toChange.has(0)) {
        newDeathRate = clamp(
          parentSpecies.deathRate + gaussianRandom(0, mutationStrength),
          0.001,
          0.1
        );
      }
      if (toChange.has(1)) {
        newReplicationRate = clamp(
          parentSpecies.replicationRate + gaussianRandom(0, mutationStrength),
          0.001,
          0.1
        );
      }

      const newSpecies: Species = {
        id: nextSpeciesIdRef.current++,
        parentId: parentSpecies.id,
        color: SPECIES_COLORS[species.length % SPECIES_COLORS.length],
        deathRate: newDeathRate,
        replicationRate: newReplicationRate,
      };

      return newSpecies;
    },
    [species.length, maxSpecies, mutationStrength]
  );

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSpecies((prevSpecies) => {
        let updatedSpecies = [...prevSpecies];
        const originalSpecies = updatedSpecies[0];

        setEntities((prevEntities) => {
          let newEntities = [...prevEntities];
          const toAdd: Entity[] = [];

          if (Math.random() < birthRate) {
            toAdd.push(spawnEntity(originalSpecies.id));
          }

          newEntities = newEntities.filter((entity) => {
            const entitySpecies = updatedSpecies.find(
              (s) => s.id === entity.speciesId
            );
            if (!entitySpecies) return false;

            if (
              Math.random() < entitySpecies.replicationRate &&
              newEntities.length + toAdd.length < MAX_ENTITIES
            ) {
              let offspringSpeciesId = entity.speciesId;

              if (Math.random() < mutationChance) {
                const mutated = tryCreateMutatedSpecies(entitySpecies);
                if (mutated) {
                  updatedSpecies = [...updatedSpecies, mutated];
                  offspringSpeciesId = mutated.id;
                }
              }

              toAdd.push(spawnEntity(offspringSpeciesId, entity.x, entity.y));
            }

            return Math.random() >= entitySpecies.deathRate;
          });

          return [...newEntities, ...toAdd];
        });

        return updatedSpecies;
      });

      setTick((t) => t + 1);
    }, 50);

    return () => clearInterval(interval);
  }, [
    isRunning,
    birthRate,
    mutationChance,
    spawnEntity,
    tryCreateMutatedSpecies,
  ]);

  const prevTickRef = useRef(-1);
  useEffect(() => {
    if (tick === prevTickRef.current) return;
    prevTickRef.current = tick;

    if (tick === 0) return;

    const speciesCounts: Record<string, number> = {};
    species.forEach((s) => {
      speciesCounts[`species_${s.id}`] = 0;
    });

    entities.forEach((e) => {
      const key = `species_${e.speciesId}`;
      if (speciesCounts[key] !== undefined) {
        speciesCounts[key]++;
      }
    });

    setHistory((prev) => {
      const newPoint: HistoryPoint = {
        tick,
        total: entities.length,
        ...speciesCounts,
      };

      const newHistory = [...prev, newPoint];
      if (newHistory.length > 200) {
        return newHistory.slice(-200);
      }
      return newHistory;
    });
  }, [tick, entities, species]);

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

    entities.forEach((entity) => {
      const entitySpecies = species.find((s) => s.id === entity.speciesId);
      const color = entitySpecies?.color || "#059669";

      ctx.beginPath();
      ctx.arc(entity.x, entity.y, ENTITY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [entities, species]);

  const speciesWithCounts = species.map((s) => ({
    ...s,
    count: entities.filter((e) => e.speciesId === s.id).length,
  }));

  const activeSpecies = speciesWithCounts.filter((s) => s.count > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-block">
            <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Chapter 3
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Mutations and Speciation
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            When organisms replicate, copying errors can occur —{" "}
            <span className="text-purple-700 font-medium">mutations</span>. These
            changes create new species with different survival characteristics,
            driving the diversity of life.
          </p>
        </section>

        {/* Simulation Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Interactive Simulation
              </h2>
              <p className="text-purple-100 text-sm">
                Watch species branch and evolve through mutations
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

              {/* Inline Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    isRunning
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
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

              {/* Origin Species Parameters */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: SPECIES_COLORS[0] }}
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Original Species Parameters
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  These sliders control the original species (updates live). Mutant
                  species branch off with modified D and R values.
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Birth (B)</span>
                      <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {(birthRate * 100).toFixed(0)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.15"
                      step="0.005"
                      value={birthRate}
                      onChange={(e) => setBirthRate(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Death (D)</span>
                      <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {(baseDeathRate * 100).toFixed(1)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.005"
                      max="0.05"
                      step="0.001"
                      value={baseDeathRate}
                      onChange={(e) => setBaseDeathRate(parseFloat(e.target.value))}
                      className="w-full accent-red-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Replication (R)</span>
                      <span className="font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        {(baseReplicationRate * 100).toFixed(1)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.08"
                      step="0.002"
                      value={baseReplicationRate}
                      onChange={(e) =>
                        setBaseReplicationRate(parseFloat(e.target.value))
                      }
                      className="w-full accent-green-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Mutation Parameters */}
              <div className="pt-4 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-700 mb-3 block">
                  Mutation Parameters
                </span>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Chance</span>
                      <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                        {(mutationChance * 100).toFixed(0)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.01"
                      value={mutationChance}
                      onChange={(e) => setMutationChance(parseFloat(e.target.value))}
                      className="w-full accent-pink-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Strength</span>
                      <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                        {(mutationStrength * 100).toFixed(1)}%
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.002"
                      max="0.025"
                      step="0.001"
                      value={mutationStrength}
                      onChange={(e) =>
                        setMutationStrength(parseFloat(e.target.value))
                      }
                      className="w-full accent-pink-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Max Species</span>
                      <span className="font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        {maxSpecies}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="1"
                      value={maxSpecies}
                      onChange={(e) => setMaxSpecies(parseInt(e.target.value))}
                      className="w-full accent-purple-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* How Mutation Works */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <p className="text-sm font-semibold text-purple-700 mb-2">
                  How Mutations Work
                </p>
                <p className="text-sm text-purple-600">
                  Each replication has a{" "}
                  <strong>{(mutationChance * 100).toFixed(0)}%</strong> chance of
                  mutation. Mutations modify Death and/or Replication rates by up to
                  ±{(mutationStrength * 100).toFixed(1)}%, creating a new species.
                  Species with <strong>higher R and lower D</strong> will outcompete
                  others over time — that&apos;s natural selection!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Species List Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">
                Active Species ({activeSpecies.length}/{maxSpecies})
              </h2>
              <p className="text-indigo-100 text-sm">
                Each species has unique survival characteristics
              </p>
            </div>

            <div className="p-6">
              {activeSpecies.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No active species. Click Start to begin the simulation.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeSpecies
                    .sort((a, b) => b.count - a.count)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div
                          className="w-8 h-8 rounded-lg shadow-inner flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">
                              {s.id === 0 ? "Original" : `Species ${s.id}`}
                            </span>
                            {s.parentId !== null && (
                              <span className="text-xs text-gray-400">
                                (from {s.parentId === 0 ? "Original" : `#${s.parentId}`})
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                            <span>
                              Death:{" "}
                              <span className="font-mono text-red-600">
                                {(s.deathRate * 100).toFixed(1)}%
                              </span>
                            </span>
                            <span>
                              Replication:{" "}
                              <span className="font-mono text-green-600">
                                {(s.replicationRate * 100).toFixed(1)}%
                              </span>
                            </span>
                            <span>
                              Net:{" "}
                              <span
                                className={`font-mono ${
                                  s.replicationRate - s.deathRate >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {((s.replicationRate - s.deathRate) * 100).toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800">
                            {s.count}
                          </p>
                          <p className="text-xs text-gray-400">entities</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-700">
                  Total Population
                </span>
                <span className="text-3xl font-bold text-gray-900">
                  {entities.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Population Over Time Card */}
        <section>
          <div className="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-white font-semibold text-lg">
                  Population Over Time
                </h2>
                <p className="text-blue-100 text-sm">
                  Species competition and dynamics
                </p>
              </div>
              <div className="flex gap-1 bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => setChartMode("stacked")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    chartMode === "stacked"
                      ? "bg-white text-blue-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Stacked
                </button>
                <button
                  onClick={() => setChartMode("lines")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    chartMode === "lines"
                      ? "bg-white text-blue-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Lines
                </button>
              </div>
            </div>

            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                {chartMode === "stacked" ? (
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tick" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    {species.map((s) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={`species_${s.id}`}
                        stackId="1"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.6}
                        isAnimationActive={false}
                        name={s.id === 0 ? "Original" : `Species ${s.id}`}
                      />
                    ))}
                  </AreaChart>
                ) : (
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tick" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#1f2937"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                      name="Total"
                    />
                    {species.map((s) => (
                      <Line
                        key={s.id}
                        type="monotone"
                        dataKey={`species_${s.id}`}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        name={s.id === 0 ? "Original" : `Species ${s.id}`}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>

              <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                {chartMode === "lines" && (
                  <span className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-1 rounded bg-gray-800"></div>
                    Total
                  </span>
                )}
                {activeSpecies.slice(0, 6).map((s) => (
                  <span key={s.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    ></div>
                    {s.id === 0 ? "Original" : `Species ${s.id}`}
                  </span>
                ))}
                {activeSpecies.length > 6 && (
                  <span className="text-sm text-gray-400">
                    +{activeSpecies.length - 6} more
                  </span>
                )}
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
                Imperfect replication creates diversity
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <p className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                  Replication with Mutation
                </p>
                <pre className="text-sm font-mono text-purple-900 whitespace-pre-wrap leading-relaxed">
                  {`when entity replicates:
  if random() < mutation_chance:
    create new species with:
      D' = D ± small_change
      R' = R ± small_change
    offspring joins new species
  else:
    offspring joins parent species`}
                </pre>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-5 border border-slate-200">
                <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  Mutation Distribution
                </p>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-2xl font-bold text-purple-600">70%</p>
                    <p className="text-xs text-gray-500">1 stat changes</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-2xl font-bold text-purple-600">25%</p>
                    <p className="text-xs text-gray-500">2 stats change</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-2xl font-bold text-purple-600">5%</p>
                    <p className="text-xs text-gray-500">All stats change</p>
                  </div>
                </div>
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
                    Mutations create <strong>variation</strong> — the raw material
                    for evolution. Species with higher net growth rates (R &gt; D)
                    will tend to dominate, while less fit species decline. This is
                    natural selection in action, without any explicit &quot;fitness
                    function&quot; — survival emerges from the math.
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
