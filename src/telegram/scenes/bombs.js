/**
 * bombs.js
 * Telegram Bot B-52 scene
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
    if (ctx.session.bombDropped == false) {
        ctx.reply("✖️ Mission aborted!");
    }
    ctx.scene.enter('shop');
}

function checkReEnter(ctx) {
    if (ctx.message) {
        if (ctx.message.text === "◀️ Back") {
            leave(ctx);
            return true;
        } else if (keyboards.shop(ctx).cmd.bombs == ctx.message.text) {
            deleteLastMessage(ctx);
            ctx.scene.enter('bombsWizard');
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
                        callback_data: "bombs_" + String(u._id)
                    };
                }),
                options = {
                    columns: 2,
                    pageSize: 6
                };
            ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
            ctx.reply("*B-52 Bomber!* 💣\nDrop bombs to your friends!", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    resize_keyboard: true,
                    keyboard: [
                        [{
                            text: "◀️ Back"
                        }]
                    ]
                })
            }).then(() => {
                ctx.reply("Select the recipient:", {
                    parse_mode: "markdown",
                    reply_markup: JSON.stringify({
                        inline_keyboard: ctx.session.users_inline_keyboard.render()
                    })
                }).then((m) => {
                    ctx.session.lastMessage = m;
                });
            });
        }
    });
}

function dropBombs(ctx) {
    const quantity = ctx.session.bombs.quantity,
        message = "*Oh no!*\n" + bot.getUserLink(ctx.session.user) + " just sent you *" + quantity + "* bomb" + (quantity > 1 ? "s" : "") + " 💣 !",
        bombUser = ctx.session.bombs.user;
    ctx.reply("✈️ Dropping *" + quantity + "* bomb" + (quantity > 1 ? "s" : "") + " to " + bot.getUserLink(bombUser) + "...", keyboards.shop(ctx).opts);
    ctx.telegram.sendMessage(bombUser.telegram.id, message, {
        parse_mode: "markdown"
    }).then(() => {
        levels.removePoints(ctx.session.user._id, quantity, true, (e, p) => {
            if (e) {
                ctx.reply("Something went wrong!");
                console.error(e);
                leave(ctx);
            } else {
                if (bombUser.backpack.shields > 0) {
                    //the selected user has a bomb shield!
                    ctx.answerCbQuery(bombUser.telegram.first_name + " is using a bomb shield!");
                    bombUser.backpack.shields -= 1;
                    bombUser.save((err) => {
                        if (err) {
                            ctx.reply("Something went wrong!");
                            console.error(err);
                            return leave(ctx);
                        }
                        //update user session
                        bot.session.setSessionParam(bombUser.telegram.id, "user.backpack.shields", bombUser.backpack.shields);
                        ctx.reply(bot.getUserLink(bombUser) + " used a bomb shield 🛡 !", {
                            parse_mode: "markdown"
                        });
                        levels.removePoints(ctx.session.user._id, quantity, false, (err, _points) => {
                            if (err) {
                                ctx.reply("Something went wrong!");
                                console.error(err);
                                return leave(ctx);
                            }
                            ctx.telegram.sendMessage(bombUser.telegram.id, "Your bomb shield neutralized " + bot.getUserLink(ctx.session.user) + "'s bombs.\n" + bot.getUserLink(ctx.session.user) + " lost " + quantity + " beercoins 😬 !", {
                                parse_mode: "markdown"
                            });
                            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                bot.broadcastMessage("User *" + ctx.session.user.email + "* dropped " + quantity + " bombs to *" + bombUser.email + "* but found a bombshield", accessLevels.root, null, true);
                            }
                            const bombEvent = new DB.BombEvent({
                                owner: ctx.session.user._id,
                                recipient: ctx.session.bombs.user._id,
                                quantity: ctx.session.bombs.quantity,
                                shield: true
                            });
                            bombEvent.save((err, s) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            ctx.session.bombDropped = true;
                            leave(ctx);
                        });
                    });
                } else {
                    // No protection
                    levels.removePoints(ctx.session.bombs.user._id, quantity, true, (err, _points) => {
                        if (err) {
                            ctx.reply("Something went wrong!");
                            console.error(err);
                            leave(ctx);
                        } else {
                            ctx.reply(bot.getUserLink(ctx.session.bombs.user) + " got your bomb" + (quantity > 1 ? "s" : "") + " 💣 !", keyboards.shop(ctx).opts);
                            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                bot.broadcastMessage("User *" + ctx.session.user.email + "* dropped " + quantity + " bomb" + (quantity > 1 ? "s" : "") + " to *" + ctx.session.bombs.user.email + "*", accessLevels.root, null, true);
                            }
                            const bombEvent = new DB.BombEvent({
                                owner: ctx.session.user._id,
                                recipient: ctx.session.bombs.user._id,
                                quantity: ctx.session.bombs.quantity
                            });
                            bombEvent.save((err, s) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            ctx.session.bombDropped = true;
                            leave(ctx);
                        }
                    });
                }
            }
        });
    });
}

function updateUsersKeyboard(ctx) {
    ctx.telegram.editMessageReplyMarkup(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, {
        inline_keyboard: ctx.session.users_inline_keyboard.render()
    });
}

function askQuantity(ctx, text) {
    text = (text ? (text + "\n\n") : "") + "How many *bombs* do you want to drop to " + bot.getUserLink(ctx.session.bombs.user) + "?";
    ctx.reply(text, {
        parse_mode: "markdown",
        reply_markup: JSON.stringify({
            remove_keyboard: true
        })
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

const bombsWizard = new WizardScene('bombsWizard',
    (ctx) => {
        if (ctx.session.user.points < 1) {
            ctx.reply("I'm sorry. You don't have enough beercoins.", {
                parse_mode: "markdown"
            });
            return leave(ctx);
        }
        ctx.session.bombDropped = false;
        ctx.session.bombs = {
            owner: ctx.session.user,
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
            } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query && ctx.update.callback_query.data.indexOf("bombs_") == 0) {
                const userID = ctx.update.callback_query.data.substring(6);
                deleteLastMessage(ctx);
                DB.User.findById(userID, (err, user) => {
                    if (err || !user) {
                        console.error(err || "BombUser not found");
                        ctx.reply("Something went wrong! User not found.");
                        return leave(ctx);
                    } else {
                        ctx.session.bombs.user = user;
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
                    //return askQuantity(ctx, "*Invalid value!*");
                    return leave(ctx);
                } else if (quantity < 1) {
                    return askQuantity(ctx, "*Ohh come on!*");
                } else if (ctx.session.user.points < quantity) {
                    return askQuantity(ctx, "*You don't have enough beercoins (" + quantity + ") !*");
                }
                ctx.session.bombs.quantity = quantity;
                let inline_keyboard = [
                        [{
                            text: 'Proceed',
                            callback_data: 'proceed'
                        }, {
                            text: 'Cancel',
                            callback_data: 'cancel'
                        }]
                    ],
                    text = "Are you sure to drop *" + quantity + "* bomb" + (quantity > 1 ? "s" : "") + " to " + bot.getUserLink(ctx.session.bombs.user) + "?";
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
                dropBombs(ctx);
            } else {
                leave(ctx);
            }
        }
    }
)
exports.bombs = bombsWizard;