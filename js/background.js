// background.js
// coded by azrafe7

// manifest object
var manifest = {};

// store current tab info
var currentTab;

var VLC_HOST = "http://localhost";
var VLC_PORT = "8080";
var VLC_INTERFACE = VLC_HOST + ":" + VLC_PORT + "/requests/";
//var EXTENSION_ID = "nofmfopnoamalaifhaklkpnonoaacfmk"; // debug extension id
var EXTENSION_ID = "jldiailifbdkepgpcojllmkbakleicab"; // web store extension id


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
    console.log("TAB:", tab);
    currentTab = tab;
    chrome.pageAction.show(tabId);
  }
}

// listen for responses
function responseListener(details) {
  if (!details.url.startsWith(VLC_INTERFACE)) return details;
  
  var rules = [
    {
      "name": "Access-Control-Allow-Origin",
      "value": "chrome-extension://" + EXTENSION_ID
    },
    {
      "name": "Access-Control-Allow-Credentials",
      "value": "true"
    }
  ];
  for (rule of rules) details.responseHeaders.push(rule);
  console.log("RESPONSE:", details);
  return {responseHeaders: details.responseHeaders};
}

// listen for requests
function requestListener(details) {
  if (!details.url.startsWith(VLC_INTERFACE)) return details;
  
  console.log("REQUEST:", details);
  return details;
}

// initialize
function init() {
  readManifestFile();

  // listen for any changes to the URL of any tab
  chrome.tabs.onUpdated.addListener(checkForValidUrl);
  
  // authorize requests/responses from extension to http://localhost:8080/requests
  chrome.webRequest.onHeadersReceived.addListener(responseListener,
     {urls: [VLC_INTERFACE + "*"]},
     ["blocking", "responseHeaders"]);
  chrome.webRequest.onBeforeRequest.addListener(requestListener,
     {urls: [VLC_INTERFACE + "*"]},
     []);
}
