/**
 * register.js
 * Telegram Bot register scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    validator = require('validator'),
    bot = require('../bot'),
    DB = require("../../db"),
    auth = require("../../auth"),
    keyboards = require('../keyboards'),
    roles = require("../../roles"),
    accessLevels = roles.accessLevels,
    ACTIONS = bot.ACTIONS;

const scene = new Scene('register')
scene.enter((ctx) => ctx.reply("Please type a valid email", {
    reply_markup: JSON.stringify({
        remove_keyboard: true
    })
}));

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }

    ctx.message.text = ctx.message.text.toLowerCase();

    if (validator.isEmail(ctx.message.text)) {
        ctx.session.email = ctx.message.text;
        let inline_keyboard = [
                [{
                    text: 'Confirm',
                    callback_data: 'confirm'
                }],
                [{
                    text: 'Cancel',
                    callback_data: 'cancel'
                }]
            ],
            text = "Confirm: *" + ctx.message.text + "*?";

        ctx.reply(text, {
            parse_mode: "markdown",
            force_reply: true,
            reply_markup: JSON.stringify({
                inline_keyboard: inline_keyboard
            })
        }).then((msg) => {
            //lets save the message to delete it afterward
            ctx.session.lastMessage = msg;
        });

    } else {
        ctx.reply("This is not a valid email, just sayin...\nRegistration unsuccessfull.", keyboards.register(ctx).opts);
        ctx.scene.leave();
    }
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {
    ctx.deleteMessage(ctx.message_id);
    delete ctx.session.lastMessage;
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == 'confirm') {
        registerUser(ctx);
    } else {
        ctx.reply("Registration aborted. See ya!", keyboards.register(ctx).opts);
        ctx.scene.leave();
    }
});

exports.scene = scene;

function registerUser(ctx) {
    const password = auth.saltHashPassword(ctx.from.id.toString()),
        newTelegramUser = new DB.User({
            username: ctx.from.username || ctx.from.first_name || ctx.from.id.toString(),
            salt: password.salt,
            password: password.hash,
            email: ctx.session.email,
            telegram: ctx.from
        });
    newTelegramUser.save((err, newUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Registration unsuccessfull.\nContact the administrator.", keyboards.register(ctx).opts);
            bot.broadcastMessage(
                "New user error: " + err,
                accessLevels.admin
            );
            ctx.scene.leave();
            return;
        }
        if (roles.checkUserAccessLevel(newUser.role, accessLevels.root)) {
            //ROOT user
            ctx.reply("ROOT Registration successfull.", keyboards.btb(ctx).opts);
            bot.broadcastMessage(
                "New ROOT user: " + bot.getUserLink(newUser),
                accessLevels.root
            );
        } else {
            //Non root users
            ctx.reply("Registration successfull.\nThe admin should enable your account soon. Please wait.");
            bot.broadcastMessage(
                "New pending user: " + bot.getUserLink(newUser) + " (" + newUser.email + ")",
                accessLevels.admin
            );
        }

        ctx.scene.leave();
    });
}