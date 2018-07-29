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
            counter: 60 //global starting counter
        };
        this.startCounter = 0 //step starting counter
        this.counter = 0 //actual counter,
        this.damage = 1 //hp damage level
        this.maxDamage = 5
    }

    startTimer(c) {
        this.counter = c;
        if (this.interval)
            clearInterval(this.interval);
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
        this.clearMessages();
        this.ctx.telegram.sendMessage(this.owner.telegram.id, this.getCountdownText(), {
            parse_mode: "markdown"
        }).then((m) => {
            if (this.countdownMessage)
                this.ctx.deleteMessage(this.countdownMessage.message_id);
            this.countdownMessage = m;

            let query = {
                "telegram.enabled": true,
                "telegram.banned": false,
                deleted: false
            };
            //add potato owner to the user list only if we are under 10seconds countdown
            if (this.startCounter >= 10) {
                query._id = {
                    "$ne": this.owner._id
                }
            }

            DB.User.find(query, (err, users) => {
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
                        if (this.keyboardMessage) {
                            this.ctx.deleteMessage(this.keyboardMessage.message_id);
                        }
                        this.keyboardMessage = k;
                    });
                }
            });
        }, (err) => {
            console.error(err);
        });
    }

    sendCountdown() {
        this.ctx.telegram.sendMessage(this.owner.telegram.id, this.getCountdownText(), {
            parse_mode: "markdown"
        }).then((m) => {
            if (this.countdownMessage)
                this.ctx.deleteMessage(this.countdownMessage.message_id);
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
                if (this.throwMessage) {
                    this.ctx.deleteMessage(this.throwMessage.message_id);
                }
                this.throwMessage = m2;
                this.startTimer(this.startCounter);
            }, (err) => {
                console.error(err);
            });
        }, (err) => {
            console.error(err);
        });
    }

    startGame(ctx) {
        this.ctx = ctx;
        this.startPlayer = ctx.session.user;
        this.owner = ctx.session.user;
        this.history = [];
        this.isRunning = true;
        this.countdownMessage = null;
        this.throwMessage = null;
        this.keyboardMessage = null;
        this.startCounter = this.config.counter;
        this.counter = this.startCounter;
        this.damage = 1; // start with first degree burns
        this.sendCountdown();
        console.log("HP Start: " + this.owner.email);
    }

    clearMessages() {
        if (this.countdownMessage) {
            this.ctx.telegram.deleteMessage(this.countdownMessage.chat.id, this.countdownMessage.message_id);
            delete this.countdownMessage;
        }
        if (this.keyboardMessage) {
            this.ctx.telegram.deleteMessage(this.keyboardMessage.chat.id, this.keyboardMessage.message_id);
            delete this.keyboardMessage;
        }
        if (this.throwMessage) {
            this.ctx.telegram.deleteMessage(this.throwMessage.chat.id, this.throwMessage.message_id);
            delete this.throwMessage;
        }
    }

    stopGame() {
        clearInterval(this.interval);
        this.clearMessages();
        let fromUserText = "";
        if (this.history.length && this.history[this.history.length - 1].owner.email != this.owner.email) {
            fromUserText += " from " + bot.getUserLink(this.history[this.history.length - 1].owner);
        }
        this.ctx.telegram.sendMessage(this.owner.telegram.id, "You didn't throw the *Hot Potato*" + fromUserText + " and got burned! 🔥", {
            parse_mode: "markdown"
        }).then(() => {
            levels.removePoints(this.owner._id, this.damage, false, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    this.history.push({
                        createdAt: moment().format(),
                        owner: this.owner,
                        counter: this.counter,
                        damage: this.damage
                    });
                    const event = new DB.HPEvent({
                        owner: this.startPlayer,
                        history: this.history
                    });
                    event.save((err, s) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    //Send notifications to the other players
                    const burnedUserLink = bot.getUserLink(this.owner),
                        usersNotified = [this.owner.email];
                    for (let i = 0; i < this.history.length; i++) {
                        if (usersNotified.indexOf(this.history[i].owner.email) < 0) {
                            usersNotified.push(this.history[i].owner.email);
                            this.ctx.telegram.sendMessage(this.history[i].owner.telegram.id, burnedUserLink + " didn't throw the *Hot Potato* and got burned! 😂", {
                                parse_mode: "markdown"
                            });
                        }
                    }
                }
                console.log("HP End: " + this.owner.email);
                this.isRunning = false;
                bot.leaveScene(this.ctx, true);
            });
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
        this.clearMessages();
        if (user.email != this.owner.email) {
            this.ctx.reply(bot.getUserLink(user) + " received your *Hot Potato* 🥔 !\n*" + this.counter + " seconds* more and you would have burned!\nGood work!", {
                parse_mode: "markdown"
            });
            bot.leaveScene(this.ctx, true);
        }

        //incresase damage level
        if (this.damage < this.maxDamage) {
            this.damage += 1;
        }

        //New user
        this.owner = user;
        //setup counters
        if (this.startCounter > 10) {
            this.startCounter -= 10;
        } else if (this.startCounter > 5) {
            this.startCounter = 5;
        }
        this.counter = this.startCounter;
        this.sendCountdown();
        console.log("HP Switch: " + this.owner.email);
    }

    getBurningLevel() {
        let text = "*" + this.damage + "* ";
        for (let i = 0; i < this.maxDamage; i++) {
            if (i < this.damage) {
                text += "🔥"
            }
        }
        return text;
    }

    getCountdownText() {
        const icon = this.counter % 2 ? "🔥" : "🥔";
        let text = icon + " *Hot Potato*, pass it on, pass it on, hot potato, pass it on before you burn yourself!";
        if (this.history.length && this.history[this.history.length - 1].owner.email != this.owner.email) {
            text += "\n" + bot.getUserLink(this.history[this.history.length - 1].owner) + " threw the hot potato at you!";
        }
        text += "\n\n" + "Burning level: " + this.getBurningLevel();
        text += "\nYou will get burn in *" + this.counter + " second" + (this.counter > 1 ? "s" : "") + "*!";
        return text;
    }

}

const HotPotato = new HP(),
    hpPrice = 5; //5beercoins

const scene = new Scene('hp')
scene.enter((ctx) => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.user.points < hpPrice && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        ctx.reply("I'm sorry. You don't have enough beercoins.");
        return ctx.scene.enter('shop', {}, true);
    } else if (HotPotato.isRunning) {
        ctx.reply("The *Hot Potato* is still bouncing in " + bot.getUserLink(HotPotato.owner) + "'s hands!\nPlease wait until the game ends!", {
            parse_mode: "markdown"
        });
        return ctx.scene.enter('shop', {}, true);
    }
    if (checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        HotPotato.startGame(ctx);
    } else {
        levels.removePoints(ctx.session.user._id, hpPrice, true, (err) => {
            if (err) {
                console.error(err);
                ctx.reply("Something went wrong!");
                return ctx.scene.enter('shop', {}, true);
            } else {
                //point removed, lets proceed and start the game
                HotPotato.startGame(ctx);
            }
        });
    }
});


function textManager(ctx) {
    //nothing to do
}

scene.on("text", textManager);

function updateUsersKeyboard(ctx) {
    ctx.telegram.editMessageReplyMarkup(HotPotato.keyboardMessage.chat.id, HotPotato.keyboardMessage.message_id, null, {
        inline_keyboard: HotPotato.users_inline_keyboard.render()
    });
}

exports.handleHP = (ctx) => {
    if (!HotPotato.isRunning)
        return;
    if (!ctx.scene || ctx.scene.current.id != 'hp')
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