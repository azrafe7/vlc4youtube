// popup
// coded by azrafe7

'use strict';

var self = this;
var bgPage = chrome.extension.getBackgroundPage();	// ref to background page object
var currTab;
var url;
var xhr;

var DEBUG = false;
var VLC_INTERFACE = "http://localhost:8080/requests/";
var EXTENSION_URL = "https://chrome.google.com/webstore/detail/vlc-4-youtube-beta/jldiailifbdkepgpcojllmkbakleicab?hl=en";

var timer;
var info;
var format;
var title;
var lastCommand;

// execute main() when DOM is ready
$(document).ready(main);

function sendRequest(url, errorCallback, successCallback) {
	log("sending", url);
	$("#vlcUrl").val(url);
	xhr = new XMLHttpRequest();
	xhr.open("GET", url);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
      var regex = /command=([^&;\s]+)/gi;
      var matches = regex.exec(url);
      lastCommand = matches && matches[1];
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
	self.format = format || self.format;
	self.title = title || self.title;
	
	self.video = "Format: " + "<b>" + self.format + "</b><br>" + 
			"Title: " + "<b>" + self.title + "</b><br>";
	$("#stream-info").html(self.video);	
}

function setMessage(msg, hideTitle) {
	var $msg = $("#msg");
	$("#stream-info").toggle(!hideTitle);
	$msg.html(msg);
	return $msg;
}

function play(url, options, title) {
  title = title || ellipsizeMiddle(url, 80);
	var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
	sendRequest(VLC_INTERFACE + "status.json?command=in_play&input=" + urlParam + "&name=" + encodeURIComponent(title));
}

function enqueue(url, options, title) {
  title = title || ellipsizeMiddle(url, 80);
	var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
	sendRequest(VLC_INTERFACE + "status.json?command=in_enqueue&input=" + urlParam + "&name=" + encodeURIComponent(title));
}

function addFormatFieldTo(item) {
	item.format = item.itag + " - " + 
				  item.type.match(/.*?;/) + " " +
				  (item.resolution || "[audio only]") + " " +
				  (item.audioEncoding ? "" : "[video only]") + 
				  " (" + (item.quality || item.quality_label || (item.audioBitrate + "br")) + ")";
	return item;
}

function findStreamsFor(url, probeOnly) {
	setMessage("Probing VLC http interface...", true).show();
	
	sendRequest(VLC_INTERFACE + "status.json", onVlcError, function(xhr) { // probe VLC interface
		interfaceFound();
		setMessage("Retrieving preferred quality stream url...", true);
		ytdl.getInfo(url, function(error, info) { // get video info
			if (error) {
				onInfoError({statusText:error});
				return;
			}
			
			populateStreams(null, info);
			
			var quality = "highest";
			var filter = "video";
			
			var format = ytdl.utils.chooseFormat(info.formats, {quality: quality, filter: filter});
			// if found, make it the first in the array
			if (format && !(format instanceof Error)) {
				info.formats.splice(info.formats.indexOf(format), 1);
				info.formats.unshift(format);
			} else {
				onInfoError({statusText:format.message});
				return;
			}
			
			onInfoSuccess(null, info, probeOnly);
		});
	});
}

function populateStreams(xhr, data) {
	if (data) info = data;
	else info = JSON.parse(xhr.response).info;
	
	for (i in info.formats) addFormatFieldTo(info.formats[i]);
	
	// insert info for current page (plain url)
	info.formats.push({format:"current page url", url:url});
	
	log("Info (all streams):", info);
	
	// populate stream links (debug)
	var streams = $("#streams").empty();
	for (var o in info.formats) {
		var i = info.formats[o];
		var a = $("<a>").attr({
			"href":i.url, 
			"data-format":i.format,
			"title":ellipsizeMiddle(i.url, 80)
		}).text(i.format);
		
		var div = $("<div>").append(a);
		a.bind("click", function() {
			setTitle($(this).attr("data-format"));
			play($(this).attr("href"), { mustEncode: true }, info.title);
		});
		streams.append(div);
	}
}

