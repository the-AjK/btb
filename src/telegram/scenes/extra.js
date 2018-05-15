/**
 * extra.js
 * Telegram Bot extra scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    schedule = require('node-schedule'),
    moment = require('moment'),
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

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }

    if (keyboards.extra(ctx)[ctx.message.text]) {
        keyboards.extra(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.extra(ctx).cmd.slot) {
        ctx.scene.enter('slot');
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
    ctx.deleteMessage(ctx.message_id);
    delete ctx.session.lastMessage;
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == 'statusorders') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else {
            DB.getDailyOrderStats(null, (err, stats) => {
                if (err) {
                    ctx.reply(err);
                } else {
                    ctx.reply("*Orders status*:" + bot.formatOrderComplete(stats), {
                        parse_mode: "markdown"
                    });
                }
            });
        }
    } else if (ctx.update.callback_query.data == 'statustables') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else {
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
            });
        }
    } else if (ctx.update.callback_query.data == 'userswithoutorder') {
        if (levels.getLevel(ctx.session.user.points) < 2 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            ctx.reply("Admin stuff. Keep out.");
            return;
        } else {
            DB.getNotOrderUsers(null, (err, users) => {
                if (err) {
                    ctx.reply(err);
                } else {
                    ctx.reply(bot.formatUsersWithoutOrder(users, ctx.session.user), {
                        parse_mode: "markdown"
                    });
                }
            });
        }
    } else if (ctx.update.callback_query.data.toLowerCase().indexOf('pint') != -1) {
        beers.addBeer(ctx);
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;