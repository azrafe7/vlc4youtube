// popup
// coded by azrafe7

var bgPage = chrome.extension.getBackgroundPage();	// ref to background page object
var currTab;

var DEBUG = false;
var VLC_INTERFACE = "http://localhost:8080/requests/";

var timer;
var info;
var format;

// execute main() when DOM is ready
$(document).ready(main);

function sendRequest(url, errorCallback, successCallback) {
	log("sending", url);
	$("#url").val(url);
	xhr = new XMLHttpRequest();
	xhr.open("GET", url);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			errorCallback = errorCallback || onVlcError;
			successCallback = successCallback || onVlcSuccess;
			if (xhr.status != 200) {
				errorCallback(xhr);
			} else {
				successCallback(xhr);
			}
		}
	}
	xhr.send();
}

function enqueueStreamForCurrPage() {
	sendRequest(VLC_INTERFACE + "status.json", onVlcError, function(xhr) { // probe VLC interface
		interfaceFound();
		$("#msg").html("Retrieving best quality stream url...");
		sendRequest("http://azrafe7-vlc4youtube.herokuapp.com/api/info?url=" + currTab.url, onInfoError, onInfoSuccess); // get video info
	});
}

function onInfoSuccess(xhr) {
	info = JSON.parse(xhr.response).info;
	log("Info (all):", info);
	log("Best stream:", info.format, info.url);
	format = info.format;
	sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(info.url), onVlcError, onVlcSuccess);

	// insert info for current plain url
	info.formats.push({format:"unknown - (current page)", url:currTab.url});
	
	// populate stream links (debug)
	var streams = $("#streams").empty();
	for (o in info.formats) {
		var i = info.formats[o];
		var div = $("<div>").append(
			$("<a>").attr("href", i.url).text(i.format)
		);
		div.bind("click", function() {
			var idx = $(this).index();
			format = info.formats[idx].format;
			sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(i.url));
		});
		streams.append(div);
	}
}

function onInfoError(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	$("#msg").html("No stream found. Sending current url...");
	setTimeout(function() {
		sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(currTab.url)); // try sending curr url as is
	}, 2000);
}

function onVlcSuccess(xhr) {
	var title = currTab.title;
	title = "Format: " + "<b>" + format + "</b><br>" + 
			"Title: " + "<b>" + title.substr(0, title.length-9) + "</b><br>";
			
	
	log(xhr.status, xhr.statusText, xhr);
	
	$("#msg").html(title + "<br> enqueued in VLC.");
	$("#msg").show();
	if (!DEBUG) timer = setTimeout(function() { window.close(); }, 4000);
}

function onVlcError(xhr) {
	$("#no-interface").show();
	$("#msg").hide();
	log(xhr.status, xhr.statusText, xhr);
}

function interfaceFound(xhr) {
	log("VLC http interface found!");
	$("#no-interface").hide();
}

// main function (executed when the DOM is ready)
function main() {
	$("a").bind("click", function() { chrome.tabs.create({url:$(this).attr("href")}); }); // enable interface how-to link
	
	// hidden
	$("#debug-wrapper").hide();
	$("#no-interface").hide();
	
	$("#title").html("<b>" + bgPage.manifest.name + " v" + bgPage.manifest.version + "</b>");

	$("#msg").html("Probing VLC http interface...").show();
	
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		currTab = tabs[0];
		
		$("#sendBtn").bind("click", function() { sendRequest(VLC_INTERFACE + $("#url").val()); });
		$("#openBtn").bind("click", function() { enqueueStreamForCurrPage(); });
		$("#itagBtn").bind("click", function() { 
			if (info) {
				var itag = $("#url").val();
				$("#msg").html("Stream for itag " + itag + " not found.");
				for (o in info.formats) {
					var i = info.formats[o];
					if (i.format_id == itag) {
						$("#msg").html("Sending url for itag " + itag + "(" + i.format + ")...");
						setTimeout(function() {
							sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(i.url));
						}, 2000);
					}
				}
			}
		});

		$("#url").bind("keyup", function(event) {
			if (event.keyCode == 13) {
				log("send");
				$("#sendBtn").click();
			}
		});

		$("body").bind("keyup", function(event) {
			if (event.keyCode == 220 && document.activeElement != $("#url").get(0)) { // doom console
				DEBUG = true;
				clearTimeout(timer);
				log("debug");
				$("#debug-wrapper").toggle();
			}
		});
		
		enqueueStreamForCurrPage();
	});
}

function log(...args) {
	if (DEBUG) console.log.apply(console, args);
}