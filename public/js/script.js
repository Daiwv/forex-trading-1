/* The follwoing Web Technology - HTML questions come from
https://www.avatto.com/computer-science/test/mcqs/web-technology/html/162/1.html
*/
/*
  To use modal triggered in Javascript, see: https://www.w3schools.com/bootstrap/bootstrap_ref_js_modal.asp
  To have moal block window:
    https://www.tutorialrepublic.com/faq/how-to-prevent-bootstrap-modal-from-closing-when-clicking-outside.php
*/
var userName = "";
var loginButton = document.getElementById("login-button");
var registerButton = document.getElementById("register-button");
var registerationForm = document.getElementById("registration-form");
var loginForm = document.getElementById("login-form");
const SESSION_UUID_STORAGE_KEY = "forexSessionUUID";

function clearRegistrationForm() {
  document.getElementById("firstname").value = "";
  document.getElementById("lastName").value = "";
  document.getElementById("registration-password").value = "";
  document.getElementById("registration-confirm-password").value = "";
  document.getElementById("email-input").value = "";

  document.getElementById("registration-error-message").innerHTML = "";
  document.getElementById("firstname").focus();
}

$("#acct-summ-buy-btn").click(function (event) {
  event.preventDefault();

  let buyCurrencySelectEl = $("#acct-summ-currency-dropdown");
  let messageEl = $("#account-summary-message");
  let buyAmountEl = $("#acct-summ-buy-amount");
  let currencyCode = buyCurrencySelectEl.val();

  messageEl.text("");

  if (currencyCode === "Choose...") {
    messageEl.text("Select Currency to buy");
    buyCurrencySelectEl.focus();
    return;
  }
  let inputVal = buyAmountEl.val();
  if (inputVal == null || (inputVal = inputVal.trim()).length == 0 || isNaN(inputVal)) {
    messageEl.text("Invalid Amount value");
    buyAmountEl.focus();
    buyAmountEl.select();
    return;
  }
  let buyAmount = parseFloat(inputVal);
  let sessionUUID = localStorage.getItem(SESSION_UUID_STORAGE_KEY);
  if (sessionUUID == null || sessionUUID == "") {
    messageEl.text("Invalid Session. sessionUUID not found");
    return;
  }
  let buyData = { sessionUUID: sessionUUID, currencyCode: currencyCode, amount: buyAmount };
  // send POST request
  let url = "/trade/buy";
  $.ajax(url, { type: "POST", data: buyData }).then(function (resp) {
    if (resp.status === "ERROR") {
      messageEl.text(resp.message);
      return;
    }
    // reload the page to refresh the summary
    location.reload();
  });
});

$(".btn-sell").click(function (event) {
  event.preventDefault();
  let code = $(this).data("code");
  let inpId = `#pos-inp-${code}`;
  let amount = $(inpId).val();
  let messageEl = $("#account-summary-message");
  messageEl.text("");
  if (amount == null || (amount = amount.trim()).length == 0 || isNaN(amount)) {
    $(inpId).val("");
    $(inpId).focus();
    return;
  }

  let sessionUUID = localStorage.getItem(SESSION_UUID_STORAGE_KEY);
  let url = `/trade/sell`;
  let sendData = { sessionUUID: sessionUUID, currencyCode: code, amount: amount };
  // send POST request
  $.ajax(url, { type: "POST", data: sendData }).then(function (resp) {
    if (resp.status === "ERROR") {
      messageEl.text(resp.message);
      return;
    }
    // reload the page to refresh the summary
    location.reload();
  });
});
// event listener for button class on click
/*
 * Event listeners are applied to the forms surrounding the buttons.
 * that way when the button is clicked, the event is fired since the button
 * type is "submit"
 */
