const puppeteer = require("puppeteer");
const https = require("https");
const request = require("request");
const jsonConcat = require("json-concat");
const fs = require("fs");
const path = require("path");
const e = require("express");
const { resolve } = require("path");

// Max number of items to scrape for each keyword
const numberOfItemsToScrape = 30;

// Set to TRUE if running from server.js file
const prependDir = false;

const createDirAndDownload = true;

const allWebsites = {
  google: {
    firstUrl: `https://www.google.com/imghp`,
    inputBox: `div>div>input`,
    searchButton: "button[aria-label='Google Search']",
    keywords: [
      "women's health magazine cover"
    ],
    selectors: {
      // TODO: Find a more foolproof way to handle finding the main selector...
      productResultSelector: ['div[style*="height: 222px"]'],
      titleSelector: ["div>a:nth-of-type(2)"],
      titleAttribute: ["title"],
      linkSelector: ["div>a:nth-of-type(2)"],
      linkAttribute: ["href"],
      imgSelector: ["a>div>img"],
      imgAttribute: ["src", "data-src"],
    },
  },
};

const websiteCount = Object.keys(allWebsites).length;

let prependDirectory = "";

/* ----------------------- */
/* Get current week Number */
/* ----------------------- */

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

const formatDate = (date) => {
  let d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
};

const today = new Date();
const todayDateFormatted = formatDate(today);

const currentWeek = today.getWeek();

