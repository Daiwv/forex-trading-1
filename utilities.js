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
module.exports = { validateEmail, generateUUID };
