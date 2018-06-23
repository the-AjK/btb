/**
 * api.js
 * API express router
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const express = require("express"),
	RateLimit = require('express-rate-limit'),
	manager = require("./manager"),
	auth = require("./auth"),
	api = express.Router();

exports.init = function (app) {
	//heroku production settings
	if (process.env.NODE_ENV !== "development")
		app.enable('trust proxy');
}

const apiLimiter = new RateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000,
	delayMs: 0 // disabled
});

const loginLimiter = new RateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour window
	delayAfter: 1, // begin slowing down responses after the first request
	delayMs: 3 * 1000, // slow down subsequent responses by 3 seconds per request
	max: 5, // start blocking after 5 requests
	message: "Too many login attempts, please try again after an hour"
});

api.post("/login", loginLimiter, auth.login);
api.get("/logout", loginLimiter, auth.checkAuthUser, auth.logout);

api.post("/profile", apiLimiter, auth.checkAuthUser, auth.updateProfile);
api.get("/suggestions", apiLimiter, auth.checkAuthAdmin, manager.getSuggestions);
api.get("/stats", apiLimiter, auth.checkAuthUser, manager.getStats);
api.post("/broadcast", apiLimiter, auth.checkAuthAdmin, manager.broadcastMessage);

function generateResourceAPIStack(resource) {
	api.get("/" + resource + "/:id?", apiLimiter, auth.checkAuthAdmin, manager[resource].get);
	api.post("/" + resource, apiLimiter, auth.checkAuthAdmin, manager[resource].add);
	api.put("/" + resource + "/:id", apiLimiter, auth.checkAuthAdmin, manager[resource].update);
	api.delete("/" + resource + "/:id", apiLimiter, auth.checkAuthAdmin, manager[resource].delete);
}

generateResourceAPIStack('users');
generateResourceAPIStack('menus');
generateResourceAPIStack('tables');

api.get("/orders/:id?", apiLimiter, auth.checkAuthUser, manager.orders.get);
api.post("/orders", apiLimiter, auth.checkAuthUser, manager.orders.add);
api.put("/orders/:id", apiLimiter, auth.checkAuthUser, manager.orders.update);
api.delete("/orders/:id", apiLimiter, auth.checkAuthUser, manager.orders.delete);

// Root stuff
api.post("/mail", apiLimiter, auth.checkAuthRoot, manager.sendMail);

api.get("/coffee", apiLimiter, function (req, res) {
	//I'm a teapot
	return res.sendStatus(418);
});

api.get("*", apiLimiter, auth.checkAuthUser, function (req, res) {
	return res.sendStatus(400);
});

exports.api = api;