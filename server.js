var fs = require("fs");
var path = require("path");
const express = require("express");
const https = require("https");
require("dotenv").config();
const enigma = require("./security/newencryption");
const handlebars = require("express-handlebars");
const Handlebars = require("handlebars");
const axios = require("axios");
const utilities = require("./utilities");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// static directory
app.use(express.static("public"));

app.engine("handlebars", handlebars({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

let db = require("./models");
const constants = require("./constants");

// Routes
// ==============================================
require("./routes/account-summary-api-route")(app);
require("./routes/index-route.js")(app);
require("./routes/login-register-api-routes")(app);
require("./routes/trade-api-routes")(app);

let CURRENCYSCOOP_LATEST_URL = `https://currencyscoop.p.rapidapi.com/latest?base=`;

let serverHost = process.env.SERVER_HOST || "localhost";

function runServer() {
  // **************************** */
  // set express server port
  let serverPort = process.env.SERVER_PORT_HTTP || 8080;
  let httpProtocol = "http";
  console.log(`USE_HTTPS ==> ${process.env.USE_HTTPS}`);
  if (process.env.USE_HTTPS == "true") {
    serverPort = process.env.SERVER_PORT_HTTPS || 442;
    httpProtocol = "https";
    console.log("\n\n*********\nHTTPS\n***********");
    https
      .createServer(
        {
          key: fs.readFileSync("./security/server.key"),
          cert: fs.readFileSync("./security/server.cert"),
        },
        app
      )
      .listen(serverPort, serverHost, function () {
        let url = `${httpProtocol}://${serverHost}:${serverPort}`;
        console.log(`Server listening on port ${serverPort}. Go to ${url}`);
      });
  }

  // **************************** */
  else {
    app.listen(serverPort, serverHost, function () {
      let url = `${httpProtocol}://${serverHost}:${serverPort}`;
      console.log(`Server listening on port ${serverPort}. Go to ${url}`);
    });
  }
}

async function updateCurrencyTable(db) {
  let currencySeeds = require("./db/currencySeeds");
  // seed/update the currency table if it does not exist
  if (currencySeeds != null) {
    console.log(`\n\nSeeding Currency Table...(${currencySeeds.length})`);

    for (let index = 0; index < currencySeeds.length; index++) {
      let seedRow = currencySeeds[index];
      console.log(seedRow);
      // get a subset of the object excluding the primary key (code)
      let subset = (({ country, name, symbolUnicodeHex, isBaseCurrency }) => ({
        country,
        name,
        symbolUnicodeHex,
        isBaseCurrency,
      }))(seedRow);
      let code = seedRow["code"];
      let [curr, created] = await db.Currency.findOrCreate({ where: { code: code }, defaults: subset });
      console.log(curr.get({ plain: true }));
      console.log(created);
    }
  }
  // seed/update account table
  let accountSeeds = require("./db/accountSeeds");
  if (accountSeeds != null) {
    console.log(`\n\nSeeding Account Table...(${accountSeeds.length})`);
    for (let index = 0; index < accountSeeds.length; index++) {
      let seedRow = accountSeeds[index];
      console.log(seedRow);
      // get subset of the object excluding a unique column (uuid)
      let subset = (({ email, firstName, lastName, password, baseCurrencyCode, initialAmount }) => ({
        email,
        firstName,
        lastName,
        password,
        baseCurrencyCode,
        initialAmount,
      }))(seedRow);
      let uuid = seedRow["uuid"];
      let [curr, created] = await db.Account.findOrCreate({ where: { uuid: uuid }, defaults: subset });
      console.log(curr.get({ plain: true }));
      console.log(created);
    }
  }

  // seed/update exchangeRate table
  let rateSeeds = require("./db/exchangeRateSeeds");
  if (rateSeeds != null) {
    console.log(`\n\nSeeding ExchangeRate Table...(${rateSeeds.length})`);
    for (let index = 0; index < rateSeeds.length; index++) {
      let seedRow = rateSeeds[index];
      console.log(seedRow);
      let subset = (({ baseCurrencyCode, targetCurrencyCode, rate }) => ({
        baseCurrencyCode,
        targetCurrencyCode,
        rate,
      }))(seedRow);
      let uuid = seedRow["uuid"];
      let [curr, created] = await db.ExchangeRate.findOrCreate({ where: { uuid: uuid }, defaults: subset });
      console.log(curr.get({ plain: true }));
      console.log(created);
    }
  }

  const { QueryTypes } = require("sequelize");
  const { Op } = require("sequelize");
  // Update the currencies table with process.env.BASE_CURRENCIES.
  let baseCurrency;
  if ((baseCurrency = process.env.BASE_CURRENCIES)) {
    let currencies = baseCurrency.split(",");
    console.log(currencies);
    // ******* async anonymous function (self executing) *****************
    // (async () => {
    //first set the isBaseCurrency column of all rows to false
    let [numberOfAffectedRows, affectedRows] = await db.Currency.update(
      {
        isBaseCurrency: false,
      },
      {
        where: {
          isBaseCurrency: { [Op.is]: true },
        },
        returning: true,
        plain: true,
      }
    );
    // console.log(numberOfAffectedRows);
    console.log(affectedRows);
    for (let index = 0; index < currencies.length; index++) {
      let [numberOfAffectedRows, affectedRows] = await db.Currency.update(
        {
          isBaseCurrency: true,
        },
        {
          where: { code: currencies[index] },
          returning: true,
          plain: true,
        }
      );
    }
    updateExchangeRateTable(db);
    // })();
    // ******* ^^^^^^^^^^^^^^ **************
  }
}

/**
 * This function might run within an interval timer or as a cron job
 */
async function updateExchangeRateTable(db) {
  // first get list of all the baseCurrencyCodes

  let resp = await db.Currency.findAll({});
  console.log(resp.length);
  let baseCurrencyCodes = [];
  let currencyCodes = [];
  if (resp.length != 0) {
    for (let index = 0; index < resp.length; index++) {
      let row = resp[index].dataValues;
      if (row.isBaseCurrency === true) baseCurrencyCodes.push(row.code);
      currencyCodes.push(row.code);
    }
    console.log(baseCurrencyCodes);
    console.log(currencyCodes);
    let currencyScoopUrls = [];
    if (baseCurrencyCodes.length != 0 && currencyCodes.length != 0) {
      for (let baseIndex = 0; baseIndex < baseCurrencyCodes.length; baseIndex++) {
        let baseCode = baseCurrencyCodes[baseIndex];
        let url = `${CURRENCYSCOOP_LATEST_URL}${baseCode}&symbols=`;
        for (let index = 0; index < currencyCodes.length; index++) {
          url += `${currencyCodes[index]},`;
        }
        currencyScoopUrls.push(url.slice(0, url.length - 1));
      }
      let totalAffectedRows = 0;
      for (let index = 0; index < currencyScoopUrls.length; index++) {
        let apiUrl = currencyScoopUrls[index];
        //console.log(apiUrl);
        let response = await axios({
          method: "GET",
          url: apiUrl,
          headers: {
            "content-type": "application/octet-stream",
            "x-rapidapi-host": "currencyscoop.p.rapidapi.com",
            "x-rapidapi-key": process.env.RAPID_API_KEY || "5112b8642cmsh66adc618f8726e4p1f8a51jsn8c2a905c7d57",
            useQueryString: true,
          },
        });
        let base = response.data.response.base;
        //console.log(base);
        let rates = response.data.response.rates;
        let codes = Object.keys(rates);
        //console.log(codes);
        // update the database with the values for the base
        for (let codeIndex = 0; codeIndex < codes.length; codeIndex++) {
          let code = codes[codeIndex];
          let rate = rates[code];
          console.log(`${base}/${code} = ${rate}`);

          // let [numberOfAffectedRows, affectedRows] = await db.ExchangeRate.update(
          let [numberOfAffectedRows] = await db.ExchangeRate.update(
            { rate: rate },
            {
              where: {
                baseCurrencyCode: base,
                targetCurrencyCode: code,
              },
            }
          );
          totalAffectedRows += numberOfAffectedRows;
          // console.log(numberOfAffectedRows);
        }
      }
      console.log(`Number of updated rows = ${totalAffectedRows}`);
    }
  }
}

db.sequelize
  .sync({})
  .then(runServer)
  .then(function () {
    updateCurrencyTable(db);
    // set interval timer to update exchange table
    setInterval(function () {
      updateExchangeRateTable(db);
    }, process.env.EXCHANGE_UPDATE_INTERVAL_MILLI || constants.EXCHANGE_UPDATE_INTERVAL_MILLI);
  });
