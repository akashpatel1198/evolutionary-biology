"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { id: 1, title: "Why Do Things Exist?" },
  { id: 2, title: "Exponential Growth" },
  { id: 3, title: "Mutations" },
  { id: 4, title: "Carrying Capacity" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen bg-emerald-800 text-white p-6 flex flex-col overflow-y-auto">
      <Link
        href="/"
        className="px-4 py-2 text-lg font-bold mb-8 bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors flex-shrink-0 text-center"
      >
        ← Home
      </Link>

      <nav className="flex flex-col gap-2 flex-1">
        {pages.map((page) => {
          const isActive = pathname === `/${page.id}`;
          return (
            <Link
              key={page.id}
              href={`/${page.id}`}
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "hover:bg-emerald-700 text-emerald-100"
              }`}
            >
              <span className="font-bold">{page.id}.</span> {page.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
