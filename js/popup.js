// popup
// coded by azrafe7

var bgPage = chrome.extension.getBackgroundPage();	// ref to background page object
var currTab;
var url;

var DEBUG = false;
var VLC_INTERFACE = "http://localhost:8080/requests/";
var EXTENSION_URL = "https://chrome.google.com/webstore/detail/vlc-4-youtube-beta/jldiailifbdkepgpcojllmkbakleicab?hl=en";

var timer;
var info;
var format;
var title;

// execute main() when DOM is ready
$(document).ready(main);

function sendRequest(url, errorCallback, successCallback) {
	log("sending", url);
	$("#vlcUrl").val(url);
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
	this.format = format || this.format;
	this.title = title || this.title;
	
	video = "Format: " + "<b>" + format + "</b><br>" + 
			"Title: " + "<b>" + title + "</b><br>";
	$("#stream-info").html(video);	
}

function setMessage(msg, hideTitle) {
	var $msg = $("#msg");
	$("#stream-info").toggle(!hideTitle);
	$msg.html(msg);
	return $msg;
}

function play(url, options) {
	var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
	sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + urlParam);
}

function addFormatFieldTo(item) {
	item.format = item.itag + " - " + 
				  item.type.match(/.*?;/) + " " +
				  (item.resolution || "[audio only]") + " " +
				  (item.audioEncoding ? "" : "[video only]") + 
				  " (" + (item.quality || item.quality_label || "") + ")";
	return item;
}

function findStreamsFor(url, probeOnly) {
	setMessage("Probing VLC http interface...", true).show();
	
	sendRequest(VLC_INTERFACE + "status.json", onVlcError, function(xhr) { // probe VLC interface
		interfaceFound();
		setMessage("Retrieving best quality stream url...", true);
		ytdl.getInfo(url, function(error, info) { // get video info
			if (error) {
				onInfoError({statusText:error});
			}
			
			for (i in info.formats) addFormatFieldTo(info.formats[i]);
			
			onInfoSuccess(null, info, probeOnly);
		});
	});
}

function onInfoSuccess(xhr, data, probeOnly) {
	if (data) info = data;
	else info = JSON.parse(xhr.response).info;
	
	// insert info for current plain url
	info.formats.push({format:"current page url (probably not working)", url:url});
	
	var best = info.formats[0];
	log("Info (all streams):", info);
	log("Best stream:", best.format, best.url);
	
	format = best.format;
	
	setTitle(format, info.title);
	setMessage("", false);
	
	// populate stream links (debug)
	var streams = $("#streams").empty();
	for (o in info.formats) {
		var i = info.formats[o];
		var a = $("<a>").attr({"href":i.url, "data-format":i.format}).text(i.format);
		var div = $("<div>").append(a);
		a.bind("click", function() {
			setTitle($(this).attr("data-format"));
			play($(this).attr("href"), { mustEncode: true });
		});
		streams.append(div);
	}
	
	// play
	if (!probeOnly) play(best.url, { mustEncode: true });
	
	//$("#vlcUrl").val(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(url));
}

function onInfoError(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	setMessage("No stream found. Sending current url...", true);
	setTimeout(function() {
		play(url, { mustEncode: true }); // try sending curr url as is
	}, 2000);
}

function onVlcSuccess(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	
	setTitle(format, title);
	setMessage("<br>Command sent to VLC.", false).hide().fadeIn(400, "swing");
	
	$("#no-interface").hide();
	if (!DEBUG) timer = setTimeout(function() { window.close(); }, 4000); // close popup
}

function onVlcError(xhr) {
	$("#no-interface").show();
	setMessage("", true);
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
	$("#stream-info").hide();
	
	$("#title").html("<b>" + bgPage.manifest.name + " v" + bgPage.manifest.version + "</b>");
	$("#title").bind("click", function() { chrome.tabs.create({url:EXTENSION_URL}) }); // goto extension page on the webstore

	
	// bind events
	$("#vlcUrl").bind("keyup", function(event) {
		if (event.keyCode == 13) {
			log("send");
			$("#sendBtn").click();
		}
	});

	$("body").bind("keyup", function(event) {
		if (event.keyCode == 220 && document.activeElement != $("#vlcUrl").get(0)) { // doom console '\'
			toggleDoomConsole();
		}
	});
	
	// buttons
	$("#sendBtn").bind("click", function() { sendRequest($("#vlcUrl").val()); });
	$("#loadBtn").bind("click", function() { 
		$("#streams").empty();
		url = $("#videoUrl").val();
		findStreamsFor(url, true);
	});
	$("#pauseBtn").bind("click", function() { 
		sendRequest(VLC_INTERFACE + "status.json?command=pl_pause");
	});
	$("#prevBtn").bind("click", function() { 
		sendRequest(VLC_INTERFACE + "status.json?command=pl_previous");
	});
	$("#nextBtn").bind("click", function() { 
		sendRequest(VLC_INTERFACE + "status.json?command=pl_next");
	});
	$("#clearBtn").bind("click", function() { 
		sendRequest(VLC_INTERFACE + "status.json?command=pl_empty");
	});

	
	// query active tab
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		currTab = tabs[0];
		
		title = currTab.title.substr(0, currTab.title.length - 9);
		url = currTab.url;
		
		$("#videoUrl").val(url);
		
		// using a little timeout here, so the user can press '\' to choose the stream
		setTimeout(function() {	findStreamsFor(url, DEBUG); }, 500);
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