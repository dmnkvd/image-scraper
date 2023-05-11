let incomingObject = {
  one: {
    id: "one",
    dates: {
      "2021-05-01": [
        {
          a: "foo",
          b: "bar",
        },
      ],
      "2021-05-02": [
        {
          a: "foo",
          b: "bar",
        },
      ],
    },
  },
  two: {
    id: "two",
    dates: {
      "2021-05-01": [
        {
          a: "foo",
          b: "bar",
        },
        {
          a: "foo2",
          b: "bar2",
        },
      ],
      "2021-05-02": [
        {
          a: "baz",
          b: "far",
        },
      ],
    },
  },
  three: {
    id: "three",
    dates: {
      "2021-05-03": [
        {
          a: "foo",
          b: "bar",
        },
      ],
      "2021-05-02": [
        {
          a: "foo",
          b: "bar",
        },
      ],
    },
  },
};

// I have no idea how to implement this function, that would return the "filtered" object
// filterResults(getDaysArray("2021-05-01", "2021-05-01"));

// This is the desired result - all the sub-objects that don't pass the filter, are left out
let desiredResult = {
  1: {
    id: "1",
    dates: {
      "2021-05-01": [
        {
          a: "foo",
          b: "bar",
        },
      ],
    },
  },
  2: {
    id: "2",
    dates: {
      "2021-05-01": [
        {
          a: "foo",
          b: "bar",
        },
        {
          a: "foo2",
          b: "bar2",
        },
      ],
    },
  },
};

const getDaysArray = function (s, e) {
  for (
    var a = [], d = new Date(s);
    d <= new Date(e);
    d.setDate(d.getDate() + 1)
  ) {
    a.push(new Date(d));
  }
  let aStrings = a.map((date) => date.toISOString().slice(0, 10));
  return aStrings;
};

let arrayImgs = Object.values(incomingObject);

let someRange = ["2021-05-02", "2021-05-03"];

let filteredList = arrayImgs.filter((item) => {
  return item.dates.date >= someRange[0] && item.dates.date <= someRange[1];
});

console.log(filteredList);

// This works! But is too advanced for me to fully understand...
const filterResults = (data, days) =>
  Object.entries(data).reduce((result, [k, v]) => {
    const { dates, ...rest } = v;
    const filteredDates = days.reduce((acc, date) => {
      if (v.dates[date]) acc[date] = v.dates[date];
      return acc;
    }, {});
    if (Object.keys(filteredDates).length)
      result.push([k, { ...rest, dates: filteredDates }]);
    return result;
  }, []);

const res = filterResults(
  incomingObject,
  getDaysArray("2021-05-03", "2021-05-03")
);

let filteredObject = Object.fromEntries(res);

console.log(filteredObject);
// let dateRange = getDaysArray("2021-05-01", "2021-05-01");

// const filteredImages = Object.keys(images).forEach((key) => {
//   let imgObject = images[key];
//   Object.keys(images[key].dates).forEach((key) => {
//     if (dateRange.includes(key)) {
//       console.log(key);
//     }
//   });
// });

// Return the whole bigger object based on the nested property filter.
