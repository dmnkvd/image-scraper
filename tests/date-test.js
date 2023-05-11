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

let mappedJson = getDaysArray("2021-04-29", "2021-05-28").map((date) => {
  return {
    date: `${date}`,
    keywordsScraped: [
      "artificial-intelligence",
      "bitcoin",
      "blockchain",
      "cloud-computing",
      "internet",
    ],
  };
}); /* DEBUG */

console.log(mappedJson); /* DEBUG */
