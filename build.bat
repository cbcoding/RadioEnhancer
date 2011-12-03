@echo off

echo "Making build..."
xcopy extension build /s /i /q

echo "Compressing resources..."
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/pandora-enhancer.js" -o "build/js/pandora-enhancer.js"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/lastfm-api.js" -o "build/js/lastfm-api.js"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/notification.js" -o "build/js/notification.js"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/settings.js" -o "build/js/settings.js"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/background.js" -o "build/js/background.js"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/css/settings.css" -o "build/css/settings.css"
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/css/notification.css" -o "build/css/notification.css"

echo "Making uploadable archive..."
REM rar a upload_this.zip build
winrar a -afzip upload_this.zip build

echo "Cleaning up..."
timeout /t 2 /nobreak
rmdir build /s /q

echo "Done."
pause