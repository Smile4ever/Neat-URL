#!/bin/bash
NEATURLVERSION=$(jq -r '.version' manifest.json)
echo "Building Neat URL $NEATURLVERSION"
echo "Requirements:"
echo "- jq"
echo "- git"
echo "- web-ext"
echo "- npm"
echo "- rename"

if [[ ! -f "browser-polyfill.min.js" ]]; then
	git clone https://github.com/mozilla/webextension-polyfill polyfill
	cd polyfill
	npm install
	npm run build
	npm run test
	cp dist/browser-polyfill.min.js ../browser-polyfill.min.js
	cd ..
	rm -rf polyfill
fi

rm -rf build 2>/dev/null

# Build ZIP - Chrome
mkdir build
shopt -s extglob  # to enable extglob
cp -r !(build*) build/

cd build
rm -rf web-ext-artifacts
jq -r 'del(.applications) | del(.browser_action.browser_style) | del(.options_ui.browser_style)' manifest.json > manifest-chrome.json #Chrome
rm manifest.json #Chrome
mv manifest-chrome.json manifest.json #Chrome
echo ""
echo "Building ZIP for Chrome.."
web-ext build --ignore-files build.sh images *.md *.txt .gitignore

cd web-ext-artifacts
rename zip chrome.zip *.zip

cd ../..
yes | cp build/web-ext-artifacts/* web-ext-artifacts/

rm -rf build

# Build ZIP - Firefox
mkdir build
shopt -s extglob  # to enable extglob
cp -r !(build*) build/

cd build
rm -rf web-ext-artifacts
rm browser-polyfill.min.js
touch browser-polyfill.min.js
echo ""
echo "Building ZIP for Firefox.."
web-ext build --ignore-files build.sh images *.md *.txt .gitignore

cd web-ext-artifacts
rename zip firefox.zip *.zip

cd ../..
yes | cp build/web-ext-artifacts/* web-ext-artifacts/

rm -rf build

echo ""
echo "Done building Neat URL $NEATURLVERSION:"
find web-ext-artifacts -mmin -1 -type f -print
