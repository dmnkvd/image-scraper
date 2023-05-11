const http = require("http");
const express = require("express");
const fs = require("fs");
const path = require("path");
const sys = require("util");
const childProcess = require("child_process");

const app = express();

const currentTime = new Date();

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

/*-----------------------/
TODO:
 - 
 - 
 - 
 - 

 1. Go through all the scrape results
 2. See which ones appear:
 3. Add to new set
 4. copy the file to a new subfolder of unique IDs
 4. each subobject:
 {
   uniqueID: 
   filename:
   scrapeDates: [
     {date, ranking, title, website, filename},
     {date, ranking, title, website, filename},
   ]
   filesize:
 }
------------------------*/
