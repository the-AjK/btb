/**
 * trade.js
 * Telegram Bot trade scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const WizardScene = require('telegraf/scenes/wizard'),
    keyboards = require('../keyboards'),
    PaginatedInlineKeyboard = require("../tools/paginatedInlineKeyboard").PaginatedInlineKeyboard,
    roles = require("../../roles"),
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require('../bot'),
    levels = require("../../levels"),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function leave(ctx) {
    deleteLastMessage(ctx);
    ctx.scene.enter('shop');
}

function checkReEnter(ctx) {
    if (ctx.message) {
        if (keyboards.shop(ctx).cmd.trade == ctx.message.text) {
            deleteLastMessage(ctx);
            ctx.scene.enter('tradeWizard');
            return true;
        }
    }
    return false;
}

function selectUser(ctx) {
    deleteLastMessage(ctx);
    DB.User.find({
        "_id": {
            "$ne": ctx.session.user._id
        },
        "telegram.enabled": true,
        "telegram.banned": false,
        deleted: false
    }, (err, users) => {
        if (err) {
            ctx.reply("Something went wrong!");
            console.error(err);
        } else {
            let data = users.map(u => {
                    return {
                        text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : "") + " (" + u.points + ")",
                        callback_data: "tradebeercoins_" + String(u._id)
                    };
                }),
                options = {
                    columns: 2,
                    pageSize: 6
                };
            ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
            ctx.reply("*Beercoins trading!* 💰\nSend beercoins to your friends!\nSelect the recipient:", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: ctx.session.users_inline_keyboard.render()
                })
            }).then((m) => {
                ctx.session.lastMessage = m;
            });
        }
    });
}

function sendBeerCoins(ctx) {
    const quantity = ctx.session.trade.quantity,
        message = "*Lucky you!*\n" + bot.getUserLink(ctx.session.user) + " just sent you *" + quantity + "* beercoin" + (quantity > 1 ? "s" : "") + " 💰 !";
    ctx.reply("Sending *" + quantity + "* beercoin" + (quantity > 1 ? "s" : "") + " to " + bot.getUserLink(ctx.session.trade.user) + "...", keyboards.shop(ctx).opts);
    ctx.telegram.sendMessage(ctx.session.trade.user.telegram.id, message, {
        parse_mode: "markdown"
    }).then(() => {
        levels.removePoints(ctx.session.user._id, quantity, true, (e, p) => {
            if (e) {
                ctx.reply("Something went wrong!");
                console.error(e);
                leave(ctx);
            } else {
                levels.addPoints(ctx.session.trade.user._id, quantity, true, (err, _points) => {
                    if (err) {
                        ctx.reply("Something went wrong!");
                        console.error(err);
                    } else {
                        ctx.reply(bot.getUserLink(ctx.session.trade.user) + " got your beercoin" + (quantity > 1 ? "s" : "") + " 💰 !", keyboards.shop(ctx).opts);
                        if (!checkUser(ctx.session.user.role, userRoles.root)) {
                            bot.broadcastMessage("User *" + ctx.session.user.email + "* sent " + quantity + " beercoin" + (quantity > 1 ? "s" : "") + " to *" + ctx.session.trade.user.email + "*", accessLevels.root, null, true);
                        }
                        const tradeEvent = new DB.TradeEvent({
                            owner: ctx.session.user._id,
                            recipient: ctx.session.trade.user._id,
                            quantity: ctx.session.trade.quantity
                        });
                        tradeEvent.save((err, s) => {
                            if (err) {
                                console.error(err);
                            }
                        });
                    }
                    leave(ctx);
                });
            }
        });
    });
}


function updateUsersKeyboard(ctx) {
    ctx.telegram.editMessageReplyMarkup(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, {
        inline_keyboard: ctx.session.users_inline_keyboard.render()
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

function askQuantity(ctx, text) {
    text = (text ? (text + "\n\n") : "") + "How many *beercoins* do you want to " + (ctx.session.trade.type == 0 ? "send" : "receive") + " to " + bot.getUserLink(ctx.session.trade.user) + "?";
    ctx.reply(text, {
        parse_mode: "markdown",
        reply_markup: JSON.stringify({
            remove_keyboard: true
        })
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

const tradeWizard = new WizardScene('tradeWizard',
    (ctx) => {
        if (ctx.session.user.points < 1) {
            ctx.reply("I'm sorry. You don't have enough beercoins.", {
                parse_mode: "markdown"
            });
            return leave(ctx);
        }
        //TODO select send or receive options
        ctx.session.trade = {
            owner: ctx.session.user,
            type: 0, //0-send, 1-receive
            user: null,
            quantity: 0
        };
        selectUser(ctx);
        return ctx.wizard.next();
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else {
            if (ctx.session.users_inline_keyboard && ctx.update.callback_query && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.previousCallbackData()) {
                ctx.session.users_inline_keyboard.previous();
                updateUsersKeyboard(ctx);
            } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.nextCallbackData()) {
                ctx.session.users_inline_keyboard.next();
                updateUsersKeyboard(ctx);
            } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query && ctx.update.callback_query.data.indexOf("tradebeercoins_") == 0) {
                const userID = ctx.update.callback_query.data.substring(15);
                deleteLastMessage(ctx);
                DB.User.findById(userID, (err, user) => {
                    if (err || !user) {
                        console.error(err || "TradeUser not found");
                        ctx.reply("Something went wrong! User not found.");
                        return leave(ctx);
                    } else {
                        ctx.session.trade.user = user;
                        askQuantity(ctx);
                        return ctx.wizard.next();
                    }
                });
            } else {
                leave(ctx);
            }
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else {
            if (ctx.message.text) {
                const quantity = parseInt(ctx.message.text);
                deleteLastMessage(ctx);
                if (isNaN(quantity)) {
                    return askQuantity(ctx, "*Invalid value!*");
                } else if (quantity < 1) {
                    return askQuantity(ctx, "*Ohh come on!*");
                } else if (ctx.session.user.points < quantity) {
                    return askQuantity(ctx, "*You don't have enough beercoins (" + quantity + ") !*");
                }
                ctx.session.trade.quantity = quantity;
                let inline_keyboard = [
                        [{
                            text: 'Proceed',
                            callback_data: 'proceed'
                        }, {
                            text: 'Cancel',
                            callback_data: 'cancel'
                        }]
                    ],
                    text = "Are you sure to send *" + quantity + "* beercoin" + (quantity > 1 ? "s" : "") + " to " + bot.getUserLink(ctx.session.trade.user) + "?";
                ctx.reply(text, {
                    parse_mode: "markdown",
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    ctx.session.lastMessage = msg;
                    return ctx.wizard.next();
                });
            } else {
                leave(ctx);
            }
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else {
            deleteLastMessage(ctx);
            if (ctx.update.callback_query && ctx.update.callback_query.data == "proceed") {
                sendBeerCoins(ctx);
            } else {
                ctx.reply("✖️ Operation aborted!");
                leave(ctx);
            }
        }
    }
)
exports.trade = tradeWizard;