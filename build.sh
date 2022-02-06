#!/bin/bash
NEATURLVERSION=$(jq -r '.version' manifest.json)
echo "Building Neat URL $NEATURLVERSION"
echo "Requirements:"
echo "- jq"
echo "- git"
echo "- web-ext"
echo "- npm"

#Execute this in a sudo or administrator terminal
#npm install --global web-ext

if [[ ! -f "browser-polyfill.min.js" ]]; then
	echo "Downloading browser-polyfill.min.js"
	git clone https://github.com/mozilla/webextension-polyfill polyfill
	cd polyfill
	npm install
	npm run build
	npm run test
	cp dist/browser-polyfill.min.js ../browser-polyfill.min.js
	cd ..
	rm -rf polyfill
fi

echo "Deleting old build directory"
rm -rf build 2>/dev/null
echo "Deleting node_modules directory"
rm -rf node_modules 2>/dev/null

# Build ZIP - Chrome
echo "Copying files for Chrome"
mkdir build
shopt -s extglob  # to enable extglob
cp -r !(build*) build/

cd build
rm -rf web-ext-artifacts
rm package.json
rm package-lock.json
jq -r 'del(.applications) | del(.browser_action.browser_style) | del(.options_ui.browser_style)' manifest.json > manifest-chrome.json #Chrome
rm manifest.json #Chrome
mv manifest-chrome.json manifest.json #Chrome

echo "Building ZIP for Chrome.."
web-ext build --ignore-files build.sh images *.md *.txt .gitignore --filename "{name}-{version}.chrome.zip"

cd ..
yes | cp build/web-ext-artifacts/* web-ext-artifacts/

#rm -rf build/web-ext-artifacts
rm -rf build

# Build ZIP - Firefox
echo ""
echo "Copying files for Firefox"
mkdir build
shopt -s extglob  # to enable extglob
cp -r !(build*) build/ #copy all files in current directory to build except for the directory build

cd build
rm -rf web-ext-artifacts
rm package.json
rm package-lock.json
rm browser-polyfill.min.js
touch browser-polyfill.min.js

echo "Building ZIP for Firefox.."
web-ext build --ignore-files build.sh images *.md *.txt .gitignore --filename "{name}-{version}.firefox.zip"

cd ..
yes | cp build/web-ext-artifacts/* web-ext-artifacts/

rm -rf build

echo ""
echo "Done building Neat URL $NEATURLVERSION:"
#find web-ext-artifacts -mmin -1 -type f -print
cd web-ext-artifacts
ls -t | head -n2