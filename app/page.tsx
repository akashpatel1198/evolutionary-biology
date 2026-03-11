import Link from "next/link";

export default function Home() {
  const pages = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
      <main className="text-center px-8 py-16 max-w-3xl">
        <h1 className="text-5xl font-bold text-emerald-900 mb-6">
          {/* TODO: Add your title here */}
          Your Title Here
        </h1>
        
        <p className="text-xl text-emerald-700 mb-12 leading-relaxed">
          {/* TODO: Add your description here */}
          Add your description here. This is a placeholder for you to fill in
          with details about your project.
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {pages.map((num) => (
            <Link
              key={num}
              href={`/${num}`}
              className="px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold 
                         hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
            >
              Page {num}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
