// popup.js
// coded by azrafe7

'use strict';

var self = this;
var bgPage = chrome.extension.getBackgroundPage();  // ref to background page object
var currTab;
var url;
var xhr;

var DEBUG = false;
var PAUSE_YT_WHEN_SENDING_PLAY = true;

var timerIds = [];
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
        if (lastCommand == 'in_play' && PAUSE_YT_WHEN_SENDING_PLAY) {
          console.log("pause yt");
          chrome.tabs.executeScript(currTab.id, { code: pauseVideo.join('') });
          appendToMessage("<br><sub>(YouTube video paused)</sub>");
        }
      }
    }
  }
  xhr.open("GET", url, true, bgPage.VLC_USER, bgPage.VLC_PASS);
  xhr.withCredentials = true;
  xhr.send(null);
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

function appendToMessage(msg) {
  var $msg = $("#msg");
  $msg.html($msg.html() + msg);
  return $msg;
}

function play(url, options, title) {
  title = title || ellipsizeMiddle(url, 80);
  var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
  sendRequest(bgPage.VLC_INTERFACE + "status.json?command=in_play&input=" + urlParam + "&name=" + encodeURIComponent(title));
}

function enqueue(url, options, title) {
  title = title || ellipsizeMiddle(url, 80);
  var urlParam = (options && options.mustEncode) ? encodeURIComponent(url) : url;
  sendRequest(bgPage.VLC_INTERFACE + "status.json?command=in_enqueue&input=" + urlParam + "&name=" + encodeURIComponent(title));
}

function addFormatFieldTo(item) {
  item.format = item.itag + " - " +
          //(item.mimeType ? item.mimeType.match(/.*?;/) + " " : "") +
          item.container + " " +
          ((item.hasAudio && !item.hasVideo) ? "[audio only] " : "") +
          ((!item.hasAudio && item.hasVideo) ? "[video only] " : "");
  let itemQuality = (item.quality || " ") + (item.quality_label || " ") + (item.audioBitrate ? item.audioBitrate + "br" : " ");
  itemQuality = itemQuality.trim();
  item.format += " (" + itemQuality + ")";
  item.format = item.format.replace(/\s+/g, ' ');
  return item;
}

function findStreamsFor(url, probeOnly) {
  $("#no-interface").hide();
  setMessage("Probing VLC http interface...", true).show();

  // probe VLC interface
  sendRequest(bgPage.VLC_INTERFACE + "status.json",
    function onError(xhr) {
      onVlcError(xhr);
      appendToMessage("<br><sub>(Retrieving streams anyway)</sub>");
      getVideoInfo(url, false);
    },
    function onSuccess(xhr) {
      onVlcSuccess(xhr);
      interfaceFound();
      setMessage("Retrieving streams...", true);
      getVideoInfo(url, probeOnly);
    }
  );
}

function getVideoInfo(url, probeOnly) {
  ytdl.getInfo(url).then(function(info) { // get video info
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
  })
  .catch(function(error) {
      onInfoError({statusText:error});
  });
}

function populateStreams(xhr, data) {
  if (data) info = data;
  else info = JSON.parse(xhr.response).info;

  for (let i in info.formats) addFormatFieldTo(info.formats[i]);

  // insert info for current page (plain url)
  info.formats.push({format:"current page url", url:url});

  log("Info (all streams):", info);

  // populate stream links (debug)
  var streams = $("#streams").empty();
  for (let o in info.formats) {
    var i = info.formats[o];
    var a = $("<a>").attr({
      "href": i.url,
      "data-format": i.format,
      "title": `${ellipsizeMiddle(i.url, 80)}\nvideoCodec: ${i.videoCodec || 'none'}  |  audioCodec: ${i.audioCodec || 'none'}`
    }).text(i.format);

    var div = $("<div>").append(a);
    a.bind("click", function() {
      setTitle($(this).attr("data-format"));
      play($(this).attr("href"), { mustEncode: true }, info.videoDetails.title);
    });
    streams.append(div);
  }
}

