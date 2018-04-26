/**
 * levels.js
 * Levels manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const bot = require("./telegram/bot"),
    roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    DB = require("./db");

const pointsLevels = {
    30: 1,
    150: 2,
    500: 3,
    1000: 4,
    2500: 5,
    5000: 6
};

function getLevel(points) {
    if (!points)
        points = 0;
    for (let p in pointsLevels) {
        let level = pointsLevels[p];
        if (points <= p)
            return points == p ? level : level - 1;
    }
    return 0;
}
exports.getLevel = getLevel;

exports.getUserLevel = function (userID) {
    DB.findById(userID, (err, _user) => {
        if (err) {
            cb(err);
        } else {
            cb(null, getLevel(_user.points));
        }
    });
}

exports.removePoints = function (userID, points, cb) {
    DB.User.findById(userID,
        (err, user) => {
            if (err) {
                cb(err);
            } else if (!user) {
                cb("User not found");
            } else if (user.points == 0) {
                cb(null, 0)
            } else {
                user.points = Math.max(0, user.points - points);
                user.save((err) => {
                    if (err) {
                        cb(err);
                    } else {
                        let message = "💩 Ops!\n\nYou lost *" + points + "* point" + (points > 1 ? "s" : "") + "!";
                        /*require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                            parse_mode: "markdown"
                        }).then(() => {
                            console.log("removePoints message sent to: " + user.telegram.id + "-" + user.telegram.first_name);
                        });*/
                        if (!checkUser(user.role, userRoles.root)) {
                            bot.broadcastMessage("User: *" + user.email + "* lost " + points + " points (" + user.points + ")", accessLevels.root, null, true);
                        }
                        cb(null, user.points);
                    }
                });
            }
        });
}

exports.addPoints = function (userID, points, cb) {
    DB.User.findById(userID, (err, user) => {
        if (err) {
            return cb(err);
        } else if (!user) {
            return cb("User not found");
        } else {
            const initialPoints = user.points;
            user.points = initialPoints + points;
            user.save((err, _user) => {
                if (err) {
                    return cb(err);
                }
                let message = "🏅 Congratulations!\n\nYou got *" + points + "* point" + (points > 1 ? "s" : "") + "!";
                if (getLevel(_user.points) > getLevel(initialPoints)) {
                    let message = "⭐️ Level Up! You got *" + points + "* point" + (points > 1 ? "s" : "") + "!";
                }
                require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                    parse_mode: "markdown"
                }).then(() => {
                    console.log("addPoints message sent to: " + user.telegram.id + "-" + user.telegram.first_name);
                });
                if (!checkUser(user.role, userRoles.root)) {
                    bot.broadcastMessage("User: *" + user.email + "* got " + points + " points (" + _user.points + ")", accessLevels.root, null, true);
                }
                cb(null, _user.points);
            });
        }
    });
}