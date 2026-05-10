import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ExerciseList from "./components/ExerciseGrid";
import PickerModal, { type PickerSubmitValues } from "./components/PickerModal";

const exercisePosesMap: Record<string, string[]> = {
  "bicep curl": ["curl_up", "down"],
  "hammer curl": ["hammer_left", "down", "hammer_right", "down"],
  "lateral raise": ["lateral_raise", "down"],
  "shoulder press": ["press_up", "press_down"],
  "preacher curl": [],
  "incline curl": [],
  "front raise": [],
  "cable curl": [],
  "machine press": [],
  "barbell press": [],
  "dumbbell press": [],
  "rear raise": [],
};

function ExplorePage() {
  const navigate = useNavigate();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<PickerSubmitValues | null>(
    null,
  );
  const [selectedExerciseName, setSelectedExerciseName] = useState("Exercise");

  function handleExerciseSelect(exerciseName: string) {
    setSelectedExerciseName(exerciseName);
    setIsPickerOpen(true);
  }

  function handlePickerSubmit(values: PickerSubmitValues) {
    setSelectedSetup(values);

    const exercisePoses = exercisePosesMap[values.exerciseType] ?? [];

    const params = new URLSearchParams({
      exerciseType: values.exerciseType,
      poses: JSON.stringify(exercisePoses),
      heightFeet: String(values.heightFeet),
      heightInches: String(values.heightInches),
      timePerRepSeconds: String(values.timePerRepSeconds),
      reps: String(values.reps),
    });

    navigate(`/?${params.toString()}`, { replace: true });
  }

  return (
    <>
      {isPickerOpen && (
        <PickerModal
          exerciseName={selectedExerciseName}
          onSubmit={handlePickerSubmit}
          onCancel={() => setIsPickerOpen(false)}
        />
      )}
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-cyan-300/30 bg-cyan-950/40 px-4 py-2 text-xs font-bold uppercase text-cyan-100 transition hover:bg-cyan-900/50"
                onClick={() => setIsPickerOpen(true)}
              >
                Open Setup
              </button>
              {selectedSetup && (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {selectedSetup.exerciseType} | {selectedSetup.heightFeet}ft{" "}
                  {selectedSetup.heightInches}in |{" "}
                  {selectedSetup.timePerRepSeconds}s/rep | {selectedSetup.reps}{" "}
                  reps
                </p>
              )}
            </div>
          </header>

          <form className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur">
            <label
              htmlFor="search"
              className="text-sm font-bold uppercase text-slate-300"
            >
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

          <ExerciseList
            title="Frequent Exercises"
            exercises={[
              "bicep curl",
              "hammer curl",
              "lateral raise",
              "shoulder press",
              "bicep curl",
              "hammer curl",
            ]}
            onExerciseSelect={handleExerciseSelect}
          />
          <ExerciseList
            title="Suggested Workouts"
            exercises={[
              "preacher curl",
              "incline curl",
              "front raise",
              { name: "cable curl", disabled: true },
              "machine press",
              "barbell press",
              "dumbbell press",
              "rear raise",
            ]}
            onExerciseSelect={handleExerciseSelect}
          />
        </div>
      </main>
    </>
  );
}

export default ExplorePage;
