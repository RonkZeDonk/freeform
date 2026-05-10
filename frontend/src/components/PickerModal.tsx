import { useState } from "react";

const REP_OPTIONS = [4, 8, 15] as const;

export type PickerSubmitValues = {
  exerciseType: string;
  heightFeet: number;
  heightInches: number;
  timePerRepSeconds: number;
  reps: (typeof REP_OPTIONS)[number];
};

type PickerModalProps = {
  exerciseName?: string;
  onSubmit: (values: PickerSubmitValues) => void;
  onCancel?: () => void;
};

function PickerModal({ exerciseName = "Exercise", onSubmit, onCancel }: PickerModalProps) {
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(8);
  const [timePerRepSeconds, setTimePerRepSeconds] = useState(2);
  const [reps, setReps] = useState<(typeof REP_OPTIONS)[number]>(REP_OPTIONS[0]);

  const isValid =
    Number.isFinite(heightFeet) &&
    heightFeet > 0 &&
    Number.isFinite(heightInches) &&
    heightInches >= 0 &&
    heightInches <= 11 &&
    Number.isFinite(timePerRepSeconds) &&
    timePerRepSeconds > 0;

  function handleSubmit() {
    if (!isValid) {
      return;
    }

    onSubmit({
      exerciseType: exerciseName,
      heightFeet,
      heightInches,
      timePerRepSeconds,
      reps,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/90 p-5 text-slate-100 shadow-2xl shadow-black/40 sm:p-6">
        <h3 className="mb-1 text-lg font-black uppercase tracking-wide text-white">{exerciseName} Setup</h3>
        <p className="mb-5 text-sm text-slate-300">Tune your form details and pace before starting.</p>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <p className="mb-2 text-xs font-bold uppercase text-slate-400">Height</p>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                <input
                  type="number"
                  min={1}
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(Number(e.target.value))}
                  className="w-full bg-transparent text-white outline-none"
                />
                <span className="text-xs uppercase text-slate-400">ft</span>
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={heightInches}
                  onChange={(e) => setHeightInches(Number(e.target.value))}
                  className="w-full bg-transparent text-white outline-none"
                />
                <span className="text-xs uppercase text-slate-400">in</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <p className="mb-2 text-xs font-bold uppercase text-slate-400">Time Per Rep</p>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={timePerRepSeconds}
                onChange={(e) => setTimePerRepSeconds(Number(e.target.value))}
                className="w-full bg-transparent text-white outline-none"
              />
              <span className="text-xs uppercase text-slate-400">sec</span>
            </label>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            {/* Number of reps options */}
            {REP_OPTIONS.map((option) => {
              const selected = reps === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReps(option)}
                  className={[
                    "flex-1 rounded-lg border px-4 py-2 text-sm font-bold transition",
                    selected
                      ? "border-cyan-300/50 bg-cyan-400/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-white/10 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/40 disabled:text-slate-500"
            >
              Start
            </button>
          </div>

          {!isValid && (
            <p className="sm:col-span-2 text-xs text-red-300">
              Please enter a valid height and a positive time per rep.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PickerModal;
