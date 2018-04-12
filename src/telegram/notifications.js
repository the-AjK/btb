/**
 * notifications.js
 * Telegram Bot notifications manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require('moment'),
    bot = require('./bot').bot,
    DB = require("../db"),
    roles = require("../roles"),
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    keyboards = require('./keyboards');


//Send an account enabled notification, shall be called on user update
exports.accountEnabledDisabled = function (user, status) {
    const name = user.telegram.username || user.telegram.first_name || user.telegram.id.toString();
    let msg = "Game Over *" + name + "*, your account has been disabled!\nContact an administrator for more info.",
        opts = {
            parse_mode: "markdown",
            reply_markup: JSON.stringify({
                remove_keyboard: true
            })
        }
    if (status) {
        msg = "Hey *" + name + "*\nyour account has been enabled!\nGive me a beer!";
        const ctx = {
            session: {
                user: user
            }
        };
        opts = keyboards.btb(ctx).opts;
    }
    bot.telegram.sendMessage(user.telegram.id, msg, opts);
}

//Send daily menu notification for every user who enabled the setting.dailyMenu
exports.dailyMenu = function (menu) {
    const query = {
            "telegram.enabled": true,
            "telegram.banned": false,
            "deleted": false,
            "settings.dailyMenu": true
        },
        message = "🤘 New daily menu is available!\n" + require('./bot').formatMenu(menu);

    DB.User.find(query, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            for (let i = 0; i < users.length; i++) {
                console.log("broadcasting dailyMenu to: " + users[i].telegram.id + "-" + users[i].telegram.first_name);
                const ctx = {
                    session: {
                        user: users[i]
                    }
                };
                bot.telegram.sendMessage(users[i].telegram.id, message, keyboards.btb(ctx).opts);
            }
        }
    });
}

//Send daily menu update notification for every user
exports.dailyMenuUpdated = function (menu) {
    const query = {
            "telegram.enabled": true,
            "telegram.banned": false,
            "deleted": false,
            //"settings.dailyMenu": true
        },
        message = "⚠️ Daily menu has been changed and your order has been deleted!\nPlease place your order again.";

    DB.User.find(query, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            for (let i = 0; i < users.length; i++) {
                DB.getDailyUserOrder(null, users[i]._id, (err, order) => {
                    if (err) {
                        console.error(err);
                    } else if (!order) {
                        //user didnt ordered yet, nothing to do.
                    } else {
                        console.log("broadcasting dailyMenu update to: " + users[i].telegram.id + "-" + users[i].telegram.first_name);
                        const ctx = {
                            session: {
                                user: users[i]
                            }
                        };
                        bot.telegram.sendMessage(users[i].telegram.id, message, keyboards.btb(ctx).opts)
                    }
                });
            }
        }
    });
}

//Send the order reminder notification for every user who enabled the setting.orderReminder
exports.orderReminder = function (deadline) {

    const query = {
        "telegram.enabled": true,
        "telegram.banned": false,
        "deleted": false,
        "settings.orderReminder": true
    };
    let message = "🚀 *Hurry up!*\nIf you wanna eat today, you should place an order before the deadline";

    if (deadline) {
        message = message + " (" + moment(deadline).format('HH:mm') + ")";
    }

    DB.User.find(query, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            for (let i = 0; i < users.length; i++) {
                DB.getDailyUserOrder(null, users[i]._id, (err, order) => {
                    if (!err && !order) {
                        console.log("broadcasting orderReminder to: " + users[i].telegram.id + "-" + users[i].telegram.first_name);
                        const ctx = {
                            session: {
                                user: users[i]
                            }
                        };
                        bot.telegram.sendMessage(users[i].telegram.id, message, keyboards.btb(ctx).opts);
                    }
                });
            }
        }
    });
}

exports.ordersCompleteReminder = function () {

    let _options = {
        parse_mode: "markdown",
        disable_notification: false
    };

    const query = {
        "telegram.enabled": true,
        "telegram.banned": false,
        "deleted": false,
        "settings.adminReminders": true
    };

    const accessLevel = accessLevels.admin;

    DB.User.find(query, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            DB.getDailyOrderStats(null, (err, stats) => {
                if (err) {
                    console.error(err);
                } else {
                    let message = "*Daily orders summary*:" +
                        require('./bot').formatOrderComplete(stats);
                    for (let i = 0; i < users.length; i++) {
                        if (!roles.checkUserAccessLevel(users[i].role, accessLevel)) {
                            continue;
                        } else {
                            //admin accessLevel only
                            let logText = "broadcasting orderCompleteReminder to: " + users[i].telegram.id + "-" + users[i].telegram.first_name + " [";
                            if (roles.checkUserAccessLevel(accessLevel, roles.accessLevels.root)) {
                                logText = logText + "ROOT";
                            } else if (roles.checkUserAccessLevel(accessLevel, roles.accessLevels.admin)) {
                                logText = logText + "ADMIN";
                            }
                            logText = logText + "]";
                            console.log(logText);
                            bot.telegram.sendMessage(users[i].telegram.id, message, _options);
                        }
                    }
                }
            });
        }
    });
}