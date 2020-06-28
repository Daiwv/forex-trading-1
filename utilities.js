const crypto = require("crypto");

function validateEmail(inputText) {
  var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (inputText.match(mailformat)) return true;
  else return false;
}

function generateUUID(numberOfBytes) {
  if (numberOfBytes == null || isNaN(numberOfBytes)) numberOfBytes = 16;
  let uuid = crypto.randomBytes(numberOfBytes).toString("hex");
  if (numberOfBytes == 16)
    return (
      uuid.slice(0, 8) +
      "-" +
      uuid.slice(8, 12) +
      "-" +
      uuid.slice(12, 16) +
      "-" +
      uuid.slice(16, 20) +
      "-" +
      uuid.slice(20)
    );
  else return uuid;
}

/**
 *
 * Returns time in YYY-MM-DD format from UTC time in milliseconds
 */
function getParsedTime(milliTime) {
  let dateObj = new Date();
  dateObj.setTime(milliTime);
  let year = dateObj.getUTCFullYear();
  let month = dateObj.getUTCMonth() + 1;
  let day = dateObj.getUTCDate();
  if (day < 10) day = "0" + day;
  if (month < 10) month = "0" + month;
  return `${year}-${month}-${day}`;
}

/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 */
function genRandomString(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") /** convert to hexadecimal format */
    .slice(0, length); /** return required number of characters */
}

/**
 * hash password with sha512.
 * @function
 * @param {string} password - List of required fields.
 * @param {string} salt - Data to be validated.
 */
function sha512(password, salt) {
  var hash = crypto.createHmac("sha512", salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var value = hash.digest("hex");
  return {
    salt: salt,
    passwordHash: value,
  };
}

function saltHashPassword512(userpassword, saltStr) {
  var salt = saltStr || genRandomString(16); /** Gives us salt of length 16 */
  var passwordData = sha512(userpassword, salt);
  return passwordData;
}

module.exports = {
  validateEmail,
  generateUUID,
  getParsedTime,
  genRandomString,
  sha512,
  saltHashPassword512,
};
