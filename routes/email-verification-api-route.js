// **********************************************
// login-register-api-routes - Routes for logging in and registering
// **********************************************
"use strict";
// Requiring our models
var db = require("../models");
const crypto = require("crypto");
const utilities = require("../utilities");
const constants = require("../constants");
const { where } = require("sequelize/types");

// Routes
// =============================================================
module.exports = function (app) {
  // Login route. If successful, will return object containing
  // - status : OK
  // - message : "some message"
  // - sessionUUID : generated session UUID that is also saved in the database
  // Expects:
  // - email
  // - password (clear)
  app.get("/emailVerification/:emailHash", function (req, res) {
    let emailParam = req.params.emailHash;
    let response = {};
    if (emailParam == null || emailParam.length != constants.EMAIL_PARAM_LENGTH) {
      response = { status: "ERROR", message: "Invalid parameter. Unable to verify Email address. Please check URL" };
      res.json(response);
      return;
    }
    // check if there is an account with the same verification code and that has isVerfied set to false
    (async () => {
      let whereClause = { verificationCode: emailParam, isVerified: false };
      let dbResults = await db.Account.findAll({ where: whereClause });
      if (dbResults == null || dbResults.length == 0) {
        response = {
          status: "ERROR",
          message: "There is no record for this email or it has already been verified. Please check URL or re-register",
        };
        res.json(response);
        return;
      }
      // check if verification has timed out. Check transactionTime to see when the email was sent
      let dbResult = dbResults[0];
      // check if the verification came too late
      if (Date.now() - dbResult.transactionTime > process.env.EMAIL_VERIFICATION_TIMEOUT_MILLI) {
        response = {
          status: "ERROR",
          message: "Verification has timed out. Please check URL or re-register",
        };
        // delete the account record
        dbResult = await db.Account.destroy({ where: whereClause });
        res.json(response);
        return;
      }
      // the email has been verified. Update the account record and set verification to true and update transaction time
      let update = { isVerfied: true, transactionTime: Date.now() };
      dbResult = await db.Account.update(update, { where: whereClause });
      console.log(`\n\nUpdated Account after Email verification:\n ${dbResult}`);
    })();
  });
};
