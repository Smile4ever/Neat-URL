#!/bin/bash
shopt -s extglob  # to enable extglob
build_fill() {
	mkdir build
	cp -r !(build*|background.js|options.js) build/
	filters="$(grep '## Blocked Parameters' -A2 README.md | sed -e 's/&ast;/*/g' | tail -1)"
	for i in background.js options.js; do
		sed -e "s|__FILTERS__|$filters|" < $i > build/$i
	done
}

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
build_fill
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

rm -rf build/web-ext-artifacts
rm -rf build

# Build ZIP - Firefox
build_fill
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
