import ExerciseList from "./components/ExerciseGrid";

function ExplorePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-8 lg:px-16">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(236,72,153,0.12),transparent_26%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-5">
        <header className="py-4">
          <div>
            <p className="text-sm font-bold uppercase text-cyan-200">
              Freeform Arcade
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase text-white sm:text-5xl">
              Workout Select
            </h1>
          </div>
        </header>

        <form className="rounded-lg border border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-black/20 backdrop-blur">
          <label htmlFor="search" className="text-sm font-bold uppercase text-slate-300">
            Find a workout
          </label>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              id="search"
              placeholder="Search tempo, move, or muscle group"
              className="min-h-12 flex-1 rounded-md border border-cyan-300/20 bg-slate-950/80 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200"
            />
          <button
            type="submit"
            id="searchBtn"
            className="min-h-12 rounded-md border border-fuchsia-300/30 bg-fuchsia-500/15 px-6 text-sm font-black uppercase text-fuchsia-100 shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:bg-fuchsia-500/25 active:translate-y-0"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            Search
          </button>
        </div>
        </form>

        <ExerciseList exercises={["example 1", "example 1", "example 3", { name: "example 2", disabled: true }, "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", { name: "example 2", disabled: true }, "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3"]} />
        <ExerciseList exercises={["example 1", { name: "example 3", disabled: true }, "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3"]} />
      </div>
    </main>
  )
}

export default ExplorePage;