function onInfoSuccess(xhr, data, probeOnly) {
	
	var best = info.formats[0];
	log("Preferred stream:", best.format, best.url);
	
	format = best.format;
	
	setTitle(format, info.title);
	setMessage("", false);
	
	// play
	if (!probeOnly) {
		play(best.url, { mustEncode: true }, info.title);
	}
	
	//$("#vlcUrl").val(VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(url));
}

function onInfoError(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	setMessage("No matching stream found (" + xhr.statusText + ").", true);
	/*setTimeout(function() {
		setTitle("unknown (current page url)");
		play(url, { mustEncode: true }, url); // try sending curr url as is
	}, 2000);*/
}

function onVlcSuccess(xhr) {
	log(xhr.status, xhr.statusText, xhr);
	
	setTitle(format, title);
  var lastCommandStr = "";
  if (lastCommand) lastCommandStr = " (<b>" + lastCommand + "</b>)";
	setMessage("<br>Command sent to VLC" + lastCommandStr + ".", false).hide().fadeIn(400, "swing");
	
	$("#no-interface").hide();
	if (!DEBUG) self.timer = setTimeout(function() { window.close(); }, 4000); // close popup
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
	$("#no-interface a").bind("click", function() {  // enable interface how-to link
    chrome.tabs.create({url:$(this).attr("href")}); 
  });
	
	// hidden
	$("#debug-wrapper").hide();
	$("#no-interface").hide();
	$("#stream-info").hide();
	
	$("#title").html("<b>" + bgPage.manifest.name + " v" + bgPage.manifest.version + "</b>");
	$("#webstore").bind("click", function() { chrome.tabs.create({url:EXTENSION_URL}) }); // goto extension page on the webstore
	$("#doom .key").bind("click", function() { toggleDoomConsole(); }); // toggle doom console when clicking '\'
	
	
	// bind events
	$("#vlcUrl").bind("keyup", function(event) {
		if (event.keyCode == 13) {
			log("send");
			$("#sendBtn").click();
		}
	});

	$("#videoUrl").bind("keyup", function(event) {
		if (event.keyCode == 13) {
			log("find");
			log("find");
			$("#findBtn").click();
		}
	});

	$("body").bind("keyup", function(event) {
    var vlcUrlInput = $("#vlcUrl").get(0);
    var videoUrlInput = $("#videoUrl").get(0);
		if (document.activeElement != vlcUrlInput && document.activeElement != videoUrlInput) { 
      if (event.keyCode == 220) { // doom console '\'
        toggleDoomConsole();
      } else if (event.keyCode == 81) { // 'q' to enqueue
        log("en'q'");
        $("#enqueueBtn").click();
      }
		}
	});
	
	// buttons
	$("#sendBtn").bind("click", function() { sendRequest($("#vlcUrl").val()); });
	$("#findBtn").bind("click", function() { 
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
	$("#enqueueBtn").bind("click", function() { 
    if (info && info.formats) {
      enqueue(info.formats[0].url, { mustEncode: true }, info.title);
    }
	});

	
	// query active tab
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		self.currTab = tabs[0];
		
		self.title = self.currTab.title.substr(0, self.currTab.title.length - 9);
		self.url = self.currTab.url;
		
		$("#videoUrl").val(self.url);
		
		// using a little timeout here, so the user can press '\' to choose the stream
		setMessage("Probing VLC http interface...", true).show();
		setTimeout(function() {	findStreamsFor(url, DEBUG); }, 700);
	});
}

function toggleDoomConsole() {
	DEBUG = true;
	clearTimeout(self.timer);
	log("debug");
	$("#debug-wrapper").toggle();
}				

function ellipsizeMiddle(str, maxLength) {
	var ellipsis = "...";
	var strLen = str.length;
	if (strLen <= maxLength)
		return str;

	var ellipsisLen = ellipsis.length;
	if (maxLength < ellipsisLen) return ellipsis.substring(0, maxLength);

	var maxStrLen = maxLength - ellipsisLen;
	var leftLen = Math.round(maxStrLen / 2);
	var rightLen = maxStrLen - leftLen;

	return str.substring(0, leftLen) + ellipsis + str.substr(-rightLen);
}

function log(...args) {
	if (DEBUG) console.log.apply(console, args);
}