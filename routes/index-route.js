// Dependencies
// =============================================================
var path = require("path");
var db = require("../models");
const crypto = require("crypto");
const utilities = require("../utilities");
const constants = require("../constants");

// Routes
// =============================================================
module.exports = function (app) {
  // index route loads login-registration.html
  /**
   * Loads Base Currencies from database and creates an object array consisting of the following object
   *  name: <currency name>
   *  code: <currency code>
   *  country: <currency country>
   *  symbolUnicodeHex: <hex representation of currency symbol>
   *
   * Response object is as follows:
   * status: <OK|ERROR>
   * message: <message>
   * baseCurrencies: <array of objects>
   */
  app.get("/", function (req, res) {
    console.log("\n\nRunning Index route\n");
    let response = {};
    // get Base Currency List from database
    (async () => {
      let dbCurrencies = await db.Currency.findAll({ where: { isBaseCurrency: true } });
      if (dbCurrencies == null || dbCurrencies.length == 0) {
        response = { status: "ERROR", message: "Error Reading database: base currencies" };
        res.json(response); // keep this one. Do not change to res.render(....)
        return;
      }
      // instead of for-loop, lets use Javascript array iteration...
      let baseCurrencies = [];
      dbCurrencies.forEach((currency) => {
        let dv = currency.dataValues;
        baseCurrencies.push({
          name: dv.name,
          code: dv.code,
          country: dv.country,
          symbolUnicodeHex: dv.symbolUnicodeHex,
        });
      });
      response = {
        status: "OK",
        message: `Found ${dbCurrencies.length} base currencies`,
        baseCurrencies: baseCurrencies,
      };
      console.log(response);
      res.render("login-registration",response);
    })();
    // res.sendFile(path.join(__dirname, "../public/login-registration.html"));
  });
};
