import GenerativeCanvas from "@/components/GenerativeCanvas";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-slate-100">
          Generative UI Dashboard
        </h1>
        <p className="mb-8 text-slate-400">
          Multi-agent workbench with streaming responses and generative canvas.
        </p>
        <GenerativeCanvas />
      </div>
    </main>
  );
}
