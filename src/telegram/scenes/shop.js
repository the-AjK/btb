/**
 * slot.js
 * Slot scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    async = require("async"),
    moment = require("moment"),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    DB = require("../../db"),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('shop')
scene.enter((ctx) => {
    if (levels.getLevel(ctx.session.user.points) > 0 || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
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
    } else if (ctx.message.text == keyboards.shop(ctx).cmd.trade) {
        ctx.scene.enter('tradeWizard');
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

scene.on("callback_query", ctx => {

    if (levels.getLevel(ctx.session.user.points) < 1 && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        //unauthorized user -> back to extra
        return ctx.scene.enter('extra');
    }

    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == "gun") {
        deleteLastMessage(ctx);
        ctx.reply('Not in stock. Try again later');
    } else if (ctx.update.callback_query.data == "shield") {
        deleteLastMessage(ctx);
        ctx.reply('Not in stock. Try again later');
    } else if (ctx.update.callback_query.data == "news") {
        sendNews(ctx);
    } else if (ctx.update.callback_query.data == "newspremium") {
        sendNews(ctx, true);
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;

function formatNews(news, topUsers, dailyOrders, premium) {
    let text = "*~~~ Latest BiteTheBot News" + (premium ? " (Premium)" : "") + " ~~~*",
        newsListLenght = premium ? 60 : 30,
        limit = news.length > newsListLenght ? newsListLenght : news.length,
        actualDate;

    if (topUsers && topUsers.length) {
        let user = topUsers[0],
            userLink = bot.getUserLink(user) + " (" + user.points + ")";
        text += "\n\n*Top user*: 🥇 " + userLink;
    }

    if (dailyOrders && dailyOrders.length) {
        let dailyWinner = dailyOrders[0].owner;
        text += "\n\n*Daily winner*: 🍺 " + bot.getUserLink(dailyWinner) + " was the first to place the daily order!";

        if (!moment().isBefore(moment(dailyOrders[0].menu.deadline))) {
            let dailyLooser = dailyOrders[dailyOrders.length - 1].owner;
            text += "\n\n*Daily loser*: 💩 " + bot.getUserLink(dailyLooser) + " was the last to place the daily order!";
        }
    }

    if (premium) {
        const activeSessions = bot.session.getTopSessions();
        if (activeSessions && activeSessions.length) {
            const s = activeSessions[0];
            text += "\n\n*Most active user*: 🏃 " + bot.getUserLink(s.user) +
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
        let user = bot.getUserLink(n.owner),
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
                    user = bot.getUserLink(n.robbedUser);
                    text += " stole 💰 " + n.points + " beercoins from " + user;
                } else if (n.bombedUser != undefined) {
                    user = bot.getUserLink(n.bombedUser);
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
            DB.BeerEvent.find(null, null, {
                sort: {
                    createdAt: -1
                },
                limit: 100
            }).populate('owner').exec(cb);
        }
    }());

    funList.push(function () {
        return (cb) => {
            DB.SlotEvent.find({
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
            if (premium && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
                levels.removePoints(ctx.session.user._id, 1, true, (err, p) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        }
    });
}