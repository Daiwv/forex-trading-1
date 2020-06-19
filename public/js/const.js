/*
 User Data
*/
const SESSION_TIMEOUT_DELAY = 5 * 1000; // five (5) seconds
const USER_DATA_KEY = "code-quiz-user-data";
const TEST_USER_DATA = {
  johndoe: {
    userName: "johndoe",
    firstName: "John",
    lastName: "Doe",
    password: "!#password",
    email: "johnDoe@gmail.com",
    sessionCount: 0,
    minScore: null,
    maxScore: null,
    lastScore: null,
    sessionId: null,
    sessionTime: null
  },
  marydoe: {
    userName: "marydoe",
    firstName: "Mary",
    lastName: "Doe",
    password: "*&password*(",
    email: "marydoe@yahoo.com",
    sessionCount: 0,
    minScore: null,
    maxScore: null,
    lastScore: null,
    sessionId: null,
    sessionTime: null
  }
};

const SESSION_ID_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SESSION_ID_LENGTH = 24;
const QUIZ_TIME_SECONDS = 120;
const QUIZ_TIME_MILLI = QUIZ_TIME_SECONDS * 1000;
// Interval period for the quiz time. The timer display will be
// updated within this value in milliseconds
const QUIZ_TIME_INTERVAL_MILLI = 100;
// number of questions for each quiz session
const QUESTIONS_PER_QUIZ = 10;
// time interval (in milliseconds) per question
const QUESTION_TIME_MILLI = QUIZ_TIME_MILLI / QUESTIONS_PER_QUIZ;
var allUserData;
// counts the number of questions asked
var questionCounter = 0;

/*
 * updates the database with session information for this user
 */
function setSessionData(userData) {
  if (userData != null) {
    var userId = userData.userName;
    userData.sessionId = randomString(SESSION_ID_LENGTH, SESSION_ID_CHARACTERS);
    userData.sessionTime = new Date().getTime();
    allUserData[userId] = userData;
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(allUserData));
  }
}

function navigateToStartOfQuiz(userData) {
  setSessionData(userData);
  var targetUrl = "./page2.html?";
  targetUrl += "userId=" + userData.userName;
  targetUrl += "&sessionId=" + userData.sessionId;
  targetUrl += "&sessionTime=" + userData.sessionTime;
  window.location.replace(targetUrl);
}

/*
 * Generates a random string of length len from characters in inputString
 */
function randomString(len, inputString) {
  var ans = "";
  for (var i = len; i > 0; i--) {
    ans += inputString[Math.floor(Math.random() * inputString.length)];
  }
  return ans;
}
/*
 * Test function that saves the test userData into localStorage
 */
function initData() {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(TEST_USER_DATA));
  console.log(TEST_USER_DATA);
}

/*
 *
 */
function getUserDataLogText(ud) {
  var retval = "\n";
  retval += "\n\tUser Id       : " + ud.userName;
  retval += "\n\tFirst Name    : " + ud.firstName;
  retval += "\n\tLast Name     : " + ud.lastName;
  retval += "\n\tPassword      : " + ud.password;
  retval += "\n\tEmail         : " + ud.email;
  retval += "\n\tSession Count : " + ud.sessionCount;
  retval += "\n\tMin Score     : " + ud.minScore;
  retval += "\n\tMax Score     : " + ud.maxScore;
  retval += "\n\tLast Score    : " + ud.lastScore;
  retval += "\n\tSession ID    : " + ud.sessionId;
  retval += "\n\tSession Time  : " + ud.sessionTime;
  return retval;
}

/*
 * Function that reads the localStorage to locate the userData object.
 * This object contains an object that has all the user information.
 * The "key" for this object is USER_DATA_KEY
 */
function loadAllUserData() {
  var udata = localStorage.getItem(USER_DATA_KEY);
  if (udata == null) {
    initData();
    udata = localStorage.getItem(USER_DATA_KEY);
  }
  if (udata != null) {
    allUserData = JSON.parse(udata);
    logAllUserData(allUserData);
  }
}

/*
 * Console logs all user data information from localStorage
 */
function logAllUserData(allUserData) {
  //now print it by getting the keys and iterating through them
  var objectKeys = Object.keys(allUserData);
  console.log(objectKeys);
  console.log(objectKeys.length);
  var len;
  if (objectKeys != null && (len = objectKeys.length) != 0) {
    console.log(len);
    var outString = len + " User Data Entries found in database\n";
    for (let index = 0; index < len; index++) {
      var uname = objectKeys[index];
      var ud = allUserData[uname];
      outString += getUserDataLogText(ud);
    }
    console.log(outString);
  }
}
/*
 * Makes sure allUserData is loaded and then returns the userData
 * corresponding to the userId
 */
function getUserData(userId) {
  var retval = null;
  if (allUserData == null) {
    loadAllUserData();
  }
  if (allUserData != null && userId != null) {
    var objectKeys = Object.keys(allUserData);
    for (let index = 0; index < objectKeys.length; index++) {
      var val = objectKeys[index];
      if (val.localeCompare(userId) === 0) {
        retval = allUserData[val];
        break;
      }
    }
  }
  return retval;
}

/*
 * Given an array of keys or objects, this function will return a random selection of
 * the given array of given size. If the request size is less than or equal to the
 * size of the given array, then a copy of the array is returned.
 *
 *  originalArray : the orginal array to be shuffled
 *  returnSize : how many elements in the returned array
 *  @returns : an array containing the shuffled elements
 */
function shuffleArray(originalArray, returnSize, maxTries) {
  var retval = [];
  if (originalArray == null || !Array.isArray(originalArray) || returnSize <= 0)
    return null;
  if (originalArray.length <= returnSize) {
    return originalArray.slice(0, originalArray.length);
  }
  // set up the maximum number of iterations after which values will be added
  // to the return array even if they already exist
  if (maxTries == null) maxTries = returnSize * 10;
  var iteration = 0;
  while (retval.length < returnSize) {
    var pointer = Math.floor(Math.random() * originalArray.length);
    var val = originalArray[pointer];
    console.log("Pointer ==> " + pointer + " Value ==> " + val);
    // if the value from the original array is not found in the return
    // array, add it.
    if (retval.indexOf(val) === -1 || iteration >= maxTries) {
      retval.push(val);
    }
    iteration++;
  }
  return retval;
}

/**
 * Sort object properties (only own properties will be sorted).
 * @param {object} obj object to sort properties
 * @param {bool} isNumericSort true - sort object properties as numeric value, false - sort as string value.
 * @returns {Array} array of items in [[key,value],[key,value],...] format.
 */
function sortObjectPropertiesByValue(obj, isNumericSort)
{
	isNumericSort=isNumericSort || false; // by default text sort
	var sortable=[];
	for(var key in obj)
		if(obj.hasOwnProperty(key))
			sortable.push([key, obj[key]]);
	if(isNumericSort)
		sortable.sort(function(a, b)
		{
			return a[1]-b[1];
		});
	else
		sortable.sort(function(a, b)
		{
			var x=a[1].toLowerCase(),
				y=b[1].toLowerCase();
			return x<y ? -1 : x>y ? 1 : 0;
		});
	return sortable; // array in format [ [ key1, val1 ], [ key2, val2 ], ... ]
}