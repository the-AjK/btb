/**
 * extra.js
 * Telegram Bot extra scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    schedule = require('node-schedule'),
    moment = require('moment'),
    async = require("async"),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    packageJSON = require('../../../package.json'),
    utils = require("../../utils"),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    beers = require('../beers'),
    bot = require('../bot'),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('extra')
scene.enter((ctx) => ctx.reply(keyboards.extra(ctx).text, keyboards.extra(ctx).opts))

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.extra(ctx)[ctx.message.text]) {
        keyboards.extra(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.slot) {
        ctx.scene.enter('slot');
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.nim) {
        ctx.scene.enter('nim');
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.news) {
        sendNews(ctx);
    } else if (ctx.message.text == keyboards.slot(ctx).cmd.back) {
        //back from slot
        ctx.reply(keyboards.extra(ctx).text, keyboards.extra(ctx).opts);
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.back) {
        //back button
        ctx.scene.leave();
        ctx.reply('ACK', keyboards.btb(ctx).opts);
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {
    deleteLastMessage(ctx);
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == 'statusorders') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else if (!ctx.session.getDailyOrderStats) {
            ctx.session.getDailyOrderStats = true;
            DB.getDailyOrderStats(null, (err, stats) => {
                if (err) {
                    ctx.reply(err);
                } else {
                    ctx.reply("*Orders status*:" + bot.formatOrderComplete(stats), {
                        parse_mode: "markdown"
                    });
                }
                ctx.session.getDailyOrderStats = false;
            });
        } else {
            ctx.answerCbQuery("Operation already in progress. Please wait...");
        }
    } else if (ctx.update.callback_query.data == 'statustables') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else if (!ctx.session.getTableStatus) {
            ctx.session.getTableStatus = true;
            DB.Table.find({
                enabled: true,
                deleted: false
            }).sort({
                'name': 1
            }).exec((err, tables) => {
                if (err) {
                    console.error(err);
                    ctx.reply("DB error");
                } else {
                    ctx.reply(bot.formatTables(tables, ctx.session.user), {
                        parse_mode: "markdown"
                    });
                }
                ctx.session.getTableStatus = false;
            });
        } else {
            ctx.answerCbQuery("Operation already in progress. Please wait...");
        }
    } else if (ctx.update.callback_query.data == 'userswithoutorder') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else if (!ctx.session.getNotOrderUsers) {
            ctx.session.getNotOrderUsers = true;
            DB.getNotOrderUsers(null, (err, users) => {
                if (err) {
                    ctx.reply(err);
                } else {
                    ctx.reply(bot.formatUsersWithoutOrder(users, ctx.session.user), {
                        parse_mode: "markdown"
                    });
                }
                ctx.session.getNotOrderUsers = false;
            });
        } else {
            ctx.answerCbQuery("Operation already in progress. Please wait...");
        }
    } else if (ctx.update.callback_query.data.toLowerCase().indexOf('pint') != -1) {
        if (!ctx.session.addBeer) {
            beers.addBeer(ctx);
        } else {
            ctx.answerCbQuery("Operation already in progress. Please wait...");
        }
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;

function formatNews(news) {
    let text = "*Latest BTB News*\n",
        newsListLenght = 15,
        limit = news.length > newsListLenght ? newsListLenght : news.length;
    for (let i = 0; i < limit; i++) {
        let n = news[i],
            user = "[" + (n.owner.telegram.first_name + (n.owner.telegram.last_name ? (" " + n.owner.telegram.last_name) : "")) + "](tg://user?id=" + n.owner.telegram.id + ")";
        text += "\n_" + moment(n.createdAt).format('MMMM Do, HH:mm') + "_\n   " + user;
        if (n.points != undefined) {
            //slot stuff
            if (n.bet != undefined && n.bet == 0) {
                text += " got a free daily run and";
            }
            if (n.points < 0) {
                text += " lost " + (n.points * -1) + " slot points";
            } else {
                if (n.robbedUser != undefined) {
                    user = "[" + (n.robbedUser.telegram.first_name + (n.robbedUser.telegram.last_name ? (" " + n.robbedUser.telegram.last_name) : "")) + "](tg://user?id=" + n.robbedUser.telegram.id + ")";
                    text += " stole " + n.points + " beercoins from " + user;
                } else if (n.bombedUser != undefined) {
                    user = "[" + (n.bombedUser.telegram.first_name + (n.bombedUser.telegram.last_name ? (" " + n.bombedUser.telegram.last_name) : "")) + "](tg://user?id=" + n.bombedUser.telegram.id + ")";
                    text += " sent " + n.points + " bombs to " + user;
                } else {
                    text += " won " + n.points + " slot points"
                }
            }
        } else if (n.type != undefined) {
            //beer stuff
            text += " gave a beer to the bot"
            if (n.drunk) {
                text += " and made him drunk"
            }
        }
    }
    return text;
}

function sendNews(ctx) {

    console.log("News request from user: " + ctx.session.user.email)
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

    async.parallel(funList, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            const results = result[0].concat(result[1]);
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
            ctx.reply(formatNews(results), {
                parse_mode: "markdown"
            });
        }
    });
}