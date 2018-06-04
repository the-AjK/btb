/**
 * slot.js
 * Slot scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    async = require("async"),
    moment = require("moment"),
    PaginatedInlineKeyboard = require("../tools/paginatedInlineKeyboard").PaginatedInlineKeyboard,
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    utils = require('../../utils'),
    beers = require('../beers'),
    DB = require("../../db"),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('shop')
scene.enter((ctx) => {
    if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        //authorized user
        ctx.reply(keyboards.shop(ctx).text, keyboards.shop(ctx).opts).then(() => {

        });
    } else {
        //unauthorized user -> back to extra
        ctx.scene.enter('extra');
    }
});

scene.leave((ctx) => {

});

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.shop(ctx)[ctx.message.text]) {
        keyboards.shop(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.shop(ctx).cmd.back) {
        //back button
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

function updateUsersKeyboard(ctx) {
    require('../bot').bot.telegram.editMessageReplyMarkup(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, {
        inline_keyboard: ctx.session.users_inline_keyboard.render()
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

scene.on("callback_query", ctx => {

    if (levels.getLevel(ctx.session.user.points) < 1 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        //unauthorized user -> back to extra
        return ctx.scene.enter('extra');
    }

    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.previousCallbackData()) {
        ctx.session.users_inline_keyboard.previous();
        updateUsersKeyboard(ctx);
    } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.nextCallbackData()) {
        ctx.session.users_inline_keyboard.next();
        updateUsersKeyboard(ctx);
    } else if (ctx.update.callback_query.data == "gun") {
        deleteLastMessage(ctx);
        ctx.reply('Not in stock. Try again later');
    } else if (ctx.update.callback_query.data == "shield") {
        deleteLastMessage(ctx);
        ctx.reply('Not in stock. Try again later');
    } else if (ctx.update.callback_query.data == "gift") {
        selectGiftUser(ctx);
    } else if (ctx.update.callback_query.data == "news") {
        sendNews(ctx);
    } else if (ctx.update.callback_query.data == "newspremium") {
        sendNews(ctx, true);
    } else if (ctx.update.callback_query.data.indexOf("usergift_") == 0) {
        const userTelegramID = parseInt(ctx.update.callback_query.data.substring(9));
        if (isNaN(userTelegramID)) {
            console.error("Wrong callback data");
            return ctx.answerCbQuery("Something went wrong!");
        }
        DB.User.findOne({
            "telegram.id": userTelegramID
        }, (err, giftUser) => {
            if (err || !giftUser) {
                console.error(err || "Gift user not found");
                return ctx.answerCbQuery("Something went wrong!");
            }
            deleteLastMessage(ctx);
            ctx.answerCbQuery("Sending gift to " + giftUser.telegram.first_name + "...");
            const sender = "[" + (ctx.session.user.telegram.first_name + (ctx.session.user.telegram.last_name ? (" " + ctx.session.user.telegram.last_name) : "")) + "](tg://user?id=" + ctx.session.user.telegram.id + ")",
                message = "*You got a gift!*\n" + sender + " just sent you 1 beercoin 💰 !";
            require('../bot').bot.telegram.sendMessage(giftUser.telegram.id, message, {
                parse_mode: "markdown"
            }).then(() => {
                levels.removePoints(ctx.session.user._id, 1, true, (e, p) => {
                    if (err) {
                        ctx.reply("Something went wrong!");
                        return console.error(err);
                    }
                    levels.addPoints(giftUser._id, 1, true, (err, _points) => {
                        if (err) {
                            ctx.reply("Something went wrong!");
                            return console.error(err);
                        }
                        const giftedUser = "[" + (giftUser.telegram.first_name + (giftUser.telegram.last_name ? (" " + giftUser.telegram.last_name) : "")) + "](tg://user?id=" + giftUser.telegram.id + ")";
                        ctx.reply(giftedUser + " got your beercoin 💰 !", {
                            parse_mode: "markdown"
                        });
                        if (!checkUser(ctx.session.user.role, userRoles.root)) {
                            bot.broadcastMessage("User *" + ctx.session.user.email + "* sent 1 beercoin to *" + giftUser.email + "*", accessLevels.root, null, true);
                        }
                    });
                });
            });
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;

function selectGiftUser(ctx) {
    deleteLastMessage(ctx);
    DB.User.find({
        "_id": {
            "$ne": ctx.session.user._id
        },
        "telegram.enabled": true,
        "telegram.banned": false,
        deleted: false
    }, (err, users) => {
        if (err) {
            ctx.reply("Something went wrong!");
            console.error(err);
        } else {
            let data = users.map(u => {
                    return {
                        text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : "") + " (" + u.points + ")",
                        callback_data: "usergift_" + String(u.telegram.id)
                    };
                }),
                options = {
                    columns: 2,
                    pageSize: 6
                };
            ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
            ctx.reply("Beercoin gift 💰 !\nWho do you want to send it to?", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: ctx.session.users_inline_keyboard.render()
                })
            }).then((m) => {
                ctx.session.lastMessage = m;
            });
        }
    });
}

function formatNews(news, topUsers, dailyOrders, premium) {
    let text = "*~~~ Latest BiteTheBot News" + (premium ? " (Premium)" : "") + " ~~~*",
        newsListLenght = premium ? 60 : 30,
        limit = news.length > newsListLenght ? newsListLenght : news.length,
        actualDate;

    if (topUsers && topUsers.length) {
        let user = topUsers[0],
            userLink = "[" + (user.telegram.first_name + (user.telegram.last_name ? (" " + user.telegram.last_name) : "")) + "](tg://user?id=" + user.telegram.id + ") (" + user.points + ")";
        text += "\n\n*Top user*: 🥇 " + userLink;
    }

    if (dailyOrders && dailyOrders.length) {
        let dailyWinner = dailyOrders[0].owner,
            dailyOrderWinnerLink = "[" + (dailyWinner.telegram.first_name + (dailyWinner.telegram.last_name ? (" " + dailyWinner.telegram.last_name) : "")) + "](tg://user?id=" + dailyWinner.telegram.id + ")";
        text += "\n\n*Daily winner*: 🍺 " + dailyOrderWinnerLink + " was the first to place the daily order!";

        if (!moment().isBefore(moment(dailyOrders[0].menu.deadline))) {
            let dailyLooser = dailyOrders[dailyOrders.length - 1].owner,
                dailyOrderLooserLink = "[" + (dailyLooser.telegram.first_name + (dailyLooser.telegram.last_name ? (" " + dailyLooser.telegram.last_name) : "")) + "](tg://user?id=" + dailyLooser.telegram.id + ")";
            text += "\n\n*Daily loser*: 💩 " + dailyOrderLooserLink + " was the last to place the daily order!";
        }
    }

    if (premium) {
        const activeSessions = bot.session.getTopSessions();
        if (activeSessions && activeSessions.length) {
            const s = activeSessions[0];
            let sessionUserLink = "[" + (s.user.telegram.first_name + (s.user.telegram.last_name ? (" " + s.user.telegram.last_name) : "")) + "](tg://user?id=" + s.user.telegram.id + ")";
            text += "\n\n*Most active user*: 🏃 " + sessionUserLink +
                "\n*User sessions*: " + activeSessions.length;
        }
    }

    text += "\n\n*Events*:";

    for (let i = 0; i < limit; i++) {
        let n = news[i];
        if (!premium && n.type != undefined || !n.owner) {
            if (news.length > limit)
                limit++;
            continue;
        }
        let user = "[" + (n.owner.telegram.first_name + (n.owner.telegram.last_name ? (" " + n.owner.telegram.last_name) : "")) + "](tg://user?id=" + n.owner.telegram.id + ")",
            date = moment(n.createdAt).format('Do MMMM YYYY'),
            hour = moment(n.createdAt).format('HH:mm');
        if (actualDate != date) {
            actualDate = date;
            text += "\n\n_" + actualDate + "_:";
        }
        text += "\n_" + hour + "_ - " + user;
        if (n.points != undefined) {
            //slot stuff
            if (n.bet != undefined && n.bet == 0) {
                text += " got a free daily run and";
            }
            if (n.points < 0) {
                text += " lost " + (n.points * -1) + " slot points 🎰";
            } else {
                if (n.robbedUser != undefined) {
                    user = "[" + (n.robbedUser.telegram.first_name + (n.robbedUser.telegram.last_name ? (" " + n.robbedUser.telegram.last_name) : "")) + "](tg://user?id=" + n.robbedUser.telegram.id + ")";
                    text += " stole 💰 " + n.points + " beercoins from " + user;
                } else if (n.bombedUser != undefined) {
                    user = "[" + (n.bombedUser.telegram.first_name + (n.bombedUser.telegram.last_name ? (" " + n.bombedUser.telegram.last_name) : "")) + "](tg://user?id=" + n.bombedUser.telegram.id + ")";
                    text += " sent 💣 " + n.points + " bombs to " + user;
                } else {
                    text += " won " + n.points + " slot points 🎰"
                }
            }
        } else if (n.type != undefined) {
            //beer stuff
            text += " sent a beer 🍺"
            if (n.drunk) {
                text += " and made the bot drunk 😵"
            }
        } else if (n.menu != undefined) {
            text += " place a daily order 🍽"
        }
    }
    return text;
}

function sendNews(ctx, premium) {

    console.log((premium ? "Premium " : "") + "News request from user: " + ctx.session.user.email)
    let funList = [];

    funList.push(function () {
        return (cb) => {
            DB.Beer.find(null, null, {
                sort: {
                    createdAt: -1
                },
                limit: 100
            }).populate('owner').exec(cb);
        }
    }());

    funList.push(function () {
        return (cb) => {
            DB.Slot.find({
                points: {
                    "$ne": 0
                }
            }, null, {
                sort: {
                    createdAt: -1
                },
                limit: 100
            }).populate('owner').populate('bombedUser').populate('robbedUser').exec(cb);
        }
    }());

    funList.push(function () {
        return (cb) => {
            DB.Order.find({
                deleted: false
            }, {
                owner: 1,
                menu: 1,
                createdAt: 1
            }, {
                sort: {
                    createdAt: -1
                },
                limit: 100
            }).populate('owner').exec(cb);
        }
    }());

    funList.push(function () {
        return (cb) => {
            DB.getTopTenUsers(cb);
        }
    }());

    funList.push(function () {
        return (cb) => {
            DB.getDailyOrders(null, (err, res) => {
                if (err) {
                    console.error(err);
                }
                cb(null, res || []);
            });
        }
    }());

    async.parallel(funList, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            const results = result[0].concat(result[1]).concat(result[2]);
            //desc createdAt sorting
            results.sort((t1, t2) => {
                if (t1.createdAt > t2.createdAt) {
                    return -1
                } else if (t1.createdAt < t2.createdAt) {
                    return 1
                } else {
                    return 0;
                }
            });
            deleteLastMessage(ctx);
            ctx.reply(formatNews(results, result[3], result[4], premium), {
                parse_mode: "markdown"
            });
            if (premium) {
                levels.removePoints(ctx.session.user._id, 1, true, (err, p) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        }
    });
}