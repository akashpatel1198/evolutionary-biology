import Link from "next/link";

const simulations = [
  { id: 1, title: "Why Do Things Exist?", subtitle: "Birth & Death Equilibrium", color: "emerald" },
  { id: 2, title: "Exponential Growth", subtitle: "Replication Changes Everything", color: "emerald" },
  { id: 3, title: "Mutations", subtitle: "Heritable Variation", color: "blue" },
  { id: 4, title: "Carrying Capacity", subtitle: "Competition & Logistic Growth", color: "amber" },
  { id: 5, title: "Natural Selection", subtitle: "Coming Soon", color: "gray", disabled: true },
  { id: 6, title: "Selfish Genes", subtitle: "Coming Soon", color: "gray", disabled: true },
  { id: 7, title: "Hawk-Dove Game", subtitle: "Coming Soon", color: "gray", disabled: true },
  { id: 8, title: "Green Beard", subtitle: "Coming Soon", color: "gray", disabled: true },
  { id: 9, title: "Kin Selection", subtitle: "Coming Soon", color: "gray", disabled: true },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
      <main className="text-center px-8 py-16 max-w-4xl">
        <h1 className="text-5xl font-bold text-emerald-900 mb-6">
          Evolutionary Biology
        </h1>
        
        <p className="text-xl text-emerald-700 mb-12 leading-relaxed max-w-2xl mx-auto">
          Interactive simulations exploring the foundations of evolution.
          Inspired by the <strong>Primer</strong> YouTube channel.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {simulations.map((sim) => (
            sim.disabled ? (
              <div
                key={sim.id}
                className="px-4 py-4 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed opacity-60"
              >
                <span className="text-2xl font-bold">{sim.id}</span>
                <p className="text-sm font-medium mt-1">{sim.title}</p>
                <p className="text-xs">{sim.subtitle}</p>
              </div>
            ) : (
              <Link
                key={sim.id}
                href={`/${sim.id}`}
                className={`px-4 py-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg hover:scale-105
                  ${sim.color === "emerald" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                  ${sim.color === "blue" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                  ${sim.color === "amber" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                `}
              >
                <span className="text-2xl font-bold">{sim.id}</span>
                <p className="text-sm font-medium mt-1">{sim.title}</p>
                <p className="text-xs opacity-80">{sim.subtitle}</p>
              </Link>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
