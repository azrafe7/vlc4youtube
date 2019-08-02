// background.js
// coded by azrafe7

// manifest object
var manifest = {};

// detect browser by testing extension API
// (https://stackoverflow.com/questions/45985198/the-best-practice-to-detect-whether-a-browser-extension-is-running-on-chrome-or)
function getBrowser() {
  if (typeof chrome !== "undefined") {
    if (typeof browser !== "undefined") {
      return "Firefox";
    } else {
      return "Chrome";
    }
  } else {
    return "Edge";
  }
}

var VLC_HOST = "http://localhost";
var VLC_PORT = "8080";
var VLC_INTERFACE = VLC_HOST + ":" + VLC_PORT + "/requests/";
var VLC_USER = "";
var VLC_PASS = "";

// filled in init()
var EXTENSION_SCHEME = null;
var EXTENSION_ID = null;
var EXTENSION_URL = null;

var BROWSER = getBrowser();
var IS_FIREFOX = BROWSER == "Firefox";
var IS_CHROME = BROWSER == "Chrome";
var IS_EDGE = BROWSER == "Edge";

var CHROME_WEBSTORE_URL = "https://chrome.google.com/webstore/detail/vlc-4-youtube-beta/";
var FIREFOX_WEBSTORE_URL = "https://addons.mozilla.org/en-US/firefox/addon/vlc-4-youtube-beta-4-firefox/";


init();

// read manifest file and put parsed object in manifest global variable
function readManifestFile() {
  xhr = new XMLHttpRequest();
  xhr.open("GET", chrome.extension.getURL("manifest.json"));
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      manifest = JSON.parse(xhr.responseText);
    }
  }
  xhr.send();
}

function isValidUrl(url) {
  return (url.indexOf("watch?") >= 0 || url.indexOf("/v/") >= 0);
}

// show extension icon if on a video page
function checkForValidUrl(tabId, changeInfo, tab) {
  if (tab.url && isValidUrl(tab.url)) {
    console.log("TAB:", tab.url, "  | TITLE:", '"' + tab.title + '"', tab);
    chrome.pageAction.setIcon({tabId:tabId, path:"icons/icon-19.png"});
    chrome.pageAction.show(tabId);
  } else {
    chrome.pageAction.setIcon({tabId:tabId, path:"icons/icon-19-grey.png"});
  }
}

// listen for responses
function responseListener(details) {
  if (IS_FIREFOX && details.url == VLC_INTERFACE + "status.json" && details.statusCode == 401) { // redirect to vlc login
    chrome.tabs.create({url: VLC_HOST + ":" + VLC_PORT});
    return details;
  }
  if (!details.url.startsWith(VLC_INTERFACE)) return details;

  var rules = [
    {
      "name": "Access-Control-Allow-Origin",
      "value": EXTENSION_SCHEME + EXTENSION_ID + "/*"
    },
    {
      "name": "Access-Control-Allow-Credentials",
      "value": "true"
    }
  ];
  for (let rule of rules) details.responseHeaders.push(rule);
  console.log("RESPONSE:", details.url, details);
  return {responseHeaders: details.responseHeaders};
}

// listen for requests
function requestListener(details) {
  if (!details.url.startsWith(VLC_INTERFACE)) return details;

  console.log("REQUEST:", details.url, details);
  return details;
}

// initialize
function init() {
  readManifestFile();

  EXTENSION_SCHEME = chrome.extension.getURL("");
  EXTENSION_SCHEME = EXTENSION_SCHEME.substr(0, EXTENSION_SCHEME.indexOf("://") + 3);
  EXTENSION_ID = chrome.i18n.getMessage("@@extension_id");
  EXTENSION_URL = IS_CHROME ? CHROME_WEBSTORE_URL + EXTENSION_ID : FIREFOX_WEBSTORE_URL;

  console.info("EXTENSION:", EXTENSION_SCHEME, EXTENSION_ID);
  console.info("BROWSER:", BROWSER);

  // listen for any changes to the URL of any tab
  chrome.tabs.onUpdated.addListener(checkForValidUrl);

  // authorize requests/responses from extension to http://localhost:8080/requests
  chrome.webRequest.onHeadersReceived.addListener(responseListener,
    {urls: [VLC_HOST + "/*"]},
    ["blocking", "responseHeaders"]
  );
  chrome.webRequest.onBeforeRequest.addListener(requestListener,
    {urls: [VLC_HOST + "/*"]},
    []
  );
}
