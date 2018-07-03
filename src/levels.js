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
    150: 3,
    400: 4,
    1000: 5,
    1500: 6,
    5000: 7,
    10000: 8,
    50000: 9
};
exports.pointsLevels = pointsLevels;

function getLevelFeatures(level) {
    const features = {
        1: "- Rate your lunch\n- Top ten users\n- Joke bot\n- Audio bot\n- Shop",
        2: "- Check orders status\n- Check tables status\n- Check users without orders",
        3: "- Shield + Gun shop items",
        4: "- Nim game",
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
                            let message = "💩 Ops!\n\nYou lost *" + points + "* beercoin" + (points > 1 ? "s" : "") + "!";
                            require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                                parse_mode: "markdown"
                            }).then(() => {
                                console.log("User: *" + user.email + "* lost " + points + " beercoins (" + user.points + ")");
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
                    let message = "🏅 Congratulations!\n\nYou got *" + points + "* beercoin" + (points > 1 ? "s" : "") + "!",
                        level = getLevel(_user.points);
                    if (level > initialLevel) {
                        //In case of levelUp, forse silent to false
                        silent = false;
                        message = "You collected *" + _user.points + "* beercoins!" +
                            "\n\n⭐️ Level Up! 🔝\n\n*Unlocked features*:\n" + getLevelFeatures(level);
                        //Save event
                        const event = new DB.LevelEvent({
                            owner: userID,
                            level: level
                        });
                        event.save((err, s) => {
                            if (err) {
                                console.error(err);
                            }
                        });
                    }
                    if (!silent) {
                        require("./telegram/bot").bot.telegram.sendMessage(user.telegram.id, message, {
                            parse_mode: "markdown"
                        }).then(() => {
                            console.log("User: " + user.email + " got " + points + " beercoins (" + _user.points + ")");
                        });
                    }
                    cb(null, _user.points);
                }
            });
        }
    });
}