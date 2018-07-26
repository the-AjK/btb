/**
 * nim.js
 * Nim scene
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

class Nim {

    constructor(player1) {
        this._p1 = player1;
        this._element = "🍺";
    }

    setOpponent(opponent) {
        this._p2 = opponent;
    }
}

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function startGame(ctx) {
    console.log("Game start");
    console.log(ctx.session.nim._p1)
    console.log(ctx.session.nim._p2)

    //TODO send p2 request
    ctx.reply("Waiting for *" + ctx.session.nim._p2.telegram.first_name + "*...\ndo not exit.", {
        parse_mode: "markdown"
    }).then((m) => {
        
    });

    let text = "*NIM* players set:\n" + ctx.session.nim._p1.telegram.first_name + " *VS* " +  ctx.session.nim._p2.telegram.first_name;
    ctx.reply("Select your opponent:", {
        parse_mode: "markdown"
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

const scene = new Scene('nim')
scene.enter((ctx) => {
    ctx.session.nim = new Nim(ctx.session.user);
    ctx.reply(keyboards.nim(ctx).text, keyboards.nim(ctx).opts).then(() => {
        ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
        DB.User.find({
            "telegram.enabled": true,
            "telegram.banned": false,
            deleted: false
        }, (err, users) => {
            if (err) {
                console.error(err);
            } else {
                let data = users.map(u => {
                        return {
                            text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : ""),
                            callback_data: "user_" + String(u.telegram.id)
                        };
                    }),
                    options = {
                        columns: 2,
                        pageSize: 6
                    };
                ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
                ctx.reply("Select your opponent:", {
                    parse_mode: "markdown",
                    reply_markup: JSON.stringify({
                        inline_keyboard: ctx.session.users_inline_keyboard.render()
                    })
                }).then((m) => {
                    ctx.session.lastMessage = m;
                    ctx.session.handleMsg = false;
                });
            }
        });
    });
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.nim(ctx)[ctx.message.text]) {
        keyboards.nim(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.nim(ctx).cmd.back) {
        //back button
        ctx.scene.leave();
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

function updateUsersKeyboard(ctx) {
    ctx.telegram.editMessageReplyMarkup(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, {
        inline_keyboard: ctx.session.users_inline_keyboard.render()
    });
}

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.previousCallbackData()) {
        ctx.session.users_inline_keyboard.previous();
        updateUsersKeyboard(ctx);
    } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.nextCallbackData()) {
        ctx.session.users_inline_keyboard.next();
        updateUsersKeyboard(ctx);
    } else if (ctx.update.callback_query.data.indexOf("user_") == 0) {
        const userTelegramID = parseInt(ctx.update.callback_query.data.substring(5));
        if (isNaN(userTelegramID)) {
            console.error("Wrong callback data");
            return ctx.answerCbQuery("Something went wrong!");
        }
        DB.User.findOne({
            "telegram.id": userTelegramID
        }, (err, opponent) => {
            if (err || !opponent) {
                console.error(err || "Nim user not found");
                return ctx.answerCbQuery("Something went wrong!");
            }
            ctx.session.nim.setOpponent(opponent);
            deleteLastMessage(ctx);
            startGame(ctx);
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;