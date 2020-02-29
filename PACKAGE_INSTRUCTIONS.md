# Build Instructions
Only code of this extension's dependencies are minified (to have a smaller bundle).

 - js/popup.js             (unminified)
 - js/background.js        (unminified)
 - js/ytdl.min.js          (built from https://github.com/fent/node-ytdl-core and minified)
 - js/jquery-3.4.1.min.js  (minified)


## Tools used for the build
 - 7zip
 - node 10.16.0
 - npm 6.9.0
   - browserify 16.3.0 (must be installed globally)
   - uglify-es 3.3.9 (must be installed globally)

(developed on a Windows 8.1 machine)


## Steps to reproduce the build
Clone the repository for the extension at https://github.com/azrafe7/vlc4youtube.

Launch `update-ytdl.ps1` (a PowerShell script) to download the latest version of node-ytdl-core (it will be put in the `node-ytdl-core-master` folder). 
The script will also extract the needed files and minify them into a single file.

Launch `package-chrome.bat` to create a packaged extension zip file for Chrome (inside the `package` folder).

Launch `package-firefox.bat` to create a packaged addon zip file for Firefox (inside the `package` folder).

