// popup
// coded by azrafe7

var bgPage = chrome.extension.getBackgroundPage();	// ref to background page object

var DEBUG = false;

// execute main() when DOM is ready
$(document).ready(main);

function showResponse(msg) {
	$("pre").text(msg);
}

function sendRequest(path, errorCallback, successCallback) {
	xhr = new XMLHttpRequest();
	xhr.open("GET", "http://localhost:8080/requests/" + path);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			showResponse(xhr.status + "\n" + xhr.responseText);
			errorCallback = errorCallback || onError;
			successCallback = successCallback || onSuccess;
			if (xhr.status != 200) {
				errorCallback(xhr);
			} else {
				successCallback(xhr);
			}
		}
	}
	xhr.send();
}

function openThis() {
	//sendRequest("status.json?command=in_play&input=" + encodeURIComponent(bgPage.currentTab.url));
}

function onSuccess(xhr) {
	var title = bgPage.currentTab.title;
	title = "<b>" + title.substr(0, title.length-9) + "</b>";
	
	log(xhr.status, xhr.statusText, xhr);
	$("#msg").hide();
	
	$("#added").html(title + " successfully enqueued in VLC.");
	$("#added").show();
}

function onError(xhr) {
	$("#msg").show();
	$("#added").hide();
	log(xhr.status, xhr.statusText, xhr);
}

function interfaceFound(xhr) {
	log("VLC http interface found!");
}

// main function (executed when the DOM is ready)
function main() {
	openThis();

	$("a").bind("click", function() { chrome.tabs.create({url:$(this).attr("href")}); });
	
	// hidden
	$("#debug-wrapper").hide();
	
	$("#title").text(bgPage.manifest.name + " v" + bgPage.manifest.version);
	$("#content").append($("<pre>").text(JSON.stringify(bgPage.manifest, true, "    ")));
	
	$("#sendBtn").bind("click", function() { sendRequest($("#path").val()); });
	$("#openBtn").bind("click", function() { openThis(); });

	$("#path").bind("keyup", function(event) {
		if (event.keyCode == 13) {
			log("send");
			$("#sendBtn").click();
		}
	});

	$("body").bind("keyup", function(event) {
		if (event.keyCode == 220) { // doom console
			log("debug");
			$("#debug-wrapper").show();
		}
	});
}

function log(...args) {
	if (DEBUG) console.log(args);
}