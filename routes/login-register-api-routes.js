// **********************************************
// login-register-api-routes - Routes for logging in and registering
// **********************************************
"use strict";
// Requiring our models
var db = require("../models");
const crypto = require("crypto");
const utilities = require("../utilities");
const constants = require("../constants");
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
  app.post("/login", function (req, res) {
    // console.log(`Executing /login (${req.method}) using protocol ${req.protocol}`);
    let email = req.body.email;
    let password = req.body.password;
    let response = { status: "OK", message: "Successfully logged in" };

    // check of user is in account database
    let sessionUUID = utilities.generateUUID();
    db.Account.findAll({ where: { email: email } })
      .then(function (accounts) {
        if (accounts == null || accounts.length != 1) throw new Error("No such account");
        if (accounts[0].dataValues.password != password) throw new Error(`Password mis-match`);
        // update account with new Session ID and update lastLogin and last Transaction
        let sessionTime = Date.now();
        // console.log(accounts[0].dataValues);
        db.Account.update(
          { sessionUUID: sessionUUID, transactionTime: sessionTime, lastLoginTime: sessionTime },
          { where: { email: email }, returning: true, plain: true }
        )
          .then(function (account) {
            // console.log(account);
            if (account == null) throw new Error("Unable to update database");
            response = { status: "OK", message: "Login successful", sessionUUID: sessionUUID };
            res.json(response);
          })
          .catch(function (error) {
            // console.log(error);
            response = { status: "ERROR", message: error.message };
            res.json(response);
          });
      })
      .catch(function (error) {
        // console.log(error);
        response = { status: "ERROR", message: error.message };
        res.json(response);
      });
  });

  // Registeration route. If successful, will return object containing
  // - status : OK
  // - message : "some message"
  // If error:
  // - status: ERROR
  // - message : "some error message"
  // Expects: firstName, lastName, email, password, confirmPassword, baseCurrencyCode
  app.post("/register", function (req, res) {
    console.log(`Executing /register (${req.method}) using protocol ${req.protocol}`);
    let response = { status: "ERROR", message: "Unknown Error" };
    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let email = req.body.email;
    let password = req.body.password;
    let baseCurrencyCode = req.body.baseCurrencyCode;
    let confirmPassword = req.body.confirmPassword;

    // console.log(`First Name:       ${firstName}`);
    // console.log(`Last Name:        ${lastName}`);
    // console.log(`Email:            ${email}`);
    // console.log(`Password:         ${password}`);
    // console.log(`Confirm Password: ${confirmPassword}`);
    // console.log(`Base Currency:    ${baseCurrencyCode}`);

    if (baseCurrencyCode == null || baseCurrencyCode === "") baseCurrencyCode = "USD";

    if (firstName == null || (firstName = firstName.trim()).length < 1) {
      response["message"] = "Error! Improper First Name field";
      res.json(response);
      return;
    }
    if (lastName == null || (lastName = lastName.trim()).length < 1) {
      response["message"] = "Error! Improper Last Name field";
      res.json(response);
      return;
    }
    if (email == null || (email = email.trim()).length < 1 || utilities.validateEmail(email) == false) {
      response["message"] = "Error! Improper Email field";
      res.json(response);
      return;
    }
    if (password == null || (password = password.trim()).length < 4) {
      response["message"] = "Error! Improper Password field";
      res.json(response);
      return;
    }
    if (confirmPassword == null || (confirmPassword = confirmPassword.trim()).length < 4) {
      response["message"] = "Error! Improper Password field";
      res.json(response);
      return;
    }
    if (password !== confirmPassword) {
      response["message"] = "Error! Password fields mis-match";
      res.json(response);
      return;
    }
    // check if email is already in the account table
    db.Account.findAll({
      where: {
        email: email,
      },
    })
      .then(function (accounts) {
        if (accounts && accounts.length > 0) {
          response["message"] = `Account already exists (${email})`;
          res.json(response);
          return;
        } else {
          response["message"] = `Account (${email}) successfully created`;
          response["status"] = "OK";
          // get the USD to baseCurrency exchange
          let accountUUID = utilities.generateUUID();
          db.ExchangeRate.findAll({
            where: { baseCurrencyCode: "USD", targetCurrencyCode: baseCurrencyCode },
          })
            .then(function (exchange) {
              if (exchange.length != 0) {
                let rate = exchange[0].dataValues.rate;
                let initialAmount = constants.INITIAL_INVESTMENT_AMOUNT_USD * rate;
                let accountData = {
                  uuid: accountUUID,
                  firstName: firstName,
                  lastName: lastName,
                  email: email,
                  password: password,
                  baseCurrencyCode: baseCurrencyCode,
                  initialAmount: initialAmount,
                };

                db.Account.create(accountData)
                  .then(function () {
                    // create position record with base currency
                    let position = { amount: initialAmount, accountUUID: accountUUID, currencyCode: baseCurrencyCode };
                    db.Position.create(position)
                      .then(function (data) {
                        response = { status: "OK", message: `Successfully created account for ${email}` };
                        res.json(response);
                        return;
                      })
                      .catch(function (error) {
                        // console.log(error);
                        response["status"] = "ERROR";
                        response["message"] = `Database error. Cannot set up initial position for ${email}`;
                        res.json(response);
                        return;
                      });
                  })
                  .catch(function (error) {
                    // console.log(error);
                    response["status"] = "ERROR";
                    response["message"] = `Database error. Cannot create account for ${email}`;
                    res.json(response);
                    return;
                  });
              }
            })
            .catch(function (error) {
              // console.log(error);
              response["status"] = "ERROR";
              response["message"] = `Database error. Cannot create account for ${email}`;
              res.json(response);
              return;
            });
        }
      })
      .catch(function (error) {
        // console.log(error);
        response["status"] = "ERROR";
        response["message"] = `Database error. Cannot create account for ${email}`;
        res.json(response);
        return;
      });
  });
};
