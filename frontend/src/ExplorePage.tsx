import ExerciseList from "./components/ExerciseGrid";

function ExplorePage() {
  return (
    <div className="mt-16 px-16 flex flex-col max-w-7xl mx-auto gap-4">
      <div className="bg-gray-100 rounded-md p-4 flex flex-col gap-1">
        <label htmlFor="search">Find a workout</label>
        <br/>

        <div className="flex gap-2">
          <input type="search" id="search" className="flex-1 border rounded-md p-2" />
          <button
            type="submit"
            id="searchBtn"
            onClick={
              (e)=>{e.preventDefault();}
            }>Search</button>
        </div>
      </div>

      <ExerciseList exercises={["example 1", "example 1", "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3"]} />
      <ExerciseList exercises={["example 1", "example 1", "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3", "example 1", "example 1", "example 3", "example 1", "example 2", "example 3"]} />
    </div>
  )
}

export default ExplorePage;
