type ExerciseName = "example 1" | "example 2" | "example 3";
type Exercise = ExerciseName | { name: ExerciseName; disabled?: boolean };

const exerciseStyles = [
  {
    accent: "bg-red-800",
    photo: "bg-red-300/10",
    glow: "shadow-red-500/10",
    text: "text-red-200",
    ring: "group-hover:border-red-300/70",
  },
];

function getExerciseDetails(exercise: Exercise) {
  return typeof exercise === "string"
    ? { name: exercise, disabled: false }
    : { disabled: false, ...exercise };
}

function ExerciseList({ exercises, title, onExerciseSelect }: { exercises: Exercise[]; title: string; onExerciseSelect?: (exerciseName: ExerciseName) => void }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-3 shadow-lg shadow-black/20 backdrop-blur sm:p-4">
      <h2 className="mb-4 font-bold text-xl">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {exercises?.map((exercise, index) => {
          const { name, disabled } = getExerciseDetails(exercise);
          const style = exerciseStyles[index % exerciseStyles.length];

          return (
            <button
              key={`${name}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onExerciseSelect?.(name);
                }
              }}
              className={[
                "group relative flex min-h-80 w-full flex-col overflow-hidden rounded-lg border text-left transition duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                disabled
                  ? "cursor-not-allowed border-slate-700/80 bg-slate-900/70 text-slate-500 grayscale"
                  : `border-white/10 bg-slate-900/80 text-white shadow-md ${style.glow} ${style.ring} hover:-translate-y-0.5 hover:bg-slate-900 active:translate-y-0`,
              ].join(" ")}
            >
              <span
                className={[
                  "absolute inset-x-0 top-0 h-1",
                  disabled ? "bg-slate-600" : style.accent,
                ].join(" ")}
              />
              <span
                className={[
                  "flex flex-1 items-center justify-center",
                  disabled ? "bg-slate-800/60" : style.photo,
                ].join(" ")}
                aria-hidden="true"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-950/40 text-xs font-bold uppercase text-slate-400">
                  Photo
                </span>
              </span>

              <span className="flex min-h-28 flex-col items-start justify-center gap-3 border-t border-white/10 bg-slate-950/85 p-4">
                <span className="block text-lg font-black uppercase text-white">
                  {name}
                </span>
                <span
                  className={[
                    "shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase",
                    disabled
                      ? "border-slate-600 bg-slate-800/80 text-slate-500"
                      : `border-white/10 bg-white/10 ${style.text}`,
                  ].join(" ")}
                >
                  {disabled ? "Coming soon" : "Play"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ExerciseList;
