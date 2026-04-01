"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { id: 1, title: "Why Do Things Exist?" },
  { id: 2, title: "Exponential Growth" },
  { id: 3, title: "Mutations" },
  { id: 4, title: "Carrying Capacity" },
  { id: 5, title: "Natural Selection" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-800 text-white rounded-lg"
        aria-label="Open sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 w-64 h-screen bg-emerald-800 text-white p-6 flex flex-col overflow-y-auto z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-1 text-emerald-200 hover:text-white"
          aria-label="Close sidebar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

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
                onClick={() => setIsOpen(false)}
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
    </>
  );
}
