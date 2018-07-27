/**
 * index.js
 * NodeJS server entry point
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

if (process.env.NODE_ENV !== "production") {
	console.log("Loading DEV enviroment...");
	require("dotenv").load();
}

console.log(
	"\n***********************************************************\n*\n" +
	"*      BiteTheBot v" + require('./package.json').version + "\n" +
	"*      enviroment: " + process.env.NODE_ENV + "\n" +
	"*      port: " + process.env.PORT + "\n*\n" +
	"***********************************************************\n"
);

if (process.env.NODE_ENV == "production") {
	console.log("Setting up heroku dyno keepAwake request...");
	//keepAwake heroku dyno
	var https = require("https");
	setInterval(function () {
		https.get("https://bitethebot.herokuapp.com");
	}, 15 * 60000);
}

require("./src/db").init(() => {
	//Server init once db connected
	require("./src/server").init();
});