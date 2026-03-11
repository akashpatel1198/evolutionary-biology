"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const pages = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <aside className="w-64 min-h-screen bg-emerald-800 text-white p-6 flex flex-col">
      <Link
        href="/"
        className="text-2xl font-bold mb-8 hover:text-emerald-200 transition-colors"
      >
        Home
      </Link>

      <nav className="flex flex-col gap-2">
        {pages.map((num) => {
          const isActive = pathname === `/${num}`;
          return (
            <Link
              key={num}
              href={`/${num}`}
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "hover:bg-emerald-700 text-emerald-100"
              }`}
            >
              Page {num}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
