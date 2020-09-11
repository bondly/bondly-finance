#!/bin/bash

echo Prepring the deployment package
rm ./dist/lambda.zip
cd ./dist/
zip -9 -r ./lambda.zip .
cp ./lambda.zip /mnt/c/Users/naiem/nk/tmp/unifyre-app-p2pswap/lambda.zip
cd ..

echo Open your AWS console, navigate to the lambda function and upload the zip
echo

