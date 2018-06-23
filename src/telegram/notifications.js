/**
 * notifications.js
 * Telegram Bot notifications manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require('moment'),
    bot = require('./bot').bot,
    DB = require("../db"),
    async = require('async'),
    levels = require("../levels"),
    mail = require("../mail"),
    roles = require("../roles"),
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

//Send daily menu notification for every user who enabled the setting.dailyMenu and didnt place an order yet
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
                DB.getDailyUserOrder(null, users[i]._id, (err, order) => {
                    if (!err && !order) {
                        //Broadcast only if the user didn't place an order yet
                        console.log("broadcasting dailyMenu to: " + users[i].telegram.id + "-" + users[i].telegram.first_name);
                        const ctx = {
                            session: {
                                user: users[i]
                            }
                        };
                        bot.telegram.sendMessage(users[i].telegram.id, message, keyboards.btb(ctx).opts).then((m) => {
                            console.log("dailyMenu sent to: " + users[i].telegram.id + "-" + users[i].telegram.first_name)
                        });
                    }
                });
            }
        }
    });
}

//Utility function for dailyMenuUpdated
function sendDailyMenuUpdate(user, message) {
    return (callback) => {
        console.log("broadcasting dailyMenu update to: " + user.telegram.id + "-" + user.telegram.first_name);
        const ctx = {
            session: {
                user: user
            }
        };
        bot.telegram.sendMessage(user.telegram.id, message, keyboards.btb(ctx).opts).then((m) => {
            console.log("dailyMenuUpdate sent to: " + user.telegram.id + "-" + user.telegram.first_name);
        });
        callback();
    }
}

//Send daily menu update notification for every user in the list
exports.dailyMenuUpdated = function (users, cb) {
    const query = {
            "telegram.enabled": true,
            "telegram.banned": false,
            "deleted": false,
            //"settings.dailyMenu": true
        },
        message = "⚠️ Daily menu has been changed and your order has been deleted!\nPlease place your order again.";

    async.parallel(users.map(u => sendDailyMenuUpdate(u, message)), (_err) => {
        if (cb)
            cb(_err);
    });
}

exports.dailyMenuUpdatedNotify = function (users, cb) {
    const query = {
            "telegram.enabled": true,
            "telegram.banned": false,
            "deleted": false,
            "settings.dailyMenu": true
        },
        message = "ℹ️ Daily menu has been changed\nYour order hasn't been affected tho!";

    async.parallel(users.map(u => sendDailyMenuUpdate(u, message)), (_err) => {
        if (cb)
            cb(_err);
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
                        bot.telegram.sendMessage(users[i].telegram.id, message, keyboards.btb(ctx).opts).then((m) => {
                            console.log("orderReminder sent to: " + users[i].telegram.id + "-" + users[i].telegram.first_name)
                        });
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
                    let message = require('./bot').formatOrderComplete(stats);

                    // Last order lost 1 point
                    DB.getDailyOrders(null, (err, orders) => {
                        if (err) {
                            console.error(err);
                        } else if (orders.length) {
                            levels.removePoints(orders[orders.length - 1].owner._id, 1, false, (err, points) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                        }
                    });
                    //Send mail
                    const adminMailUsers = users.filter(u => {
                        return roles.checkUserAccessLevel(u.role, accessLevel) && u.settings.adminOrdersCompleteMail == true;
                    });

                    if (adminMailUsers.length > 0) {
                        mail.sendOrdersCompleteMail(adminMailUsers.map(u => u.email), message, (err, info) => {
                            if (err) {
                                console.error(err);
                            } else {
                                if (info.rejected.length > 0)
                                    console.warn("ordersCompleteMail fail: " + JSON.stringify(info.rejected));
                                console.info("ordersCompleteMail sent to: " + JSON.stringify(info.accepted))
                            }
                        });
                    }

                    //Send telegram notifications
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
                            bot.telegram.sendMessage(users[i].telegram.id, "*Daily orders summary*:" + message, _options).then((m) => {
                                console.log("ordersCompleteReminder sent to: " + users[i].telegram.id + "-" + users[i].telegram.first_name)
                            });
                        }
                    }
                }
            });
        }
    });
}