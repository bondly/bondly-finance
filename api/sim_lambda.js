
var r = require('ts-node').register();
var {handler} = require('./src/index');
var {SimulateLamdba} = require("aws-lambda-helper");

SimulateLamdba.run(8080, handler);
