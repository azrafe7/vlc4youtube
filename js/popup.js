// popup
// coded by azrafe7

var bgPage = chrome.extension.getBackgroundPage();	// ref to background page object
var currTab;

var USE_CURRENT_URL = "current-url";
var USE_YTDL_JS = "ytdl-js";
var USE_YTDL_SERVER = "ytdl-server";

var DEBUG = false;
var VLC_INTERFACE = "http://localhost:8080/requests/";
var MODE = USE_YTDL_JS;

var timer;
var info;
var format;
var title;

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

function setTitle(format, title) {
	this.format = format;
	this.title = title;
	
	video = "Format: " + "<b>" + format + "</b><br>" + 
			"Title: " + "<b>" + title + "</b><br>";
	$("#msg").html(video);	
}

function play(url, options) {
	var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
	sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + urlParam);
}

function addFormatFieldTo(item) {
	item.format = item.itag + " - " + 
				  item.type.match(/.*?;/) + " " +
				  (item.resolution || "audio only") + " " +
				  (item.audioEncoding ? "" : "video only") + 
				  " (" + (item.quality || item.quality_label || "") + ")";
	return item;
}

function enqueueStreamForCurrPage(probeOnly) {
	sendRequest(VLC_INTERFACE + "status.json", onVlcError, function(xhr) { // probe VLC interface
		interfaceFound();
		$("#msg").html("Retrieving best quality stream url...");
		log(MODE);
		switch (MODE) {
			case USE_YTDL_JS:
				ytdl.getInfo(currTab.url, function(error, info) { // get video info
					if (error) {
						onInfoError({statusText:error});
					}
					
					for (i in info.formats) addFormatFieldTo(info.formats[i]);
					
					onInfoSuccess(null, info, probeOnly);
				});
				break;
				
			case USE_YTDL_SERVER:
				sendRequest("http://azrafe7-vlc4youtube.herokuapp.com/api/info?url=" + currTab.url, onInfoError, onInfoSuccess); // get video info
				break;
				
			case USE_CURRENT_URL:
			default:
				onInfoSuccess(null, { formats:[] }, probeOnly);
		}
	});
}

function onInfoSuccess(xhr, data, probeOnly) {
	if (data) info = data;
	else info = JSON.parse(xhr.response).info;
	
	// insert info for current plain url
	info.formats.push({format:"(current page url)", url:currTab.url});
	
	if (MODE == USE_YTDL_SERVER) {
		info.formats = info.formats.filter(function (i) { return i.url != info.url; });
		info.formats.unshift({url: info.url, format:info.format});
	}
	
	var best = info.formats[0];
	log("Info (all streams):", info);
	log("Best stream:", best.format, best.url);
	
	format = best.format;
	
	setTitle(format, title);
	
	// populate stream links (debug)
	var streams = $("#streams").empty();
	for (o in info.formats) {
		var i = info.formats[o];
		var div = $("<div>").append(
			$("<a>").attr({"href":i.url, "title":i.url.substring(0, 68) + "..."}).text(i.format)
		);
		div.bind("click", function() {
			var idx = $(this).index();
			format = info.formats[idx].format;
			play(info.formats[idx].url, { mustEncode: true });
		});
		streams.append(div);
	}
	
	// play
	if (!probeOnly) play(best.url, { mustEncode: true });
}

function onInfoError(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	$("#msg").html("No stream found. Sending current url...");
	setTimeout(function() {
		play(currTab.url, { mustEncode: true }); // try sending curr url as is
	}, 2000);
}

function onVlcSuccess(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	
	setTitle(format, title);
	var html = $("#msg").html();
	$("#msg").html(html + "<br> enqueued in VLC.");
	
	$("#no-interface").hide();
	$("#msg").show();
	if (!DEBUG) timer = setTimeout(function() { window.close(); }, 4000); // close popup
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
	
	
	// bind events
	$("#url").bind("keyup", function(event) {
		if (event.keyCode == 13) {
			log("send");
			$("#sendBtn").click();
		}
	});

	$("body").bind("keyup", function(event) {
		if (event.keyCode == 220 && document.activeElement != $("#url").get(0)) { // doom console '\'
			toggleDoomConsole();
		}
	});
	
	
	// query active tab
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		currTab = tabs[0];
		
		title = currTab.title.substr(0, currTab.title.length - 9);
		
		$("#sendBtn").bind("click", function() { sendRequest($("#url").val()); });
		$("#loadBtn").bind("click", function() { 
			$("#streams").empty();
			enqueueStreamForCurrPage(true);
		});
		$("#itagBtn").bind("click", function() { 
			if (info) {
				var itag = $("#url").val();
				$("#msg").html("Stream for itag " + itag + " not found.");
				for (o in info.formats) {
					var i = info.formats[o];
					if (i.format_id == itag) {
						$("#msg").html("Sending url for itag " + itag + "(" + i.format + ")...");
						setTimeout(function() {
							play(i.url, { mustEncode: true });
						}, 2000);
					}
				}
			}
		});

		// using a little timeout here, so the user can press '\' to choose the stream
		setTimeout(function() {	enqueueStreamForCurrPage(DEBUG); }, 500);
	});
}

function toggleDoomConsole() {
	DEBUG = true;
	clearTimeout(timer);
	log("debug");
	$("#debug-wrapper").toggle();
}				

function log(...args) {
	if (DEBUG) console.log.apply(console, args);
}