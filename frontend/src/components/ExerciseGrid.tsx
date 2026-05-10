import heroImage from "../assets/hero.png";

export type ExerciseName = "bicep curl" | "hammer curl" | "lateral raise" | "shoulder press" | "preacher curl" | "incline curl" | "front raise" | "cable curl" | "machine press" | "barbell press" | "dumbbell press" | "rear raise" | "shadow boxing" | "the force";
export type Exercise =
  | ExerciseName
  | {
      name: ExerciseName;
      disabled?: boolean;
      imageSrc?: string;
      imageAlt?: string;
    };

const exerciseStyles = [
  {
    accent: "bg-red-500",
    glow: "shadow-red-500/10",
    text: "text-red-200",
    ring: "group-hover:border-red-300/70",
    tint: "from-red-950/80",
  },
];

const exerciseImages: Record<ExerciseName, string> = {
  "bicep curl": "/bi%20curls.jpeg",
  "hammer curl": "/hamcurl.jpeg",
  "lateral raise": "/lat%20raise.jpeg",
  "shoulder press": "/shoulder%20press.jpeg",
  "preacher curl": "/catgirl.jpeg",
  "incline curl": "/shy.jpeg",
  "front raise": "/superman.jpeg",
  "cable curl": "/box.jpeg",
  "machine press": "/the%20force.jpeg",
  "barbell press": "/marrachas.jpeg",
  "dumbbell press": "/EAC0F2EB-8128-46A0-B818-7AB5302D6C78.jpeg",
  "rear raise": heroImage,
};

function getExerciseDetails(exercise: Exercise) {
  if (typeof exercise === "string") {
    return {
      name: exercise,
      disabled: false,
      imageSrc: exerciseImages[exercise],
      imageAlt: `${exercise} preview`,
    };
  }

  return {
    disabled: false,
    imageSrc: exerciseImages[exercise.name],
    imageAlt: `${exercise.name} preview`,
    ...exercise,
  };
}

function ExerciseList({ exercises, title, onExerciseSelect }: { exercises: Exercise[]; title: string; onExerciseSelect?: (exerciseName: ExerciseName) => void }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-3 shadow-lg shadow-black/20 backdrop-blur sm:p-4">
      <h2 className="mb-4 font-bold text-xl">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {exercises?.map((exercise, index) => {
          const { name, disabled, imageSrc, imageAlt } = getExerciseDetails(exercise);
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
              <span className="relative flex flex-1 overflow-hidden">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className={[
                    "h-full w-full object-cover transition duration-300",
                    disabled ? "opacity-45" : "group-hover:scale-105",
                  ].join(" ")}
                  loading="lazy"
                />
                <span
                  className={[
                    "absolute inset-0 bg-linear-to-t via-slate-950/25 to-transparent",
                    disabled ? "from-slate-950/90" : style.tint,
                  ].join(" ")}
                />
                <span className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-slate-950/95 to-transparent" />
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