/* ----------------------- */
/*        Puppeteer        */
/* ----------------------- */
(async () => {
  // DEBUG

  try {
    // Launch a browser window. Headless: true --> no window.
    const browser = await puppeteer.launch({
      headless: false, // FIXME: Uncomment next two for Raspberry Pi runtime environment
      // executablePath: "/usr/bin/chromium-browser",
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
      args: ["--shm-size=2gb"],
      product: "chrome",
      devtools: true,
    });
    // Scraping function, takes the website to scrape as an argument
    const scrapeWebsite = async (website) => {
      console.log(`Currently scraping >>>> ${website.toUpperCase()} <<<<`);

      let scrapedUntilNow = 0;

      // Destructuring, initialising variables from main website JSON.
      const {
        [website]: {
          firstUrl,
          inputBox,
          searchButton,
          keywords,
          maxPageNumber,
          selectors: {
            productResultSelector: [productResultSelector_A = null],
            titleSelector: [titleSelector_A = null],
            titleAttribute: [titleAttribute_A = null],
            linkSelector: [linkSelector_A = null],
            linkAttribute: [linkAttribute_A = null],
            imgSelector: [imgSelector_A = null],
            imgAttribute: [imgAttribute_A = "Hello", imgAttribute_B = "Hello"],
          },
        },
      } = allWebsites;

      let results = [];

      // function to scrape results on a given page, with scrolling to the bottom
      const extractResults = async (url, searchKeyword) => {
        // Open a new page of the web browser.
        const page = await browser.newPage();

        // error logging
        // page.on("console", (message) =>
        //   console.log(
        //     `${message.type()?.substr(0, 3)?.toUpperCase()} ${message.text()}`
        //   )
        // );
        //   .on("pageerror", ({ message }) => console.log(message));
        // .on("requestfailed", (request) =>
        //   console.log(`${request.failure().errorText} ${request.url()}`)
        // );

        // This intercepts requests
        await page.setRequestInterception(true);

        await console.log(`Current url is ${url}`);

        // open the page at the url
        await Promise.all([
          // page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);

        // do not load the CSS, images, fonts -- easier on the resources.
        page.on("request", (req) => {
          if (
            req.resourceType() == "stylesheet" ||
            req.resourceType() == "font" ||
            req.resourceType() == "image"
          ) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // NOTE: Hopefully this solves the waiting problem with the selector.
        await page.goto(url, {
          waitUntil: "networkidle2",
        });

        // Make scrolling more legit
        await page.addStyleTag({
          content: "{scroll-behavior: auto !important;}",
        });

        // If there is a TOC confirmation page on Google
        try {
          let buttonToc = "div > button + button";
          // await page.waitForSelector(buttonToc, {
          //   timeout: 300,
          // });
          // click the accept button
          await Promise.all([
            page.click(buttonToc),
            page.waitForNavigation({ waitUntil: "networkidle2" }),
          ]);
          // await page.waitForNavigation({ waitUntil: "networkidle2" });
          // await page.click(buttonToc);
        } catch (error) {
          console.log(
            "No TOC button selector found. Continuing to next step."
          ); /* DEBUG */
        }

        try {
          await Promise.all([
            // Type into search box
            await page.type(inputBox, searchKeyword, {
              delay: 100,
            }),
            console.log("Typing the keyword into the search engine..."),
            // Click the search button
            page.click(searchButton),
            page.waitForNavigation({ waitUntil: "domcontentloaded" }),
          ]);
        } catch (error) {
          console.log(error);
        }

        let selectorFound;

        try {
          await page.waitForSelector(productResultSelector_A, {
            timeout: 300,
          });
          selectorFound = true;
        } catch (error) {
          selectorFound = false;
          console.error("No matching image elements found on this page.");
        }

        // Scrolling Function - scroll to the end of the page, or until number of elements found
        async function autoScroll(page) {
          await page.evaluate(
            async ({ numberOfItemsToScrape, productResultSelector_A }) => {
              await new Promise((resolve, reject) => {
                let totalHeight = 0;
                let distance = 500;
                let timer = setInterval(() => {
                  let scrollHeight = document.body.scrollHeight;
                  window.scrollBy(0, distance);
                  totalHeight += distance;

                  if (
                    document.querySelectorAll(productResultSelector_A).length >=
                    numberOfItemsToScrape ||
                    totalHeight >= scrollHeight
                  ) {
                    clearInterval(timer);
                    resolve();
                  }
                }, 1000);
              });
            },
            { numberOfItemsToScrape, productResultSelector_A }
          );
        }

        await autoScroll(page);

        await console.log(
          `${numberOfItemsToScrape} top results indexed. Assembling data object...`
        );

        try {
          await page.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 3000,
          });
        } catch (error) {
          console.log(`Navigation scrolling timeout`);
        }

        let searchParameters = {
          todayDateFormatted,
          today,
          website,
          searchKeyword,
          results,
          websiteCount,
          productResultSelector_A,
          titleSelector_A,
          titleAttribute_A,
          linkSelector_A,
          linkAttribute_A,
          imgSelector_A,
          imgAttribute_A,
          imgAttribute_B,
          currentWeek,
        };

        const scrapeResultOnPage = await page.evaluate(
          ({
            todayDateFormatted,
            today,
            website,
            searchKeyword,
            results,
            websiteCount,
            productResultSelector_A,
            titleSelector_A,
            titleAttribute_A,
            linkSelector_A,
            linkAttribute_A,
            imgSelector_A,
            imgAttribute_A,
            imgAttribute_B,
            currentWeek,
          }) => {
            // empty array for results on page.
            let resultsOnPage = [];

            // select all the matching product listing containers.
            const items = document.querySelectorAll(productResultSelector_A);
            // For each div that it finds

            if (items.length != 0) {
              items.forEach((item, index) => {
                const scrapeTime = Date.now();
                const titleElement = item.querySelector(titleSelector_A);
                const linkElement = item.querySelector(linkSelector_A);
                const imgElement = item.querySelector(imgSelector_A);

                // let link = croppedLink ? (if (!croppedLink.contains('http')) {`https:${croppedLink}`} else {croppedLink};) : null;
                let link = linkElement?.getAttribute(linkAttribute_A);

                let img = imgElement?.getAttribute(imgAttribute_A);

                if (img === null) {
                  try {
                    img = imgElement?.getAttribute(imgAttribute_B);
                    // console.log("Img B: " + img);
                  } catch (error) {
                    // console.log("Error with IMG B");
                  }
                }

                // function to get serial number with leading zeros
                let getSerial = (num, size) => {
                  num = num.toString();
                  while (num.length < size) num = "0" + num;
                  return num;
                };

                let title = titleElement?.getAttribute(titleAttribute_A);

                let positionOnPage = index + 1;
                let fourDigitSerial = getSerial(positionOnPage, 4);

                let serialName = `${todayDateFormatted}_${website}_${searchKeyword
                  .split(" ")
                  .join("-")}_${fourDigitSerial}`;

                resultsOnPage.push({
                  fourDigitSerial,
                  scrapeTime,
                  "scrape date": todayDateFormatted,
                  website,
                  searchKeyword,
                  positionOnPage,
                  title,
                  link,
                  img,
                  serialName,
                });
              });
            }

            return resultsOnPage;

            // this callback should match the function argument
          },
          {
            todayDateFormatted,
            today,
            website,
            searchKeyword,
            results,
            websiteCount,
            productResultSelector_A,
            titleSelector_A,
            titleAttribute_A,
            linkSelector_A,
            linkAttribute_A,
            imgSelector_A,
            imgAttribute_A,
            imgAttribute_B,
            currentWeek,
          }
        );

        await page.close();

        // output the results
        return scrapeResultOnPage;
      };

      for await (keyword of keywords) {
        console.log(`Current keyword >>>> "${keyword}" <<<<`);

        let untrimmedResults = await extractResults(firstUrl, keyword);

        results = untrimmedResults.slice(0, numberOfItemsToScrape);

        {
          await console.log(
            `Scraped ${results.length} images with keyword "${keyword}" from ${website}.`
          );
        }

        // Image directory path (relative to server.js file).
        // FIXME: this is changeable depending on if server or no.

        if (prependDir === true) {
          prependDirectory = "/image-scraper";
        }
        if (prependDir === false) {
          prependDirectory = "";
        }
        let imgDirectory = `.${prependDirectory}/results/${website}/${keyword
          .split(" ")
          .join("-")}`;

        if (createDirAndDownload === true) {
          await createDir(imgDirectory + "/img");
          await createDir(imgDirectory + "/img-database");
          await createDir(imgDirectory + "/json");

          // async download the image into the subfolder and count its filesize, and append the filesize to the JSON item
          for await (result of results) {
            try {
              if (result.img?.substr(0, 4) === "data") {
                try {
                  await downloadDataURI(result.img, result.serialName);
                  console.log(`Downloaded ${result.serialName}.jpg`);
                  result.filesize = await getFilesizeInBytes(result.serialName);
                } catch (error) {
                  console.log(error); /* DEBUG */
                }
              }

              if (result.img?.substr(0, 4) === "http") {
                try {
                  await downloadFile(result.img, result.serialName);
                  console.log(`Downloaded ${result.serialName}.jpg`);
                  result.filesize = await getFilesizeInBytes(result.serialName);
                } catch (error) {
                  console.log(error); /* DEBUG */
                }
              }
            } catch (error) {
              console.log(error);
              console.log(
                "There was a problem with downloading the images and analysing the filesizes."
              );
              process.exit(0);
            }
          }
        }

        // Download image from URL into 'img' subfolder
        async function downloadFile(uri, filename) {
          const filePath = `${imgDirectory}/img/${filename}.jpg`;

          return new Promise((resolve, reject) => {
            request.head(uri, function (err, res, body) {
              request(uri)
                .on("error", function (err) {
                  console.error("Error!!!" + err);
                  process.exit(0);
                })
                .pipe(fs.createWriteStream(filePath))
                .on("close", resolve);
            });
          });
        }

        // Download image from data64
        async function downloadDataURI(uri, filename) {
          const filePath = `${imgDirectory}/img/${filename}.jpg`;

          return new Promise((resolve, reject) => {
            let base64Data = uri.replace(/^data:image\/.+;base64,/, "");

            fs.writeFileSync(filePath, base64Data, "base64", (err) => {
              console.log(err);
            });

            resolve();
          });
        }

        async function getFilesizeInBytes(filename) {
          const filePath = `${imgDirectory}/img/${filename}.jpg`;
          let stats = fs.statSync(filePath);
          let fileSizeInBytes = stats["size"];
          return fileSizeInBytes;
        }

        try {
          // this one works
          await writeJSON(
            `${imgDirectory}/json/${todayDateFormatted}_${website}_${keyword
              .split(" ")
              .join("-")}.json`,
            results
            // can add [0] here to remove outer array
          );
        } catch (error) {
          console.log(error);
        } finally {
          console.log("JSON of scrape overview written OK!");
        }

        try {
          let totalJson = [];

          const JsonDirectory = `${imgDirectory}/json`;

          console.log(JsonDirectory); /* DEBUG */

          let filenames = fs.readdirSync(JsonDirectory);

          filenames.forEach((file) => {
            if (!/^\..*/.test(file)) {
              let result;
              try {
                result = fs.readFileSync(`${JsonDirectory}/${file}`, "utf8");
              } catch (err) {
                console.log(err); /* DEBUG */
              }
              let resultJson = JSON.parse(result);
              totalJson.push(...resultJson);
            }
          });

          await writeJSON(`${imgDirectory}/id-database-temp.json`, totalJson);
        } catch (error) {
          console.log(error);
        }

        let allScrapesUntilNowJson;
        let allScrapesDate;
        let allScrapesFilesize;

        try {
          allScrapesUntilNowJson = await JSON.parse(
            fs.readFileSync(`${imgDirectory}/id-database-temp.json`, "utf8")
          );
        } catch (error) { }

        if (allScrapesUntilNowJson !== undefined) {
          allScrapesDate = groupBy(allScrapesUntilNowJson, "scrape date");

          // Create a JSON grouped by the individual dates
          writeJSON(`${imgDirectory}/id-database-dates.json`, allScrapesDate);

          const clonedScrapes = JSON.parse(
            JSON.stringify(allScrapesUntilNowJson)
          );

          clonedScrapes.forEach((item) => {
            delete item.img;
          });

          allScrapesFilesize = groupBy(clonedScrapes, "filesize");

          // Create a JSON grouped by the individual filesizes of the images in the scrapes
          writeJSON(
            `${imgDirectory}/id-database-filesize.json`,
            allScrapesFilesize
          );

          sortByDate(allScrapesFilesize);

          writeJSON(
            `${imgDirectory}/id-database-filesize-dates.json`,
            allScrapesFilesize
          );

          // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
          function groupBy(objectArray, property) {
            return objectArray.reduce(function (acc, obj) {
              let key = obj[property];
              if (!acc[key]) {
                acc[key] = [];
              }

              let { title, link, serialName, positionOnPage, img, filesize } =
                obj;

              object = {
                "scrape date": obj["scrape date"],
                positionOnPage,
                title,
                link,
                serialName,
                img,
                filesize,
              };

              acc[key].push(object);

              //TODO: add recursion here to also group by dates

              return acc;
            }, {});
          }

          // go one level deeper, and group the results by date of scraping
          //TODO: make it work properly
          function sortByDate(object) {
            const genRanHex = (size) =>
              [...Array(size)]
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join("");
            for (key in object) {
              let groupedByDate = groupBy(object[key], "scrape date");

              // append the filesize of the image and date as an array
              object[key] = {
                filesize: key,
                hexId: genRanHex(6),
                dates: groupedByDate,
              };
            }
            return;
          }
        }

        {
          //TODO: enable
          CopyImages(`${imgDirectory}/img`, `${imgDirectory}/img-database`);

          function CopyImages(source, destination) {
            console.log(
              "Generating unique IDs and transferring results to image database."
            ); /* DEBUG */
            let filenames = fs.readdirSync(source);

            filenames.forEach((file) => {
              let fileSizeInBytes = fs.statSync(`${source}/${file}`).size;

              fs.copyFile(
                `${source}/${file}`,
                `${destination}/${fileSizeInBytes}.jpg`,
                fs.constants.COPYFILE_EXCL,
                (err) => {
                  if (err) {
                    // console
                    //   .log
                    //   // `The file '${fileSizeInBytes}.jpg' already exists in '${destination}'. Not overwriting`
                    //   ();
                  }
                }
              );
            });
          }
        }

        allResults = allResults.concat(results);
      }
    };

    const websitesToScrape = ["google"];

    let allResults = [];

    // this scrapes the website desired for the scrape results
    try {
      for (website of websitesToScrape) {
        await scrapeWebsite(website);
      }
    } catch (error) {
      console.log("Error!!!" + error);
      process.exit(0);
    }

    async function scraperOverview() {
      await console.log(
        "Adding scraping entry to scraper overview."
      ); /* DEBUG */
      return new Promise((res, rej) => {
        try {
          fs.readFile(
            `.${prependDirectory}/results/scraper-stats.json`,
            "utf8",
            function (err, data) {
              if (err) {
                console.log(err);
                return;
              }
              let jsonArray = JSON.parse(data);
              jsonArray.push({
                date: todayDateFormatted,
                keywordsScraped: allWebsites.google.keywords,
              });
              fs.writeFileSync(
                `.${prependDirectory}/results/scraper-stats.json`,
                JSON.stringify(jsonArray, null, 4)
              );
              resolve("Promise completed");
            }
          );
        } catch (error) {
          console.log("Error!!!!" + error); /* DEBUG */
          process.exit(0);
        }
      });
    }

    // TODO: scraper stats file, which has an overview of the dates when it scraped

    // close the browser window
    await browser.close();
    await console.log("Browser window closed. Database building complete.");

    await scraperOverview();

    // exit the NodeJS process.
    await process.exit(1);

    // Check if directory exists. If not, create one recursively.
    async function createDir(dir) {
      // This will create a dir given a path such as './folder/subfolder'
      const splitPath = dir.split("/");
      splitPath.reduce((path, subPath) => {
        let currentPath;
        if (subPath != ".") {
          currentPath = path + "/" + subPath;
          if (!fs.existsSync(currentPath)) {
            fs.mkdirSync(currentPath);
            console.log(`New folder [${dir}] created.`);
          }
          return currentPath;
        }
      });
    }

    async function writeJSON(directoryPath, variableName) {
      try {
        const data = fs.writeFileSync(
          directoryPath,
          JSON.stringify(variableName, null, 4)
        );
        //file written successfully
      } catch (err) {
        console.error(err);
      }
      return;
    }
  } catch (error) {
    console.error(error);
    process.exit(0);
  }
})();
