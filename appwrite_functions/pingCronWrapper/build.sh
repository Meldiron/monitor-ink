SCRIPT_NAME=pingCronWrapper
rm -rf node_modules && npm install && tar -zcf ../../appwrite_setup/setup/tags/$SCRIPT_NAME.tar.gz .
