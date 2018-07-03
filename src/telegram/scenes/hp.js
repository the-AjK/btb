/**
 * hp.js
 * HotPotato game
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    moment = require("moment"),
    PaginatedInlineKeyboard = require("../tools/paginatedInlineKeyboard").PaginatedInlineKeyboard,
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    utils = require('../../utils'),
    DB = require("../../db"),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

class HP {

    constructor() {
        this.isRunning = false;
        this.config = {
            counter: 10
        };
        this.counter = 10
    }

    startTimer(c) {
        this.counter = c;
        this.interval = setInterval(() => {
            if (this.counter == 0)
                return this.stopGame();
            if (this.counter > 0)
                this.counter -= 1;
            if (this.countdownMessage) {
                this.ctx.telegram.editMessageText(this.countdownMessage.chat.id, this.countdownMessage.message_id, null, this.getCountdownText(), {
                    parse_mode: "markdown"
                }).then(m => {
                    //all ok
                }, (err) => {
                    console.error(err);
                });
            }
        }, 1000);
    }

    handleHP(ctx) {
        this.ctx = ctx;
        if (this.throwMessage) {
            ctx.deleteMessage(this.throwMessage.message_id);
            delete this.throwMessage;
        }
        DB.User.find({
            "_id": {
                "$ne": this.owner._id
            },
            "telegram.enabled": true,
            "telegram.banned": false,
            deleted: false
        }, (err, users) => {
            if (err) {
                console.error(err);
                this.ctx.answerCbQuery("Something went wrong!");
                return bot.leaveScene(this.ctx, true);
            } else {
                utils.shuffle(users);
                const data = users.map(u => {
                    return {
                        text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : ""),
                        callback_data: "user_" + String(u.telegram.id)
                    };
                });
                this.users_inline_keyboard = new PaginatedInlineKeyboard(data, {
                    columns: 2,
                    pageSize: 6
                });
                this.ctx.reply("Who do you want to send it to?", {
                    parse_mode: "markdown",
                    reply_markup: JSON.stringify({
                        inline_keyboard: this.users_inline_keyboard.render()
                    })
                }).then((k) => {
                    this.keyboardMessage = k;
                });
            }
        });
    }

    sendCountdown() {
        this.ctx.telegram.sendMessage(this.owner.telegram.id, this.getCountdownText(), {
            parse_mode: "markdown"
        }).then((m) => {
            this.countdownMessage = m;
            this.ctx.telegram.sendMessage(this.owner.telegram.id, "*Hurry up!* Throw it away 🥔 !", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{
                            text: 'Throw it!',
                            callback_data: 'throwhp'
                        }]
                    ]
                })
            }).then(m2 => {
                this.throwMessage = m2;
                this.startTimer(this.config.counter);
            });
        });
    }

    startGame(ctx) {
        this.ctx = ctx;
        this.owner = ctx.session.user;
        this.history = [];
        this.isRunning = true;
        this.countdownMessage = null;
        this.throwMessage = null;
        this.keyboardMessage = null;
        this.sendCountdown();
        console.log("GAME Start " + this.owner.email);
    }

    stopGame() {
        if (this.interval)
            clearInterval(this.interval);
        this.ctx.deleteMessage(this.countdownMessage.message_id);
        delete this.countdownMessage;
        if (this.throwMessage) {
            this.ctx.deleteMessage(this.throwMessage.message_id);
            delete this.throwMessage;
        }
        if (this.keyboardMessage) {
            this.ctx.deleteMessage(this.keyboardMessage.message_id);
            delete this.keyboardMessage;
        }
        this.ctx.telegram.sendMessage(this.owner.telegram.id, "Ouch! You got burned! 🔥", {
            parse_mode: "markdown"
        }).then(() => {
            //TODO remove points to 
            //TODO save event with history
            console.log("GAME OVER " + this.owner.email);
            this.isRunning = false;
            bot.leaveScene(this.ctx, true);
        });
    }

    nextPlayer(user) {
        if (this.interval)
            clearInterval(this.interval);
        this.history.push({
            createdAt: moment().format(),
            owner: this.owner,
            counter: this.counter
        });
        this.ctx.deleteMessage(this.countdownMessage.message_id);
        delete this.countdownMessage;
        this.ctx.deleteMessage(this.keyboardMessage.message_id);
        delete this.keyboardMessage;
        this.ctx.reply(bot.getUserLink(user) + " received the *Hot Potato* 🥔 !\nGood work!", {
            parse_mode: "markdown"
        });

        bot.leaveScene(this.ctx, true);
        //New user
        this.owner = user;
        this.sendCountdown();
        console.log("GAME switch " + this.owner.email);

    }

    getCountdownText() {
        return "🔥 *Hot potato*, pass it on, pass it on, pass it on, hot potato, pass it on before you burn yourself!" +
            "\n\nYou will get burn in *" + this.counter + " second" + (this.counter > 1 ? "s" : "") + "*!";
    }

}

const HotPotato = new HP();

const scene = new Scene('hp')
scene.enter((ctx) => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    //TODO check credits and remove them
    console.log('start hp ' + ctx.scene.state.backTo)

    if (HotPotato.isRunning) {
        ctx.reply("The Hot Potato is still bouncing in " + bot.getUserLink(HotPotato.owner) + "'s hands!\nPlease wait until the game ends!", {
            parse_mode: "markdown"
        });
        return ctx.scene.enter('shop', {}, true);
    }

    HotPotato.startGame(ctx);

});


function textManager(ctx) {
    //nothing to do
}

scene.on("text", textManager);

function updateUsersKeyboard(ctx) {
    ctx.telegram.editMessageReplyMarkup(HotPotato.keyboard.chat.id, HotPotato.keyboard.message_id, null, {
        inline_keyboard: HotPotato.users_inline_keyboard.render()
    });
}

exports.handleHP = (ctx) => {
    bot.enterScene(ctx, 'hp', true);
    HotPotato.handleHP(ctx);
}

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (HotPotato.users_inline_keyboard && ctx.update.callback_query.data == HotPotato.users_inline_keyboard.previousCallbackData()) {
        HotPotato.users_inline_keyboard.previous();
        updateUsersKeyboard(ctx);
    } else if (HotPotato.users_inline_keyboard && ctx.update.callback_query.data == HotPotato.users_inline_keyboard.nextCallbackData()) {
        HotPotato.users_inline_keyboard.next();
        updateUsersKeyboard(ctx);
    } else if (ctx.update.callback_query.data === "throwhp") {
        HotPotato.handleHP(ctx);
    } else if (ctx.update.callback_query.data.indexOf("user_") == 0) {
        const userTelegramID = parseInt(ctx.update.callback_query.data.substring(5));
        if (isNaN(userTelegramID)) {
            console.error("Wrong callback data");
            ctx.answerCbQuery("Something went wrong!");
            return bot.leaveScene(this.ctx, true);
        }
        DB.User.findOne({
            "telegram.id": userTelegramID
        }, (err, nextPlayer) => {
            if (err || !nextPlayer) {
                console.error(err || "HP user not found");
                ctx.answerCbQuery("Something went wrong!");
                return bot.leaveScene(this.ctx, true);
            }
            HotPotato.nextPlayer(nextPlayer);
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;