if (registerationForm)
  registerationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    // check inputs
    var svalue;
    var fnameEl = document.getElementById("firstname");
    var lnameEl = document.getElementById("lastName");
    var pwdEl = document.getElementById("registration-password");
    var pwdEl2 = document.getElementById("registration-confirm-password");
    var emailEl = document.getElementById("email-input");
    var errorEl = document.getElementById("registration-error-message");
    var baseCurrencySelectEl = $("#base-currency-select");

    var fname, lname, pwd, pwd2, emailString, errText;

    errorEl.innerHTML = "";

    var udata = {};
    // First Name
    if ((svalue = fnameEl.value) === null || (fname = svalue.trim()).length === 0) {
      errorEl.innerHTML = "Invalid First Name";
      fnameEl.focus();
      fnameEl.value = "";
      return;
    }
    udata.firstName = fname;

    // Last Name
    if ((svalue = lnameEl.value) === null || (lname = svalue.trim()).length === 0) {
      errorEl.innerHTML = "Invalid Last Name";
      lnameEl.focus();
      lnameEl.value = "";
      return;
    }
    udata.lastName = lname;

    // Password
    if ((svalue = pwdEl.value) === null || (pwd = svalue.trim()).length === 0) {
      errorEl.innerHTML = "Invalid Password";
      pwdEl.focus();
      pwdEl.value = "";
      return;
    }
    // Confirm Password
    if ((svalue = pwdEl2.value) === null || (pwd2 = svalue.trim()).length === 0) {
      errorEl.innerHTML = "Invalid Confirm Password";
      pwdEl2.focus();
      pwdEl2.value = "";
      return;
    }
    // check if password and confirm password are the same. If not, delete
    // both and set focus back to pwd
    if (pwd.localeCompare(pwd2) != 0) {
      errorEl.innerHTML = "Mismatched Password/Confirm Password";
      pwdEl.value = "";
      pwdEl2.value = "";
      pwdEl.focus();
    }
    udata.password = pwd;

    // Email
    if ((svalue = emailEl.value) === null || (emailString = svalue.trim()).length === 0) {
      errorEl.innerHTML = "Invalid Email";
      emailEl.focus();
      emailEl.value = "";
      return;
    }
    udata.email = emailString;
    var currencyCode = baseCurrencySelectEl.val();
    // make sure base currency is choosen
    if (currencyCode === "Choose...") {
      errorEl.innerHTML = "Choose Base Currency";
      baseCurrencySelectEl.focus();
      return;
    }

    let registerData = {
      firstName: fname,
      lastName: lname,
      email: emailString,
      password: pwd,
      confirmPassword: pwd2,
      baseCurrencyCode: currencyCode,
    };
    //
    // send registration data and wait for response
    $.ajax("/register", { type: "POST", data: registerData }).done(function (resp) {
      if (resp.status !== "OK") {
        errorEl.innerHTML = resp.message;
        fnameEl.focus();
        return;
      }
      var emailElement = document.getElementById("login-email");
      emailElement.value = emailString;
      document.getElementById("login-password").focus();
      errorEl.innerHTML = `${emailString} successfully registered!!. Please log in`;
    });
    // clear the register form
    clearRegistrationForm();
  });

/*
 *
 */
if (loginForm)
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    // check the inputs to make sure the entry is valid
    var emailElement = document.getElementById("login-email");
    var pwdElement = document.getElementById("login-password");
    var errorEl = document.getElementById("login-error-message");

    if (emailElement === null || pwdElement == null) return;
    var inputString;
    var emailString, passwordString;
    // check userName validity
    if ((inputString = emailElement.value) == null || (emailString = inputString.trim().toLowerCase()).length == 0) {
      emailElement.value = "";
      emailElement.focus();
      errorEl.innerHTML = "Invalid Username entry";
      return;
    }
    // check password validity
    if ((inputString = pwdElement.value) == null || (passwordString = inputString.trim().toLowerCase()).length == 0) {
      pwdElement.value = "";
      pwdElement.focus();
      errorEl.innerHTML = "Invalid Password entry";
      return;
    }
    let loginData = { email: emailString, password: passwordString };
    // send registration data and wait for response
    $.ajax("/login", { type: "POST", data: loginData }).done(function (resp) {
      if (resp.status !== "OK") {
        errorEl.innerHTML = resp.message;
        emailElement.focus();
        return;
      }
      let sessionUUID = resp.sessionUUID;
      // login successful. go to account summary
      let accountSummaryData = { sessionUUID: sessionUUID };
      let redirectUrl = `/accountSummary?sessionUUID=${sessionUUID}`;
      location.replace(redirectUrl);
      // save sessionUUID into localStorage
      localStorage.setItem(SESSION_UUID_STORAGE_KEY, sessionUUID);
      let storedUUID = localStorage.getItem(SESSION_UUID_STORAGE_KEY);
    });
  });

if ($("#logoff-modal-confirm-btn")) {
  $("#logoff-modal-confirm-btn").click(function (event) {
    event.preventDefault();
    localStorage.removeItem(SESSION_UUID_STORAGE_KEY);
    location.replace('/');
  });
}
