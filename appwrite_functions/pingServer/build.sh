SCRIPT_NAME=pingServer

rm -rf build && mkdir -p build && deno bundle $SCRIPT_NAME.ts build/$SCRIPT_NAME.js && cd build && tar -zcf ../../../appwrite/setup/tags/$SCRIPT_NAME.tar.gz . && rm -rf build