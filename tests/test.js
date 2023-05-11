let people = [
  { name: "Alice", age: 21 },
  { name: "Max", age: 20 },
  { name: "Jane", age: 20 },
];

function groupBy(objectArray, property) {
  return objectArray.reduce(function (acc, obj) {
    let key = obj[property];
    // if it doesnt exist yet, initialise as empty array for each of the things
    if (!acc[key]) {
      acc[key] = [];
    }
    // push it to that array, to string all of them up together
    acc[key].push(obj);

    return acc;
  }, {});
}

let groupedPeople = groupBy(people, "age");

// console.log(groupedPeople);
