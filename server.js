var fs = require("fs");
var path = require("path");
const express = require("express");
const https = require("https");
require("dotenv").config({ debug: process.env.DOTENV_DEBUG === 'true' });
const enigma = require("./security/newencryption");
const handlebars = require("express-handlebars");
const Handlebars = require("handlebars");
const axios = require("axios");
const utilities = require("./utilities");
const app = express();

const { QueryTypes } = require("sequelize");
const { Op } = require("sequelize");

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
require('./routes/email-verification-api-route')(app);

let CURRENCYSCOOP_LATEST_URL = `https://currencyscoop.p.rapidapi.com/latest?base=`;
const CURRENCYSCOOP_HISTORICAL_URL = ``;
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
  let hashsalt = process.env.DIGEST_SALT;
  let isValidated = true;
  let transactionTime = Date.now();
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
      let clearPassword = seedRow["password"];
      let passwordData = utilities.saltHashPassword512(clearPassword, hashsalt);
      subset["passwordHash"] = passwordData.passwordHash;
      subset["isValidated"] = isValidated;
      subset["transactionTime"] = transactionTime;
      let [curr, created] = await db.Account.findOrCreate({ where: { uuid: uuid }, defaults: subset });
      console.log(curr.get({ plain: true }));
      console.log(created);
      // if created, update positions table to reflect the initial amount.
      if (created) {
        // get accountUUID
        let position = {
          accountUUID: uuid,
          currencyCode: subset["baseCurrencyCode"],
          amount: subset["initialAmount"],
        };
        let dbResult = await db.Position.create(position);
        console.log("\n\nInserted row into positions Table:");
        console.log(position);
        let message = `Inserted Position for ${subset["baseCurrencyCode"]} in the amount of ${subset["initialAmount"]}`;
        console.log(`\n${message}\n`);
        console.log(`\n${dbResult}\n`);
      }
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
    await updateExchangeRateTable(db);
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
  .then(async function () {
    await updateCurrencyTable(db);
    //
    // prune and update HistoricalRate table
    await updateHistoricalRates(db);
    // set interval timer to update exchange table
    console.log("\n\n\n Setting up Exchange Rates Interval Timer\n");
    setInterval(function () {
      updateExchangeRateTable(db);
    }, process.env.EXCHANGE_UPDATE_INTERVAL_MILLI || constants.EXCHANGE_UPDATE_INTERVAL_MILLI);

    // set interval for HistoricalRate table update
    console.log("\n\n\n Setting up Historical Rates Interval Timer\n");
    setInterval(function () {
      updateHistoricalRates(db);
    }, process.env.HISTORICAL_RATES_UPDATE_INTERVAL_MILLI || constants.HISTORICAL_RATES_UPDATE_INTERVAL_MILLI);
  });

async function updateHistoricalRates(db) {
  let historyDays = process.env.HISTORY_DAYS || constants.HISTORY_DAYS;
  let todayDateObj = new Date();
  // get today's date and remove all rows in the HistoricalRate table that are older than that
  let startDate = todayDateObj.getTime() - historyDays * constants.ONE_DAY_MILLI;
  let dbResult = await db.HistoricalRate.destroy({ where: { dateStamp: { [Op.lt]: startDate } } });
  console.log("\n\nHistoricalRate Prunning results:");
  console.log(dbResult);
  // get list of currencies and base currencies
  let currencyCodes = [];
  let baseCurrencyCodes = [];
  dbResult = await db.Currency.findAll({});
  if (dbResult != null) {
    for (let index = 0; index < dbResult.length; index++) {
      let row = dbResult[index].dataValues;
      if (row.isBaseCurrency === true) baseCurrencyCodes.push(row.code);
      currencyCodes.push(row.code);
    }

    // create URL for getting historical currency rates. Outer loop is date and inner loop is base currency
    let historicalParams = [];
    let todayTime = todayDateObj.getTime();
    let dateObject = new Date();
    for (let i = 1; i <= historyDays; i++) {
      dateObject.setTime(todayTime - constants.ONE_DAY_MILLI * i);
      let date = utilities.getParsedTime(dateObject.getTime());
      for (let j = 0; j < baseCurrencyCodes.length; j++) {
        let baseCurrency = baseCurrencyCodes[j];
        let symbolsArray = [];
        for (let k = 0; k < currencyCodes.length; k++) {
          let code = currencyCodes[k];
          if (code !== baseCurrency) symbolsArray.push(code);
        }
        let symbols = symbolsArray.join(",");
        historicalParams.push({ date: date, base: baseCurrency, symbols: symbols });
      }
    }

    for (let i = 0; i < historicalParams.length; i++) {
      let params = historicalParams[i];
      let response = await axios({
        method: "GET",
        url: "https://currencyscoop.p.rapidapi.com/historical",
        headers: {
          "content-type": "application/octet-stream",
          "x-rapidapi-host": "currencyscoop.p.rapidapi.com",
          "x-rapidapi-key": "5112b8642cmsh66adc618f8726e4p1f8a51jsn8c2a905c7d57",
          useQueryString: true,
        },
        params: params,
      });
      let rates = response.data.response.rates;
      // console.log(params);
      // console.log(rates);
      params["rates"] = rates;
    }
    // now insert/update into HistoricalRate table
    let createdCount = 0;
    for (let i = 0; i < historicalParams.length; i++) {
      let params = historicalParams[i];
      let dateStamp = Number(new Date(params.date));
      //let [curr, created] = await db.Currency.findOrCreate({ where: { code: code }, defaults: subset });
      let base = params.base;
      let rates = params.rates;
      let currencies, whereClause, defaults, targetCurrencyCode, rate;
      if (rates != null && (currencies = Object.keys(rates)) != null && currencies.length != 0) {
        for (let j = 0; j < currencies.length; j++) {
          targetCurrencyCode = currencies[j];
          rate = rates[targetCurrencyCode];
          defaults = { rate: rate };
          whereClause = { dateStamp: dateStamp, baseCurrencyCode: base, targetCurrencyCode: targetCurrencyCode };
          let [curr, created] = await db.HistoricalRate.findOrCreate({
            where: whereClause,
            defaults: defaults,
          });
          // console.log(curr.get({ plain: true }));
          // console.log(created);
          if (created) createdCount++;
        }
      }
    }
    console.log(`\n\n${createdCount} rows inserted into HistoricalRate table\n`);
  }
}
