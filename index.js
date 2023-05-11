const http = require("http");
const express = require("express");
const fs = require("fs");
const path = require("path");
const sys = require("util");
const childProcess = require("child_process");

const app = express();

// This code is adapted from my last semester...
// Initialise session ID variable. The variable is global -- I have read against declaring global variables.
const port = 1337;

const currentTime = new Date();

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/results", express.static(path.join(__dirname, "results")));

Date.prototype.getWeek = function () {
  let date = new Date(this);
  date.setHours(0, 0, 0, 0);
  return Math.round(
    ((date.setDate(this.getDate() + 2 - (this.getDay() || 7)) -
      date.setMonth(0, 4)) /
      8.64e7 +
      3 +
      (date.getDay() || 7)) /
      7
  );
};

const currentWeekNumber = currentTime.getWeek();
const currentDayOfTheWeek = currentTime.getDay();
const currentHour = currentTime.getHours();

console.log(
  `Welcome to the Digital Economy Tracker. Serving files at [${currentWeekNumber}, ${currentDayOfTheWeek}, ${currentHour}, ${currentTime} UTC].`
);

// [QUESTION] I tested this with two browsers, and it stops writing files after 2 or 3 steps.
// [QUESTION] How to enable the server for multiple users at the same time?

app.listen(port, () => {
  console.log(
    `Digital Economy Tracker launched and is running on port ${port}!`
  );
});

if (
  currentDayOfTheWeek == 0 &&
  !fs.existsSync(`results/${currentWeekNumber}/`)
) {
  // run the scraper
  // TODO: How to run async and begin serving website after it is done?
  // While it is running, serve
  console.log(
    "It's Sunday and there has been no scrapes this week. Beginning webscraping process."
  );
  // const scraper = childProcess.fork(__dirname + '/image-scraper.js');

  const scraper = childProcess.spawn("node", ["image-scraper.js"]);

  scraper.stdout.on("data", (data) => {
    const strData = data.toString();
    console.log(strData);
  });

  scraper.stderr.on("data", (data) => {
    assert(false, "An error occurred during scraping.");
  });

  scraper.on("close", (code) => {
    console.log(
      `Scraper exited with code [${code}] and scrape results has been saved.`
    );
    // at this point 'savedOutput' contains all your data.
  });

  //   scraper.on("exit", function (code, signal) {
  //     console.log("Scraping complete. Exited the scraper.", {code: code, signal: signal});
  // });
  //   scraper.on("error", console.error.bind(console));
}

app.get("/", (req, res) => {
  console.log("The Futuresmarket is open. Showing the timeline.");
  res.sendFile("public/index.html", { root: __dirname });
});

// if ((currentDayOfTheWeek == 0 || currentDayOfTheWeek == 6) || (currentHour < 9 || currentHour > 17)) {
//   console.log('It is outside the opening hours. Closed page shown.')
//   app.get('/', (req, res) => {

//         // TODO: does this actually work?
//         /* If there are any subdomains, skip to next handler, since request is not for the main home page */
//         if (req.subdomains.length > 0) {
//           return next();
//       }
//     res.sendFile('public/closed.html', { root: __dirname });
//   });
// } else {
//   app.get('/', (req, res) => {
//     console.log('The Futuresmarket is open. Showing the timeline.')
//     res.sendFile('public/index.html', { root: __dirname });
//   });
// }