function onInfoSuccess(xhr, data, probeOnly) {

  var best = info.formats[0];
  log("Preferred stream:", best.format, best.url);

  format = best.format;

  if (probeOnly) {
    setTitle(format, info.videoDetails.title);
    setMessage("", false);
  }

  // play
  if (!probeOnly) {
    play(best.url, { mustEncode: true }, info.videoDetails.title);
  }

  //$("#vlcUrl").val(bgPage.VLC_INTERFACE + "status.json?command=in_play&input=" + encodeURIComponent(url));
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
  if (!DEBUG) self.timerIds.push(setTimeout(function() { window.close(); }, 4000)); // close popup
}

function onVlcError(xhr) {
  $("#no-interface").show();
  var errorText = xhr.statusText;
  var intf = bgPage.VLC_HOST + ":" + bgPage.VLC_PORT;
  if (xhr.status == 401) {
    errorText = 'Unauthorized, please <a target="_blank" href="' + intf + '" title="' + intf + '">login here</a> first';
  }
  setMessage("<br>Received: " + errorText + " (<b>" + xhr.status + "</b>).", true);
  log(xhr.status, errorText, xhr);
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
  $("#webstore").bind("click", function() { chrome.tabs.create({url:bgPage.EXTENSION_URL}) }); // goto extension page on the webstore
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
      $("#findBtn").click();
    }
  });

  $("body").bind("keyup", function(event) {
    var vlcUrlInput = $("#vlcUrl").get(0);
    var videoUrlInput = $("#videoUrl").get(0);
    if (document.activeElement != vlcUrlInput && document.activeElement != videoUrlInput) {
      if (event.keyCode == 220 || event.keyCode == 86) { // doom console '\' or 'v'
        toggleDoomConsole();
      } else if (event.keyCode == 81) { // 'q' - enqueue
        log("en'q'");
        $("#enqueueBtn").click();
      } else if (event.keyCode == 80) { // 'p' - play
        $("#playBtn").click();
      } else if (event.keyCode == 90) { // 'z' - prev
        $("#prevBtn").click();
      } else if (event.keyCode == 88) { // 'x' - toggle pause
        $("#pauseBtn").click();
      } else if (event.keyCode == 67) { // 'c' - next
        $("#nextBtn").click();
      } else if (event.keyCode == 46) { // 'canc' - clear
        $("#clearBtn").click();
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
    sendRequest(bgPage.VLC_INTERFACE + "status.json?command=pl_pause");
  });
  $("#prevBtn").bind("click", function() {
    sendRequest(bgPage.VLC_INTERFACE + "status.json?command=pl_previous");
  });
  $("#nextBtn").bind("click", function() {
    sendRequest(bgPage.VLC_INTERFACE + "status.json?command=pl_next");
  });
  $("#clearBtn").bind("click", function() {
    sendRequest(bgPage.VLC_INTERFACE + "status.json?command=pl_empty");
  });
  $("#enqueueBtn").bind("click", function() {
    if (info && info.formats) {
      enqueue(info.formats[0].url, { mustEncode: true }, info.videoDetails.title);
    }
  });
  $("#playBtn").bind("click", function() {
    if (info && info.formats) {
      play(info.formats[0].url, { mustEncode: true }, info.videoDetails.title);
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
  for (let timerId of self.timerIds) {
    clearTimeout(timerId);
  }
  self.timerIds = [];
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

// adapted from https://gomakethings.com/stopping-youtube-vimeo-and-html5-videos-with-javascript/
var pauseVideo = [
  '(function() {',
  '  var container = document.body;',
  '  var iframe = container.querySelector("iframe");',
  '  var video = container.querySelector("video");',
  '  if (iframe !== null) {',
  '    var iframeSrc = iframe.src;',
  '    iframe.src = iframeSrc;',
  '  }',
  '  if (video !== null) {',
  '    video.pause();',
  '  }',
  '})();'
];