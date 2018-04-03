/**
 * index.js
 * NodeJS server entry point
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

if (process.env.NODE_ENV !== "production") {
	console.log("DEVELOPMENT");
	require("dotenv").load();
} else {
	//keepAwake heroku dyno
	var https = require("https");
	setInterval(function() {
		https.get("https://bitethebot.herokuapp.com");
	}, 15 * 60000);
}

const express = require("express"),
	bodyParser = require("body-parser"),
	Raven = require('raven'),
	path = require("path"),
	cors = require("cors"),
	auth = require("./src/auth"),
	app = express(),
	apiRouter = require("./src/api"),
	moment = require("moment"),
	requestIp = require('request-ip');

auth.init(app);
apiRouter.init(app);

Raven.config(process.env.SENTRY_DSN).install();
app.use(Raven.requestHandler());

//app.use(require("morgan")("combined"));

//cors settings
const whitelist = ['https://bitethebot.herokuapp.com', 'http://localhost']

app.use((req, res, next) => {
	let allowedOrigin = false,
		origin = req.headers.origin || req.headers.referer || undefined;
	if (origin) {
		for (let i = 0; i < whitelist.length; i++) {
			if (origin.indexOf(whitelist[i]) == 0) {
				allowedOrigin = true;
				break;
			}
		}
	}
	if (allowedOrigin) {
		cors()(req, res, next)
	} else {
		next();
	}
});

//HTTPS redirect for heroku production
app.use((req, res, next) => {
	if (process.env.NODE_ENV === 'production') {
		if (req.headers['x-forwarded-proto'] != 'https') {
			return res.redirect('https://' + req.headers.host + req.url);
		} else {
			return next();
		}
	} else {
		return next();
	}
});

//Raven error handler
app.use(Raven.errorHandler());

//body parser error catching middleware
app.use((req, res, next) => {
	bodyParser.json({
		verify: addRawBody
	})(req, res, err => {
		if (err) {
			console.log(err);
			res.sendStatus(400);
			return;
		}
		next();
	});
});

function addRawBody(req, res, buf, encoding) {
	req.rawBody = buf.toString();
}

app.use(requestIp.mw());

app.use("/static", express.static(path.join(__dirname, "dashboard/build/static")));
app.use("/api", apiRouter.api);
app.use("/", express.static(path.join(__dirname, "dashboard/build")));
app.get('*', function(req, res) {
	res.sendFile(path.join(__dirname, "dashboard/build/index.html"));
});

console.log("DB connecting...");
//require("./src/telegram").init(expressApp);
const db = require("./src/db");
db.init(() => {

	/*db.addMenu({
		owner: "5a9a9e660727643f52f94915",
		enabled: true,
		label: "Daily menu",
		firstCourse: {
			items: [{
				value: "carbonara"
			},{
				value: "aglio, olio, peperoncino",
				types: ["spaghetti"]
			}],
			types: ["spaghetti", "penne integrali"]
		},
		secondCourse: {
			items: ["polpette", "tonno al sesamo"],
			sideDishes: ["patate e carciofi", "verdura cotta", "cavolfiori al vapore"]
		},
		additionalInfos: "Tonno +2euro",
		deadline: moment().hours(11).format(),
		tables: [{
			name: "Tavolo1",
			availableSeats: 8
		}, {
			name: "Tavolo2",
			availableSeats: 6
		}, {
			name: "Tavolo3",
			availableSeats: 6
		}, {
			name: "Riserva",
			availableSeats: 6
		}, {
			name: "Asporti",
			availableSeats: 99
		}]
	})*/
});

console.log("Starting telegram bot...");
//require("./src/telegram").init(expressApp);
require("./src/telegram/bot").init();

require("./src/reminder").init();

app.listen(process.env.PORT, () => {
	console.log("App listening on port " + process.env.PORT);
});