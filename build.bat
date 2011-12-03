@echo off


echo "Making /build..."
xcopy extension build /s /i

echo "Compressing pandoraenhancer.js..."
java -jar "resources/yui/build/yuicompressor-2.4.7.jar" "build/js/pandora-enhancer.js" -o "build/js/pandora-enhancer.js"



REM rar a upload_this.zip /build


echo "Cleaning up..."
REM rmdir build



pause