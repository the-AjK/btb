/**
 * extra.js
 * Telegram Bot extra scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
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
    if (ctx.session.handleMsg === true) {
        //if the manager is handling a previous message, discarn new messages
        return;
    }
    ctx.session.handleMsg = true;
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.extra(ctx)[ctx.message.text]) {
        keyboards.extra(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.slot) {
        ctx.scene.enter('slot');
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.roulette) {
        ctx.scene.enter('roulette');
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.shop) {
        ctx.scene.enter('shop');
    } else if (ctx.message.text == keyboards.slot(ctx).cmd.back) {
        //back from slot
        ctx.reply(keyboards.extra(ctx).text, keyboards.extra(ctx).opts);
        ctx.session.handleMsg = false;
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.back) {
        //back button
        ctx.scene.leave();
        ctx.reply('ACK', keyboards.btb(ctx).opts);
        ctx.session.handleMsg = false;
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
        if (levels.getLevel(ctx.session.user.points) < 2 && !checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
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
        if (levels.getLevel(ctx.session.user.points) < 2 && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
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
                    bot.formatTables(tables, ctx.session.user).then(text => {
                        ctx.reply(text, {
                            parse_mode: "markdown"
                        });
                    }, err => {
                        ctx.reply("Something went wrong!", {
                            parse_mode: "markdown"
                        });
                    });
                }
                ctx.session.getTableStatus = false;
            });
        } else {
            ctx.answerCbQuery("Operation already in progress. Please wait...");
        }
    } else if (ctx.update.callback_query.data == 'userswithoutorder') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
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
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;