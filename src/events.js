/**
 * events.js
 * Events manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    DB = require("./db");

const eventsType = {
    beer: 0,
    slot: 1,
    donation: 2,
    orderRating: 3,
    levelUp: 4
}

exports.types = eventsType;

exports.getEvents = function (limit) {

}

exports.setEvent = function (type, content) {

}