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
    10: 1,
    50: 2,
    200: 3,
    600: 4,
    1500: 5,
    5000: 6,
    10000: 7,
    50000: 8,
    100000: 9
};

function getLevelFeatures(level) {
    const features = {
        1: "- Rate your lunch\n- Top ten users\n- Joke bot\n- Audio bot",
        2: "- Check orders status\n- Check tables status\n- Check users without orders",
        3: "- Secret stuff",
        4: "- Secret stuff",
        5: "- Secret stuff",
        6: "- Secret stuff",
        7: "- Secret stuff",
        8: "- Secret stuff",
        9: "- Secret stuff"
    };
    return features[level] || "";
}

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

exports.removePoints = function (userID, points, silent, cb) {
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
                        //Update bot user session
                        bot.session.setSessionParam(user.telegram.id, "user.points", user.points);
                        if (!silent) {
                            let message = "💩 Ops!\n\nYou lost *" + points + "* point" + (points > 1 ? "s" : "") + "!";
                            require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                                parse_mode: "markdown"
                            }).then(() => {
                                console.log("User: *" + user.email + "* lost " + points + " points (" + user.points + ")");
                            });
                        }
                        cb(null, user.points);
                    }
                });
            }
        });
}

exports.addPoints = function (userID, points, silent, cb) {
    DB.User.findById(userID, (err, user) => {
        if (err) {
            return cb(err);
        } else if (!user) {
            return cb("User not found");
        } else {
            const initialPoints = user.points,
                initialLevel = getLevel(initialPoints);
            user.points = initialPoints + points;
            user.save((err, _user) => {
                if (err) {
                    cb(err);
                } else {
                    //Update bot user session
                    bot.session.setSessionParam(user.telegram.id, "user.points", _user.points);
                    let message = "🏅 Congratulations!\n\nYou got *" + points + "* point" + (points > 1 ? "s" : "") + "!";
                    if (getLevel(_user.points) > initialLevel) {
                        //In case of levelUp, forse silent to false
                        silent = false;
                        message = "You collected *" + _user.points + "* points!" +
                            "\n\n⭐️ Level Up!\n\n*Unlocked features*:\n" + getLevelFeatures(getLevel(_user.points));
                    }
                    if (!silent) {
                        require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                            parse_mode: "markdown"
                        }).then(() => {
                            console.log("User: " + user.email + " got " + points + " points (" + _user.points + ")");
                        });
                    }
                    cb(null, _user.points);
                }
            });
        }
    });
}