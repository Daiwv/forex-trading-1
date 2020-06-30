// **********************************************
// account-summary-api-route - Processes Account Summary POST request
// **********************************************

// Requiring our models
"use strict";
var db = require("../models");
const crypto = require("crypto");
const utilities = require("../utilities");
const constants = require("../constants");
// Routes
// =============================================================
module.exports = function (app) {

  app.get("/accountSummary", function (req, res) {
    console.log(`Executing /accountSummary (${req.method}) using protocol ${req.protocol}`);
    // check sessionUUID and see if it is valid and "active"
    let sessionUUID = req.query.sessionUUID;
    console.log("UUID IN DA HOUSE ", sessionUUID);
    let response = {};
    if (sessionUUID == null || sessionUUID === "") {
      response = { status: "ERROR", message: "ERROR!! No SessionUUID provided!" };
      res.redirect("/");
      // res.json(response);
      return;
    }
    // get account for the sessionUUID
    (async () => {
      let dbUsers = await db.Account.findAll({
        where: {
          sessionUUID: sessionUUID,
        },
      });
      if (dbUsers == null || dbUsers.length != 1) {
        response = { status: "ERROR", message: "ERROR!! SessionUUID is not found!", sessionUUID: sessionUUID };
        res.redirect("/");
        // res.json(response);
        return;
      }
      // get currencies
      let dbCurrencies = await db.Currency.findAll({});
      if (dbCurrencies == null || dbCurrencies.length == 0) {
        response = {
          status: "ERROR",
          message: "ERROR!! Cannot get currencies from database!",
          sessionUUID: sessionUUID,
        };
        res.redirect("/");
        // res.json(response);
        return;
      }
      let currencies = {};
      for (let index = 0; index < dbCurrencies.length; index++) {
        let dbCurr = dbCurrencies[index];
        currencies[dbCurr.code] = {
          name: dbCurr.name,
          country: dbCurr.country,
          symbolUnicodeHex: dbCurr.symbolUnicodeHex,
        };
      }
      let dbUser = dbUsers[0];
      let dbXactionTime = dbUser.transactionTime;
      let accountUUID = dbUser.uuid;
      let baseCurrency = dbUser.baseCurrencyCode;
      let initialAmount = dbUser.initialAmount;
      let sessionTimoutMilli = process.env.SESSION_TIMEOUT_MILLI || constants.SESSION_TIMEOUT_MILLI;
      let fullName = `${dbUser.firstName} ${dbUser.lastName}`;
      // check if action was within the timeout period
      if (dbXactionTime == null || dbXactionTime == "") dbXactionTime = Date.now();
      let xactionTime = Date.now();
      if (dbXactionTime + sessionTimoutMilli < xactionTime) {
        response = { status: "ERROR", message: "ERROR!! Session timeout", sessionUUID: sessionUUID };
        // go back to login page
        res.redirect("/");
        // res.json(response);
        return;
      }
      // update the account and set new transaction time
      dbUsers = await db.Account.update(
        { transactionTime: xactionTime },
        { where: { sessionUUID: sessionUUID }, returning: true, plain: true }
      );
      // now get the positions for the user
      let dbPositions = await db.Position.findAll({
        where: {
          accountUUID: accountUUID,
        },
        order: [["currencyCode", "ASC"]],
      });
      response = { status: "OK", sessionUUID: sessionUUID, message: "Account Summary" };
      let curr = currencies[baseCurrency];
      let baseCurrencyObj = {
        code: baseCurrency,
        name: curr.name,
        country: curr.country,
        symbolUnicodeHex: curr.symbolUnicodeHex,
      };
      let summary = {
        fullName: fullName,
        baseCurrency: baseCurrencyObj,
        initialAmount: new Number(initialAmount).toFixed(2),
        currentAccountValue: 0.0,
        available: 0.0,
      };

      let rates = [];
      let ratesObj = [];
      // get rates
      let dbRates = await db.ExchangeRate.findAll({
        where: { baseCurrencyCode: baseCurrency },
        order: [["targetCurrencyCode", "ASC"]],
      });
      if (dbRates != null && dbRates.length != 0) {
        for (let index = 0; index < dbRates.length; index++) {
          let rate = dbRates[index];
          let curr = currencies[rate.targetCurrencyCode];
          ratesObj[rate.targetCurrencyCode] = parseFloat(rate.rate);
          if (rate.targetCurrencyCode !== baseCurrency) {
            rates.push({
              code: rate.targetCurrencyCode,
              rate: parseFloat(rate.rate),
              name: curr.name,
              country: curr.country,
              symbolUnicodeHex: curr.symbolUnicodeHex,
            });
          }
        }
      }
      summary["rates"] = rates;

      let positions = [];
      let available;
      if (dbPositions != null && dbPositions.length != 0) {
        let pos, amount;
        for (let index = 0; index < dbPositions.length; index++) {
          pos = dbPositions[index];
          amount = parseFloat(pos.amount);
          let curr = currencies[pos.currencyCode];
          if (pos.currencyCode === baseCurrency) {
            available = amount;
            summary["available"] = new Number(amount).toFixed(2);
          } else {
            let position = {
              code: pos.currencyCode,
              amount: new Number(amount).toFixed(2),
              rate: ratesObj[pos.currencyCode],
              name: curr.name,
              country: curr.country,
              symbolUnicodeHex: curr.symbolUnicodeHex,
            };
            positions.push(position);
          }
        }
        summary["positions"] = positions;
      }
      response["summary"] = summary;
      // calculate current account value based on current exhcnage rates
      let currentAccountValue = available;
      if (positions != null) {
        for (let index = 0; index < positions.length; index++) {
          let pos = positions[index];
          let code = pos.code;
          let amount = pos.amount;
          let exchange = ratesObj[code];
          currentAccountValue += amount / exchange;
        }
        summary["currentAccountValue"] = new Number(currentAccountValue).toFixed(2);
      }

      res.render("account-summary-new", response);
    })();
  });
};
