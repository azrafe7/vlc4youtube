
var ytdl = window.ytdl || {};

ytdl = require("./lib/index.js");
ytdl.utils = require("./lib/util.js");

window.ytdl = ytdl;
