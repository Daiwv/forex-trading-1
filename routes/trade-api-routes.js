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
  /**
   * Buy Currency using base currency
   * Expects:
   * - sessionUUID - Session UUID
   * - currencyCode - The code of the currency to be purchased using the position amount of the base currency
   * - amount - Amount of base currency to use in purchasing the target currency. If this is more than the
   *   amount of base currency left, it will result in error
   */
  app.post("/trade/buy", function (req, res) {
    console.log(`\n\nExecuting ${req.baseUrl} (${req.method}) using protocol ${req.protocol}`);
    // check sessionUUID and see if it is valid and "active"
    let sessionUUID = req.body.sessionUUID;
    let currencyCode = req.body.currencyCode;
    let tradeAmount = req.body.amount;
    let response = {};
    if (sessionUUID == null || sessionUUID === "") {
      response = { status: "ERROR", message: "ERROR!! No Session UUID provided!" };
      res.json(response);
      return;
    }
    if (currencyCode == null || currencyCode == "") {
      response = { status: "ERROR", message: "ERROR!! Currency Code is invalid!", sessionUUID: sessionUUID };
      res.json(response);
      return;
    }
    if (tradeAmount == null || isNaN(tradeAmount)) {
      response = { status: "ERROR", message: "ERROR!! Amount is invalid!", sessionUUID: sessionUUID };
      res.json(response);
      return;
    }
    console.log("\n\nParameters:");
    console.log(`\tSessionUUID:   ${sessionUUID}`);
    console.log(`\tCurrency Code: ${currencyCode}`);
    console.log(`\tAmount:        ${tradeAmount}`);
    (async () => {
      //get the account information and check session time
      let dbUsers = await db.Account.findAll({
        where: {
          sessionUUID: sessionUUID,
        },
      });
      if (dbUsers == null || dbUsers.length != 1) {
        response = { status: "ERROR", message: "ERROR!! SessionUUID is not found!", sessionUUID: sessionUUID };
        res.json(response);
        return;
      }
      console.log(dbUsers);
      let dbUser = dbUsers[0];
      let dbXactionTime = dbUser.transactionTime;
      let accountUUID = dbUser.uuid;
      let baseCurrency = dbUser.baseCurrencyCode;
      //let initialAmount = dbUser.initialAmount;
      let sessionTimoutMilli = process.env.SESSION_TIMEOUT_MILLI || constants.SESSION_TIMEOUT_MILLI;
      // check if action was within the timeout period
      if (dbXactionTime == null || dbXactionTime == "") dbXactionTime = Date.now();
      let xactionTime = Date.now();
      if (dbXactionTime + sessionTimoutMilli < xactionTime) {
        response = { status: "ERROR", message: "ERROR!! Session timeout", sessionUUID: sessionUUID };
        // go back to login page
        // res.redirect('/');
        res.json(response);
        return;
      }
      // update the account and set new transaction time
      dbUsers = await db.Account.update(
        { transactionTime: xactionTime },
        { where: { sessionUUID: sessionUUID }, returning: true, plain: true }
      );

      // now check if user has enough of base currency in positions
      let positions = await db.Position.findAll({ where: { accountUUID: accountUUID, currencyCode: baseCurrency } });
      if (positions == null || positions.length < 1) {
        response = {
          status: "ERROR",
          message: `No position or amount found for base currency ${baseCurrency}`,
          sessionUUID: sessionUUID,
        };
        res.json(response);
        return;
      }

      let positionAmount = 0.0;
      for (let index = 0; index < positions.length; index++) {
        positionAmount += parseFloat(positions[index].amount);
      }
      if (positionAmount < tradeAmount) {
        let message = `You have exceeded your balance of ${positionAmount.toFixed(2)}`;
        res.json({ status: "ERROR", message });
        return;
      }

      let baseCurrencyBalance = positionAmount - tradeAmount;
      if (baseCurrencyBalance < 0.01) baseCurrencyBalance = 0.0;
      // get Exchange rate for currency using baseCurrency
      let dbRates = await db.ExchangeRate.findAll({
        where: { baseCurrencyCode: baseCurrency, targetCurrencyCode: currencyCode },
      });
      if (dbRates == null || dbRates.length == 0) {
        res.json({
          status: "ERROR",
          message: `Unable to get exchange rate for ${currencyCode} using base currency ${baseCurrency}`,
        });
        return;
      }
      let exchageRate = dbRates[0].rate;
      let purchasedAmount = parseFloat(exchageRate) * parseFloat(tradeAmount);

      // check if there is currency code in the position table for this user. If not, create. If so, update the table
      let dbPositions = await db.Position.findAll({ where: { accountUUID: accountUUID, currencyCode: currencyCode } });
      let message;
      if (dbPositions == null || dbPositions.length == 0) {
        // there is no position for the currency. This is a new position. So insert a new row
        let data = {
          amount: purchasedAmount,
          accountUUID: accountUUID,
          currencyCode: currencyCode,
        };
        let dbResult = await db.Position.create(data);
        console.log("\n\nInserted row into positions Table:");
        console.log(data);
        console.log("\n\n");
        message = `Inserted Position for ${currencyCode} in the amount of ${purchasedAmount}`;
      } else {
        // there is already a position for this currency. get the value, add the purchased amount and update it
        let updateAmount = parseFloat(dbPositions[0].amount) + purchasedAmount;
        let data = { amount: updateAmount };
        let whereClause = { accountUUID: accountUUID, currencyCode: currencyCode };
        let dbResult = await db.Position.update(data, { where: whereClause });
        console.log("\nUpdated row in positions Table:");
        console.log(`\tCurrency Code:    ${currencyCode}`);
        console.log(`\tOld Amount:       ${dbPositions[0].amount}`);
        console.log(`\tPurchased Amount: ${purchasedAmount}`);
        console.log(`\tUpdated Amount:   ${updateAmount}`);
        console.log("\n\n");
        message = `Updated Position for ${currencyCode} in the amount of ${updateAmount}`;
      }

      // update the base currency with the baseCurrencyBalance
      let data = {amount:baseCurrencyBalance};
      let whereClause = {accountUUID:accountUUID,currencyCode:baseCurrency};
      let dbResult = await db.Position.update(data,{where:whereClause});
      console.log("\n\nUpdated Base Currency Position:");
      console.log(`Original Value:     ${positionAmount}`);
      console.log(`New Value:          ${baseCurrencyBalance}`);
      console.log(`Base Currency Code: ${baseCurrency}`);

      console.log(message);
      res.json({ status: "OK", message });
    })();
  });

  /**
   *
   */
  app.post("/trade/sell", function (req, res) {
    console.log(`Executing /trade/sell (${req.method}) using protocol ${req.protocol}`);
    // check sessionUUID and see if it is valid and "active"
    let sessionUUID = req.body.sessionUUID;
    let currencyCode = req.body.currencyCode;
    let tradeAmount = req.body.amount;
    let response = {};
    if (sessionUUID == null || sessionUUID === "") {
      response = { status: "ERROR", message: "ERROR!! No SessionUUID provided!" };
      res.json(response);
      return;
    }
    if (currencyCode == null || currencyCode == "") {
      response = { status: "ERROR", message: "ERROR!! Currency Code is invalid!", sessionUUID: sessionUUID };
      res.json(response);
      return;
    }
    if (tradeAmount == null || isNaN(tradeAmount)) {
      response = { status: "ERROR", message: "ERROR!! Amount is invalid!", sessionUUID: sessionUUID };
      res.json(response);
      return;
    }

    (async () => {
      //get the account information and check session time
      let dbUsers = await db.Account.findAll({
        where: {
          sessionUUID: sessionUUID,
        },
      });
      if (dbUsers == null || dbUsers.length != 1) {
        response = { status: "ERROR", message: "ERROR!! SessionUUID is not found!", sessionUUID: sessionUUID };
        res.json(response);
        return;
      }
      console.log(dbUsers);
      let dbUser = dbUsers[0];
      let dbXactionTime = dbUser.transactionTime;
      let accountUUID = dbUser.uuid;
      let baseCurrency = dbUser.baseCurrencyCode;
      let initialAmount = dbUser.initialAmount;
      let sessionTimoutMilli = process.env.SESSION_TIMEOUT_MILLI || constants.SESSION_TIMEOUT_MILLI;
      // check if action was within the timeout period
      if (dbXactionTime == null || dbXactionTime == "") dbXactionTime = Date.now();
      let xactionTime = Date.now();
      if (dbXactionTime + sessionTimoutMilli < xactionTime) {
        response = { status: "ERROR", message: "ERROR!! Session timeout", sessionUUID: sessionUUID };
        // go back to login page
        // res.redirect('/');
        res.json(response);
        return;
      }
      // update the account and set new transaction time
      dbUsers = await db.Account.update(
        { transactionTime: xactionTime },
        { where: { sessionUUID: sessionUUID }, returning: true, plain: true }
      );

      // get user position for currency
      let dbPositions = await db.Position.findAll({ where: { accountUUID: accountUUID, currencyCode: currencyCode } });
      if (dbPositions == null || dbPositions.length == 0) {
        res.json({ status: "ERROR", message: `User has no position (funds). Cannot trade ${currencyCode}` });
        return;
      }
      let positionAmount = 0.0;
      for (let index = 0; index < dbPositions.length; index++) {
        positionAmount += dbPositions[index].amount;
      }
      positionAmount = parseFloat(positionAmount);
      if (tradeAmount > positionAmount) {
        res.json({ status: "ERROR", message: `Trade amount (${tradeAmount}) exceeds position (${positionAmount})` });
        return;
      }
      // get Exchange rate for currency using baseCurrency
      let dbRates = await db.ExchangeRate.findAll({
        where: { baseCurrencyCode: baseCurrency, targetCurrencyCode: currencyCode },
      });
      if (dbRates == null || dbRates.length == 0) {
        res.json({
          status: "ERROR",
          message: `Unable to get exchange rate for ${currencyCode} using base currency ${baseCurrency}`,
        });
        return;
      }
      let exchageRate = dbRates[0].rate;
      let bought = tradeAmount / exchageRate;
      let positionBalance = parseFloat(positionAmount) - parseFloat(tradeAmount);

      if (positionBalance < 0.01) {
        // if all gone, delete position
        let dbResult = await db.Position.destroy({ where: { currencyCode: currencyCode, accountUUID: accountUUID } });
        console.log(
          `\n\nRemoved position for currency ${currencyCode} for user ${dbUser.firstName} ${dbUser.lastName} (${dbUser.email})`
        );
        console.log(dbResult);
      } else {
        // update position for currency code: positionBalance
        let updateData = { amount: positionBalance };
        let dbResult = await db.Position.update(updateData, {
          where: { accountUUID: accountUUID, currencyCode: currencyCode },
        });
        console.log(`\n\nUpdated Position for user  ${dbUser.firstName} ${dbUser.lastName} (${dbUser.email}):`);
        console.log(`\tCurrencyCode: ${currencyCode}`);
        console.log(`\tOld Value: ${positionAmount}`);
        console.log(`\tNew Value: ${positionBalance}`);
        console.log(dbResult);
      }
      // now get base currency position and add to it, then update
      dbPositions = await db.Position.findAll({ where: { accountUUID: accountUUID, currencyCode: baseCurrency } });
      if (dbPositions == null || dbPositions.length == 0) {
        res.json({
          status: "ERROR",
          message: `ERROR!!! Unable to update exchange position for base currency (${baseCurrency})`,
        });
        return;
      }
      let balance = parseFloat(dbPositions[0].amount) + parseFloat(bought);
      // update position for base currency
      let updateData = { amount: balance };
      let dbResult = await db.Position.update(updateData, {
        where: { accountUUID: accountUUID, currencyCode: baseCurrency },
      });
      console.log(
        `\n\nUpdated Base Currency Position for user  ${dbUser.firstName} ${dbUser.lastName} (${dbUser.email}):`
      );
      console.log(`\tCurrencyCode: ${currencyCode}`);
      console.log(`\tOld Value: ${dbPositions[0].amount}`);
      console.log(`\tNew Value: ${balance}`);
      console.log(dbResult);
      res.json({ status: "OK", message: `Sell of ${tradeAmount} ${currencyCode} successful` });
    })();
  });
};
