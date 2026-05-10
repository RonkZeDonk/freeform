type Exercise = "example 1" | "example 2" | "example 3";

function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  return (
    <div className="bg-gray-200 rounded-md py-8 flex flex-wrap gap-2 justify-center">
      {exercises?.map((e) => (
        <div className="bg-gray-300 rounded-md aspect-square w-64">
          image for: {e}
        </div>
      ))}
    </div>
  );
}

export default ExerciseList;
