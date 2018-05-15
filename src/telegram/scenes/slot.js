/**
 * slot.js
 * Slot scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    utils = require('../../utils'),
    beers = require('../beers'),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

const elements = ["🚼", "🚱", "💯", "⚛", "📦", "💰", "💎", "🚀", "🎯", "🎰", "🎱", "☕️", "🍔", "☠️", "⭐️", "⚡️", "🍟", "🌭", "🍕", "🍖", "🍤", "🍣", "🍦", "🍿", "🍫", "🍩", "🍺"];

const slot = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""]
];

function setRow(row) {
    row[0] = elements[Math.round(utils.getRandomInt(0, elements.length))];
    row[1] = elements[Math.round(utils.getRandomInt(0, elements.length))];
    row[2] = elements[Math.round(utils.getRandomInt(0, elements.length))];
}

function initSlot() {
    for (let i = 0; i < slot.length; i++) {
        setRow(slot[i]);
    }
}

const scene = new Scene('slot')
scene.enter((ctx) => {
    ctx.reply(keyboards.slot(ctx).text, keyboards.slot(ctx).opts).then(() => {
        initSlot();
        const slotMachine =
            "\n____________________________________" +
            "\n| " + slot[0][0] + " | " + slot[0][1] + " | " + slot[0][2] + " | " +
            "\n| " + slot[1][0] + " | " + slot[1][1] + " | " + slot[1][2] + " | " +
            "\n| " + slot[2][0] + " | " + slot[2][1] + " | " + slot[2][2] + " | " +
            "\n____________________________________";
        bot.typingEffect(ctx, "Feeling lucky?", (err, m) => {
            ctx.reply(slotMachine, {}).then(() => {

            });
        });
    });
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }

    if (keyboards.settings(ctx)[ctx.message.text]) {
        keyboards.settings(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.settings(ctx).cmd.reminders) {
        ctx.reply(keyboards.reminders(ctx).text, keyboards.reminders(ctx).opts);
    } else if (keyboards.reminders(ctx)[ctx.message.text]) {
        keyboards.reminders(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.settings(ctx).cmd.about) {
        ctx.reply(generateAbout(ctx), {
            parse_mode: "markdown",
            disable_web_page_preview: true
        });
    } else if (ctx.message.text == keyboards.reminders(ctx).cmd.back) {
        //back from reminders
        ctx.reply(keyboards.settings(ctx).text, keyboards.settings(ctx).opts);
    } else if (ctx.message.text == keyboards.settings(ctx).cmd.back) {
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
    if (ctx.update.callback_query.data == 'dailymenuoff') {
        setDailyMenuSetting(ctx, false);
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;