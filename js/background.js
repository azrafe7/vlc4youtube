// background.js
// coded by azrafe7

console.log("Background started!");

// manifest object
var manifest = {};

// store current tab info
var currentTab;

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

// show extension icon if on a video page
function checkForValidUrl(tabId, changeInfo, tab) {
	if (tab.url.indexOf("watch?") >= 0 || tab.url.indexOf("/v/") >= 0) {
		console.log(tab);
		currentTab = tab;
		chrome.pageAction.show(tabId);
	}
}

// initialize
function init() {
	readManifestFile();

	// listen for any changes to the URL of any tab
	chrome.tabs.onUpdated.addListener(checkForValidUrl);
}
