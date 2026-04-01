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
// HELPER FUNCTIONS
// ============================================================================

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function binomialSample(n: number, p: number): number {
  if (n <= 0) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return n;

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
  const [showExpBonus, setShowExpBonus] = useState(false);

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

  const expPopulationData = useMemo(() => {
    const data = [];
    let N = 5;
    const r = R - D;
    for (let t = 0; t <= 100; t += 1) {
      data.push({ t, N: Math.round(N) });
      N = N + r * N;
      if (N > 100000) N = 100000;
      if (N < 0) N = 0;
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
                  aria-label="Replication rate"
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
                  aria-label="Death rate"
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
                    domain={[
                      (dataMin: number) => Math.min(dataMin, -2),
                      (dataMax: number) => Math.max(dataMax, 2)
                    ]}
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

          {/* Bonus Section - Derivative Explanation for Exponential */}
          <div className="border border-purple-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowExpBonus(!showExpBonus)}
              className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between"
            >
              <span className="text-sm font-semibold text-purple-700">
                Bonus: The Derivative Perspective
                <span className="text-sm text-purple-400 ml-2 font-normal italic">*charts wonky, working on fix</span>
              </span>
              <svg
                className={`w-5 h-5 text-purple-500 transition-transform ${showExpBonus ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExpBonus && (
              <div className="p-4 space-y-4 bg-white">
                <p className="text-sm text-gray-600">
                  The exponential growth equation <span className="font-mono bg-slate-100 px-1 rounded">Δ = (R - D) × N</span> is 
                  a <strong>linear</strong> function of N. Its derivative is remarkably simple:
                </p>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-sm text-amber-600 mb-2">Derivative of Δ with respect to N:</p>
                  <p className="text-lg font-mono text-amber-800 text-center">
                    dΔ/dN = R - D = {(slope * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-amber-600 text-center mt-2">
                    The slope is <strong>constant</strong> — it doesn't depend on N at all
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className={`rounded-lg p-3 border ${isExponential ? 'bg-red-50 border-red-200' : slope < 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-xs font-semibold ${isExponential ? 'text-red-700' : slope < 0 ? 'text-blue-700' : 'text-gray-700'}`}>
                        {isExponential ? 'dΔ/dN > 0 (Constant Positive)' : slope < 0 ? 'dΔ/dN < 0 (Constant Negative)' : 'dΔ/dN = 0 (Flat)'}
                      </p>
                      <p className={`text-xs ${isExponential ? 'text-red-600' : slope < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                        {isExponential 
                          ? 'Every additional creature adds the same positive growth. No diminishing returns, no limits — pure exponential explosion.' 
                          : slope < 0 
                          ? 'Every additional creature adds the same negative growth. Population shrinks exponentially toward zero.'
                          : 'No growth or decline. Population stays constant at any level.'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-600">
                        <strong>Why this is unrealistic:</strong> In nature, resources are limited. 
                        A constant growth rate regardless of population size ignores competition for food, space, and mates.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Expected Population Over Time
                    </p>
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={expPopulationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="t" fontSize={10} label={{ value: "Time", position: "bottom", fontSize: 10, offset: -5 }} />
                        <YAxis fontSize={10} domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, 20)]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="N"
                          stroke={isExponential ? "#ef4444" : "#3b82f6"}
                          fill={isExponential ? "#fecaca" : "#bfdbfe"}
                          fillOpacity={0.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {isExponential 
                        ? 'Exponential growth: shoots up with no ceiling' 
                        : slope < 0 
                        ? 'Exponential decay: shrinks toward zero'
                        : 'Flat: population unchanged over time'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs text-slate-600">
                    <strong>Key insight:</strong> The constant derivative explains why exponential growth is unsustainable. 
                    In the next section, we'll add a crowding term that makes dΔ/dN decrease as population grows, 
                    creating the self-limiting behavior we see in nature.
                  </p>
                </div>
              </div>
            )}
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
  const [showBonus, setShowBonus] = useState(false);

  const carryingCapacity = C > 0 ? (R - D) / C : Infinity;
  const inflectionPoint = carryingCapacity / 2;

  const deltaData = useMemo(() => {
    const data = [];
    const maxN = Math.min(150, Math.max(80, carryingCapacity * 1.5));
    for (let N = 0; N <= maxN; N += 2) {
      data.push({
        N,
        delta: (R - D - C * N) * N,
      });
    }
    return data;
  }, [R, D, C, carryingCapacity]);

  const derivativeData = useMemo(() => {
    const data = [];
    const maxN = Math.min(150, Math.max(80, carryingCapacity * 1.5));
    for (let N = 0; N <= maxN; N += 2) {
      data.push({
        N,
        derivative: R - D - 2 * C * N,
      });
    }
    return data;
  }, [R, D, C, carryingCapacity]);

  const populationOverTimeData = useMemo(() => {
    const data = [];
    let N = 5;
    const K = carryingCapacity;
    for (let t = 0; t <= 150; t += 1) {
      data.push({ t, N: Math.round(N) });
      const delta = (R - D - C * N) * N;
      N = Math.max(0, N + delta);
      if (N > K * 1.2) N = K * 1.2;
    }
    return data;
  }, [R, D, C, carryingCapacity]);

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-gray-500 mb-2">Without crowding:</p>
              <p className="text-lg font-mono text-slate-800 text-center">
                Δ = (R - D) × N
              </p>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>R</span>
                    <span className="font-mono text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-xs">
                      {(R * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Replication rate"
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
                    aria-label="Death rate"
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
                    aria-label="Crowding coefficient"
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
                      <XAxis dataKey="N" fontSize={10} domain={[0, 'dataMax']} />
                      <YAxis 
                        fontSize={10} 
                        domain={[
                          (dataMin: number) => Math.min(dataMin * 1.1, -0.5),
                          (dataMax: number) => Math.max(dataMax * 1.1, 0.5)
                        ]}
                      />
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

              {/* Bonus Section - Derivative Explanation */}
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowBonus(!showBonus)}
                  className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-semibold text-purple-700">
                    Bonus: The Derivative Perspective
                    <span className="text-sm text-purple-400 ml-2 font-normal italic">*charts wonky, working on fix</span>
                  </span>
                  <svg
                    className={`w-5 h-5 text-purple-500 transition-transform ${showBonus ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showBonus && (
                  <div className="p-4 space-y-4 bg-white">
                    <p className="text-sm text-gray-600">
                      The change equation <span className="font-mono bg-slate-100 px-1 rounded">Δ = (R - D - C×N) × N</span> is 
                      a parabola in N. Its <strong>derivative</strong> tells us how the growth rate itself changes as population grows:
                    </p>

                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <p className="text-sm text-purple-600 mb-2">Derivative of Δ with respect to N:</p>
                      <p className="text-lg font-mono text-purple-800 text-center">
                        dΔ/dN = R - D - 2CN
                      </p>
                      <p className="text-xs text-purple-600 text-center mt-2">
                        This is the <strong>slope</strong> of the Δ vs N parabola at any point
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          dΔ/dN vs N (rate of change of growth)
                        </p>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={derivativeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="N" fontSize={10} domain={[0, 'dataMax']} />
                            <YAxis 
                              fontSize={10}
                              domain={[
                                (dataMin: number) => Math.min(dataMin * 1.1, -0.02),
                                (dataMax: number) => Math.max(dataMax * 1.1, 0.02)
                              ]}
                            />
                            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                            {inflectionPoint > 0 && inflectionPoint < 150 && (
                              <ReferenceLine
                                x={Math.round(inflectionPoint)}
                                stroke="#8b5cf6"
                                strokeDasharray="4 4"
                                label={{
                                  value: `K/2=${Math.round(inflectionPoint)}`,
                                  fill: "#8b5cf6",
                                  fontSize: 10,
                                }}
                              />
                            )}
                            <Line
                              type="monotone"
                              dataKey="derivative"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-xs font-semibold text-green-700">When dΔ/dN &gt; 0</p>
                          <p className="text-xs text-green-600">
                            Growth is accelerating. The population is in the exponential-like phase of the S-curve.
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="text-xs font-semibold text-purple-700">When dΔ/dN = 0 (at N = K/2)</p>
                          <p className="text-xs text-purple-600">
                            Maximum growth rate! This is the <strong>inflection point</strong> of the S-curve.
                            At K/2 = <span className="font-bold">{Math.round(inflectionPoint)}</span>, population grows fastest.
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <p className="text-xs font-semibold text-red-700">When dΔ/dN &lt; 0</p>
                          <p className="text-xs text-red-600">
                            Growth is decelerating. Population is approaching carrying capacity and leveling off.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expected Population Over Time */}
                    <div className="pt-4 border-t border-purple-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Expected Population Over Time (the S-curve)
                      </p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={populationOverTimeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="t" fontSize={10} label={{ value: "Time", position: "bottom", fontSize: 10, offset: -5 }} />
                          <YAxis 
                            fontSize={10} 
                            domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, Math.round(carryingCapacity * 1.1))]}
                            label={{ value: "N", position: "left", fontSize: 10, angle: -90, offset: 10 }} 
                          />
                          <Tooltip />
                          <ReferenceLine
                            y={Math.round(carryingCapacity)}
                            stroke="#f97316"
                            strokeDasharray="4 4"
                            label={{
                              value: `K=${Math.round(carryingCapacity)}`,
                              fill: "#f97316",
                              fontSize: 10,
                              position: "right",
                            }}
                          />
                          {inflectionPoint > 0 && inflectionPoint < carryingCapacity && (
                            <ReferenceLine
                              y={Math.round(inflectionPoint)}
                              stroke="#8b5cf6"
                              strokeDasharray="4 4"
                              label={{
                                value: `K/2=${Math.round(inflectionPoint)}`,
                                fill: "#8b5cf6",
                                fontSize: 10,
                                position: "right",
                              }}
                            />
                          )}
                          <Area
                            type="monotone"
                            dataKey="N"
                            stroke="#8b5cf6"
                            fill="#ddd6fe"
                            fillOpacity={0.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Notice the S-shape: fast growth early, inflection at K/2, then leveling off at K
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-600">
                        <strong>Key insight:</strong> The S-curve shape comes from growth that first accelerates (positive derivative), 
                        peaks at K/2, then decelerates (negative derivative) until equilibrium at K.
                      </p>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4: LOGISTIC GROWTH SIMULATION
// ============================================================================

const LOGISTIC_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const MAX_LOGISTIC_SIMS = 6;

interface LogisticSim {
  id: string;
  color: string;
  population: number;
}

interface LogisticHistoryPoint {
  tick: number;
  [key: string]: number;
}

function LogisticGrowthSection() {
  const [simulations, setSimulations] = useState<LogisticSim[]>([
    { id: "sim-0", color: LOGISTIC_COLORS[0], population: 5 },
  ]);
  const [history, setHistory] = useState<LogisticHistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [R, setR] = useState(0.1);
  const [D, setD] = useState(0.05);
  const [K, setK] = useState(100);

  const C = (R - D) / K;
  const carryingCapacity = K;

  const addSimulation = useCallback(() => {
    if (simulations.length >= MAX_LOGISTIC_SIMS) return;
    setSimulations((prev) => [
      ...prev,
      {
        id: `sim-${prev.length}`,
        color: LOGISTIC_COLORS[prev.length % LOGISTIC_COLORS.length],
        population: 5,
      },
    ]);
  }, [simulations.length]);

  const removeSimulation = useCallback((id: string) => {
    setSimulations((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, index) => ({
        ...s,
        id: `sim-${index}`,
        color: LOGISTIC_COLORS[index % LOGISTIC_COLORS.length],
      }));
    });
  }, []);

  const reset = useCallback(() => {
    setSimulations((prev) => prev.map((s) => ({ ...s, population: 5 })));
    setHistory([]);
    setTick(0);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      setSimulations((prev) =>
        prev.map((sim) => {
          let pop = sim.population;
          const N = pop;

          const effectiveD = D + C * N;

          const replications = binomialSample(pop, R);
          const deaths = binomialSample(pop, effectiveD);
          pop = Math.max(0, pop + replications - deaths);

          return { ...sim, population: pop };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, R, D, C]);

  useEffect(() => {
    if (tick === 0) return;
    setHistory((prev) => {
      const newPoint: LogisticHistoryPoint = { tick };
      simulations.forEach((sim) => {
        newPoint[sim.id] = sim.population;
      });
      const newHistory = [...prev, newPoint];
      return newHistory.length > 300 ? newHistory.slice(-300) : newHistory;
    });
  }, [tick, simulations]);

  const avgPopulation = simulations.length > 0
    ? Math.round(simulations.reduce((sum, s) => sum + s.population, 0) / simulations.length)
    : 0;

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-semibold text-gray-800">
                    Species Parameters
                  </span>
                  <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                    R - D = +{((R - D) * 100).toFixed(0)}% (Growing)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">R</p>
                    <p className="font-mono font-bold text-green-600">{(R * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">D (base)</p>
                    <p className="font-mono font-bold text-red-600">{(D * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <p className="text-gray-500">K</p>
                    <p className="font-mono font-bold text-orange-600">{K}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Replication Rate (R)</span>
                    <span className="font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">
                      {(R * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Replication rate"
                    min="0.02"
                    max="0.25"
                    step="0.01"
                    value={R}
                    onChange={(e) => {
                      const newR = parseFloat(e.target.value);
                      setR(newR);
                      if (D >= newR) setD(Math.max(0.01, newR - 0.01));
                    }}
                    className="w-full accent-green-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Death Rate (D)</span>
                    <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">
                      {(D * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Death rate"
                    min="0.01"
                    max={R - 0.01}
                    step="0.01"
                    value={D}
                    onChange={(e) => setD(parseFloat(e.target.value))}
                    className="w-full accent-red-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-400">D must be less than R for exponential growth</p>
                </div>

                <div className="space-y-1">
                  <label className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Carrying Capacity (K)</span>
                    <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">
                      {K}
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Carrying capacity"
                    min="10"
                    max="1000"
                    step="10"
                    value={K}
                    onChange={(e) => setK(parseFloat(e.target.value))}
                    className="w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                  />
                  <p className="text-xs text-gray-500">
                    Crowding Coefficient C ={" "}
                    <span className="font-mono text-orange-600">
                      {C.toFixed(5)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-xs text-amber-700">
                  <strong>Without crowding</strong>, this population would grow{" "}
                  <span className="font-semibold">exponentially forever</span> since R ({(R * 100).toFixed(0)}%) &gt; D ({(D * 100).toFixed(0)}%).
                  The crowding term <span className="font-mono bg-amber-100 px-1 rounded">C × N</span> prevents
                  unlimited growth by increasing effective death rate as population grows.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {simulations.map((sim, index) => (
                  <div
                    key={sim.id}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border"
                    style={{ borderColor: sim.color }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sim.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Run {index + 1}
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      {sim.population}
                    </span>
                    {simulations.length > 1 && (
                      <button
                        onClick={() => removeSimulation(sim.id)}
                        className="text-gray-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addSimulation}
                  disabled={simulations.length >= MAX_LOGISTIC_SIMS}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Run
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Average Population:</span>
                  <span className="font-bold text-blue-600">{avgPopulation}</span>
                </div>
                {simulations.length > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Multiple runs show how randomness affects convergence to K
                  </p>
                )}
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tick" fontSize={10} hide />
                  <YAxis 
                    fontSize={10} 
                    width={45} 
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, K * 1.2)]}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                  />
                  <Tooltip 
                    formatter={(value) => [value as number, "Population"]}
                    labelFormatter={(label) => `Tick ${label}`}
                  />
                  <ReferenceLine
                    y={carryingCapacity}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    label={{
                      value: `K=${K}`,
                      fill: "#f97316",
                      fontSize: 10,
                    }}
                  />
                  {simulations.map((sim) => (
                    <Line
                      key={sim.id}
                      type="monotone"
                      dataKey={sim.id}
                      stroke={sim.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
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
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-gray-600">
              Notice the <strong>S-curve</strong>: population grows rapidly at
              first (like exponential), then slows as it approaches K. If it
              overshoots K, growth goes negative, pushing it back down.
              Add multiple runs to see how randomness affects individual trajectories while they all converge to K.
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
  const [K, setK] = useState(100);
  const [mutationRate, setMutationRate] = useState(0.01);

  const entitiesRef = useRef<Entity[]>([]);
  const nextIdRef = useRef(0);

  const CREATURES = {
    blue: { color: "#3b82f6", R: 0.1, D: 0.05 },
    green: { color: "#22c55e", R: 0.08, D: 0.05 },
    orange: { color: "#f97316", R: 0.1, D: 0.03 },
  };

  // C is derived from K using blue's R-D as reference
  const C = (CREATURES.blue.R - CREATURES.blue.D) / K;

  const carryingCapacities = {
    blue: K,
    green: C > 0 ? (CREATURES.green.R - CREATURES.green.D) / C : Infinity,
    orange: C > 0 ? (CREATURES.orange.R - CREATURES.orange.D) / C : Infinity,
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
            if (Math.random() < mutationRate) {
              offspringType = "green";
            } else if (Math.random() < mutationRate) {
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
  }, [isRunning, C, mutationRate, K]);

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Blue: R=10%, D=5%, net=+5% (growing) */}
            <div className="bg-blue-50 rounded-lg p-3 border border-green-200 shadow-md shadow-green-200/60 text-center transition-all">
              <div className="w-5 h-5 rounded-full bg-blue-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Blue</p>
              <p className="text-xs text-gray-500">R=10%, D=5%</p>
              <p className="text-xs text-green-600 font-medium">+5% growth</p>
              <p className="text-lg font-bold text-blue-600">{populations.blue}</p>
              <p className="text-xs text-orange-600 mt-1">K={Math.round(carryingCapacities.blue)}</p>
            </div>
            {/* Green: R=8%, D=5%, net=+3% (growing but slower) */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200 shadow-md shadow-green-200/60 text-center transition-all">
              <div className="w-5 h-5 rounded-full bg-green-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Green</p>
              <p className="text-xs text-gray-500">
                <span className="text-red-500">R=8%</span>, D=5%
              </p>
              <p className="text-xs text-green-600 font-medium">+3% growth</p>
              <p className="text-lg font-bold text-green-600">{populations.green}</p>
              <p className="text-xs text-orange-600 mt-1">K={Math.round(carryingCapacities.green)}</p>
            </div>
            {/* Orange: R=10%, D=3%, net=+7% (fastest growing) */}
            <div className="bg-orange-50 rounded-lg p-3 border border-green-200 shadow-md shadow-green-200/60 text-center transition-all">
              <div className="w-5 h-5 rounded-full bg-orange-500 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Orange</p>
              <p className="text-xs text-gray-500">
                R=10%, <span className="text-green-600">D=3%</span>
              </p>
              <p className="text-xs text-green-600 font-medium">+7% growth</p>
              <p className="text-lg font-bold text-orange-600">{populations.orange}</p>
              <p className="text-xs text-orange-600 mt-1">K={Math.round(carryingCapacities.orange)}</p>
            </div>
          </div>

          {/* Control Sliders */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-gray-700">
                <span>Mutation Rate</span>
                <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-xs">
                  {(mutationRate * 100).toFixed(1)}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="0.05"
                step="0.005"
                value={mutationRate}
                onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                className="w-full accent-pink-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
              <p className="text-xs text-gray-500">Chance blue mutates into green or orange</p>
            </div>
            <div className="space-y-2">
              <label className="flex justify-between text-sm font-medium text-gray-700">
                <span>Carrying Capacity (K)</span>
                <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">
                  {K}
                </span>
              </label>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={K}
                onChange={(e) => setK(parseFloat(e.target.value))}
                className="w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />
              <p className="text-xs text-gray-500">
                C = {C.toFixed(5)} (derived from K)
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Carrying capacity simulation visualization"
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="border border-slate-200 rounded-xl max-w-full h-auto"
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
                Key Insight
              </h2>
              <p className="text-emerald-100 text-lg leading-relaxed">
                We&apos;ve now covered the three pillars of evolution:
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-2">1</p>
              <p className="font-semibold text-white">Replication</p>
              <p className="text-emerald-200 text-sm mt-1">
                Populations can grow
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-2">2</p>
              <p className="font-semibold text-white">Mutation</p>
              <p className="text-emerald-200 text-sm mt-1">
                Diversity appears
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white mb-2">3</p>
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
// SECTION 7: COMPETITION SANDBOX
// ============================================================================

const SANDBOX_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];
const SANDBOX_COLOR_NAMES = ["Blue", "Green", "Orange", "Red", "Purple", "Pink", "Teal", "Amber"];
const MAX_SANDBOX_SPECIES = 8;

interface SandboxSpecies {
  id: string;
  name: string;
  color: string;
  R: number;
  D: number;
  startingPop: number;
}

interface SandboxHistoryPoint {
  tick: number;
  [key: string]: number;
}

interface ExtinctionEvent {
  tick: number;
  speciesId: string;
  speciesName: string;
  color: string;
}

function CompetitionSandboxSection() {
  const [species, setSpecies] = useState<SandboxSpecies[]>([
    { id: "sp-0", name: "Blue", color: SANDBOX_COLORS[0], R: 0.10, D: 0.05, startingPop: 20 },
    { id: "sp-1", name: "Green", color: SANDBOX_COLORS[1], R: 0.08, D: 0.04, startingPop: 20 },
  ]);
  const [populations, setPopulations] = useState<{ [speciesId: string]: number }>({});
  const [history, setHistory] = useState<SandboxHistoryPoint[]>([]);
  const [tick, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [C, setC] = useState(0.0005);
  const [extinctions, setExtinctions] = useState<ExtinctionEvent[]>([]);
  const prevPopulationsRef = useRef<{ [speciesId: string]: number }>({});

  const addSpecies = useCallback(() => {
    if (species.length >= MAX_SANDBOX_SPECIES) return;
    const idx = species.length;
    setSpecies((prev) => [
      ...prev,
      {
        id: `sp-${Date.now()}`,
        name: SANDBOX_COLOR_NAMES[idx % SANDBOX_COLOR_NAMES.length],
        color: SANDBOX_COLORS[idx % SANDBOX_COLORS.length],
        R: 0.08 + Math.random() * 0.04,
        D: 0.03 + Math.random() * 0.03,
        startingPop: 20,
      },
    ]);
  }, [species.length]);

  const removeSpecies = useCallback((id: string) => {
    setSpecies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSpecies = useCallback((id: string, updates: Partial<SandboxSpecies>) => {
    setSpecies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const reset = useCallback(() => {
    const initialPops: { [speciesId: string]: number } = {};
    species.forEach((s) => {
      initialPops[s.id] = s.startingPop;
    });
    setPopulations(initialPops);
    prevPopulationsRef.current = { ...initialPops };
    setHistory([]);
    setTick(0);
    setExtinctions([]);
  }, [species]);

  const randomizeSpecies = useCallback((type: 'random' | 'balanced' | 'underdog') => {
    if (type === 'random') {
      setSpecies((prev) =>
        prev.map((s) => ({
          ...s,
          R: 0.05 + Math.random() * 0.1,
          D: 0.02 + Math.random() * 0.06,
        }))
      );
    } else if (type === 'balanced') {
      const baseR = 0.08;
      const baseD = 0.04;
      setSpecies((prev) =>
        prev.map((s) => ({
          ...s,
          R: baseR + (Math.random() - 0.5) * 0.01,
          D: baseD + (Math.random() - 0.5) * 0.01,
        }))
      );
    } else if (type === 'underdog') {
      setSpecies((prev) =>
        prev.map((s, i) => ({
          ...s,
          R: i === 0 ? 0.06 : 0.10,
          D: i === 0 ? 0.05 : 0.04,
          startingPop: i === 0 ? 50 : 10,
        }))
      );
    }
  }, []);

  // Initialize populations on mount or species change
  useEffect(() => {
    reset();
  }, [reset]);

  // Simulation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);

      setPopulations((prevPops) => {
        const newPops = { ...prevPops };
        const totalN = Object.values(newPops).reduce((sum, n) => sum + n, 0);

        species.forEach((sp) => {
          const pop = newPops[sp.id] || 0;
          if (pop <= 0) {
            newPops[sp.id] = 0;
            return;
          }

          const effectiveD = sp.D + C * totalN;
          const replications = binomialSample(pop, sp.R);
          const deaths = binomialSample(pop, Math.min(effectiveD, 1));
          newPops[sp.id] = Math.max(0, pop + replications - deaths);
        });

        return newPops;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, species, C]);

  // Record history and detect extinctions
  useEffect(() => {
    if (tick === 0) return;
    
    // Check for extinctions
    species.forEach((sp) => {
      const prevPop = prevPopulationsRef.current[sp.id] || 0;
      const currentPop = populations[sp.id] || 0;
      if (prevPop > 0 && currentPop === 0) {
        setExtinctions((prev) => [
          ...prev,
          { tick, speciesId: sp.id, speciesName: sp.name, color: sp.color }
        ]);
      }
    });
    prevPopulationsRef.current = { ...populations };

    setHistory((prev) => {
      const newPoint: SandboxHistoryPoint = { tick };
      species.forEach((sp) => {
        newPoint[sp.id] = populations[sp.id] || 0;
      });
      const newHistory = [...prev, newPoint];
      return newHistory.length > 400 ? newHistory.slice(-400) : newHistory;
    });
  }, [tick, populations, species]);

  const totalPop = Object.values(populations).reduce((sum, n) => sum + n, 0);

  // Get max K across species for chart scaling
  const maxSpeciesK = Math.max(...species.map(sp => {
    const netGrowth = sp.R - sp.D;
    return C > 0 && netGrowth > 0 ? netGrowth / C : 100;
  }));

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100/50 border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">
            Competition Sandbox
          </h2>
          <p className="text-indigo-100 text-sm">
            Create species, set their fitness, and watch them compete for limited resources
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Context Card */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
            <p className="text-sm text-indigo-700 mb-2">
              <strong>How it works:</strong> Each species has a replication rate (R) and base death rate (D). 
              There are no spontaneous births (B=0) — populations grow only through replication.
            </p>
            <p className="text-sm text-indigo-600">
              All species share the same crowding coefficient (C), meaning they compete for identical resources. 
              The effective death rate for each individual is <span className="font-mono bg-indigo-100 px-1 rounded">D + C × total_population</span>.
            </p>
          </div>

          {/* Species List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Species</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => randomizeSpecies('random')}
                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  Random
                </button>
                <button
                  onClick={() => randomizeSpecies('balanced')}
                  className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  Balanced
                </button>
                <button
                  onClick={() => randomizeSpecies('underdog')}
                  className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-600 hover:bg-orange-200"
                >
                  Underdog
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {species.map((sp) => {
                const netGrowth = sp.R - sp.D;
                const speciesK = C > 0 && netGrowth > 0 ? netGrowth / C : 0;
                const currentPop = populations[sp.id] || 0;
                const glowClass = netGrowth > 0.001 
                  ? "border-green-300 shadow-sm shadow-green-200/60" 
                  : netGrowth < -0.001 
                  ? "border-red-300 shadow-sm shadow-red-200/60" 
                  : "border-orange-300 shadow-sm shadow-orange-200/60";

                return (
                  <div key={sp.id} className={`bg-gray-50 rounded-xl p-3 border ${glowClass}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: sp.color }}
                        onClick={() => {
                          const currentIdx = SANDBOX_COLORS.indexOf(sp.color);
                          const nextIdx = (currentIdx + 1) % SANDBOX_COLORS.length;
                          updateSpecies(sp.id, { 
                            color: SANDBOX_COLORS[nextIdx],
                            name: SANDBOX_COLOR_NAMES[nextIdx]
                          });
                        }}
                      />
                      <input
                        type="text"
                        value={sp.name}
                        onChange={(e) => updateSpecies(sp.id, { name: e.target.value })}
                        className="text-sm font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:outline-none w-24"
                      />
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                        netGrowth > 0 ? 'bg-green-100 text-green-700' : 
                        netGrowth < 0 ? 'bg-red-100 text-red-700' : 
                        'bg-orange-100 text-orange-700'
                      }`}>
                        R-D = {(netGrowth * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        K≈{speciesK > 0 && speciesK < 10000 ? Math.round(speciesK) : '—'}
                      </span>
                      <span className="text-xs font-mono text-gray-400 ml-auto mr-2">
                        pop: {currentPop}
                      </span>
                      {species.length > 1 && (
                        <button
                          onClick={() => removeSpecies(sp.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex justify-between">
                          <span>R (replication)</span>
                          <span className="text-green-600">{(sp.R * 100).toFixed(0)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0.01"
                          max="0.2"
                          step="0.01"
                          value={sp.R}
                          onChange={(e) => updateSpecies(sp.id, { R: parseFloat(e.target.value) })}
                          className="w-full accent-green-500 h-1.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex justify-between">
                          <span>D (death)</span>
                          <span className="text-red-600">{(sp.D * 100).toFixed(0)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0.01"
                          max="0.15"
                          step="0.01"
                          value={sp.D}
                          onChange={(e) => updateSpecies(sp.id, { D: parseFloat(e.target.value) })}
                          className="w-full accent-red-500 h-1.5"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex justify-between">
                          <span>Start pop</span>
                          <span className="text-gray-600">{sp.startingPop}</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          step="1"
                          value={sp.startingPop}
                          onChange={(e) => updateSpecies(sp.id, { startingPop: parseInt(e.target.value) })}
                          className="w-full accent-gray-500 h-1.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={addSpecies}
              disabled={species.length >= MAX_SANDBOX_SPECIES}
              className="w-full py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Species
            </button>
          </div>

          {/* Environment Controls */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h3 className="font-medium text-gray-800 mb-3">Environment</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>All Starting Populations</span>
                  <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {species.length > 0 ? species[0].startingPop : 20}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={species.length > 0 ? species[0].startingPop : 20}
                  onChange={(e) => {
                    const newPop = parseInt(e.target.value);
                    setSpecies((prev) => prev.map((s) => ({ ...s, startingPop: newPop })));
                  }}
                  className="w-full accent-gray-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
                <p className="text-xs text-gray-500">Sets starting population for all species (Can still adjust individually after)</p>
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Crowding Coefficient (C)</span>
                  <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">
                    {C.toFixed(5)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0.0001"
                  max="0.002"
                  step="0.0001"
                  value={C}
                  onChange={(e) => setC(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
                />
                <p className="text-xs text-gray-500">
                  Lower C = more resources = higher carrying capacities for all species
                </p>
              </div>
            </div>
          </div>

          {/* Why K differs explanation */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>Why each species has different K:</strong> Carrying capacity K = (R - D) / C. 
              Since all species share the same C (same resources), species with higher fitness (R - D) 
              can sustain larger populations before crowding overwhelms them. 
              The fittest species &quot;wins&quot; by having the highest K.
            </p>
          </div>

          {/* Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Population over time</span>
              <span className="text-xs text-gray-500">
                Total: {totalPop}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tick" fontSize={10} hide />
                <YAxis 
                  fontSize={10} 
                  width={40}
                  domain={[0, (dataMax: number) => Math.max(dataMax * 1.1, maxSpeciesK * 1.1, 50)]}
                />
                <Tooltip formatter={(value) => [value as number, "Population"]} />
                {extinctions.map((ext) => (
                  <ReferenceLine
                    key={`ext-${ext.speciesId}-${ext.tick}`}
                    x={ext.tick}
                    stroke={ext.color}
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: `☠ ${ext.speciesName}`,
                      fill: ext.color,
                      fontSize: 9,
                      position: "top",
                    }}
                  />
                ))}
                {species.map((sp) => (
                  <Line
                    key={sp.id}
                    type="monotone"
                    dataKey={sp.id}
                    name={sp.name}
                    stroke={sp.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Species population counts */}
            <div className="flex flex-wrap gap-3 justify-center">
              {species.map((sp) => (
                <div key={sp.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sp.color }} />
                  <span className="text-sm text-gray-700">{sp.name}</span>
                  <span className="text-sm font-mono font-medium" style={{ color: sp.color }}>
                    {populations[sp.id] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                isRunning
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-500 text-white hover:bg-indigo-600"
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

          {/* Explanation */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-gray-600">
              <strong>Competitive Exclusion Principle:</strong> When species compete for identical resources, 
              the one with the highest fitness (R - D) will eventually dominate and drive others to extinction. 
              Try the &quot;Balanced&quot; preset to see how even tiny fitness differences determine the winner over time.
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

export default function Page4() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-medium text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
              Chapter 4
            </span>
            <a
              href="https://www.youtube.com/watch?v=uRTtlpD_U54"
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

        {/* Sandbox Section Divider */}
        <div className="relative py-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-indigo-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-6 py-2 text-sm text-indigo-600 font-semibold rounded-full border-2 border-indigo-300 shadow-sm">
              Sandbox Mode
            </span>
          </div>
        </div>

        <CompetitionSandboxSection />

        <div className="h-8"></div>
      </div>
    </div>
  );
}
