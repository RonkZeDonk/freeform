import ExerciseList from "./components/ExerciseGrid";

function ExplorePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-gray-900 px-4 py-8 text-white sm:px-8 lg:px-16">
      <div className="relative mx-auto flex max-w-7xl flex-col gap-5">
        <header className="py-4">
          <div>
            <p className="text-sm font-bold uppercase text-red-400">
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
              placeholder="Search exercises, muscle group or equipment"
              className="min-h-12 flex-1 rounded-md border border-cyan-300/20 bg-slate-950/80 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200"
            />
          <button
            type="submit"
            id="searchBtn"
            className="min-h-12 rounded-md border border-red-300/30 bg-red-950 px-6 text-sm font-black uppercase text-red-100 shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:bg-red-600/25 active:translate-y-0"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            Search
          </button>
        </div>
        </form>

        <ExerciseList title="Frequent Exercises" exercises={["example 1", "example 1", "example 3", "example 3"]} />
        <ExerciseList title="Suggested Workouts" exercises={["example 1", { name: "example 3", disabled: true }, "example 3", "example 1", "example 2"]} />
      </div>
    </main>
  )
}

export default ExplorePage;
