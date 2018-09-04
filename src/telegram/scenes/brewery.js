/**
 * brewery.js
 * Beer scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    beers = require("../beers"),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('brewery')
scene.enter((ctx) => {
    ctx.reply(keyboards.beer(ctx).text, keyboards.beer(ctx).opts).then(() => {

    });
});

scene.leave((ctx) => {
    deleteLastMessage(ctx);
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

    if (keyboards.beer(ctx)[ctx.message.text]) {
        keyboards.beer(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.beer(ctx).cmd.back) {
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
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (ctx.update.callback_query.data == "single") {
        beers.addBeer(ctx, "single");
    } else if (ctx.update.callback_query.data == "double") {
        beers.addBeer(ctx, "double");
    } else if (ctx.update.callback_query.data.indexOf("no") == 0) {
        deleteLastMessage(ctx);
    } else {
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;