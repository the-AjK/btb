/**
 * order.js
 * Telegram Bot order scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require("moment"),
    md5 = require('md5'),
    mongoose = require("mongoose"),
    Scene = require('telegraf/scenes/base'),
    WizardScene = require('telegraf/scenes/wizard'),
    keyboards = require('../keyboards'),
    ReadWriteLock = require('rwlock'),
    manager = require('../../manager'),
    roles = require("../../roles"),
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require('../bot'),
    levels = require("../../levels"),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

let ordersLock = new ReadWriteLock();

exports.getOrdersLock = function () {
    return ordersLock;
}

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function leave(ctx, force_exit) {
    deleteLastMessage(ctx);
    if (force_exit) {
        ctx.scene.leave();
        return ctx.reply("✖️ You have already placed an order", keyboards.btb(ctx).opts);
    }
    DB.getDailyUserOrder(null, ctx.session.user._id, (err, dailyOrder) => {
        let msg = "✅ *Order confirmed!*";
        if (err) {
            console.error(err);
            msg = 'Something went wrong!';
        } else if (!dailyOrder) {
            msg = "✖️ Order not placed";
        }
        ctx.scene.leave();
        ctx.reply(msg, keyboards.btb(ctx).opts);
    });
}

function checkReEnter(ctx) {
    if (ctx.message) {
        if (keyboards.order.cmd.first == ctx.message.text) {
            deleteLastMessage(ctx);
            ctx.scene.enter('firstCourseWizard');
            return true;
        } else if (keyboards.order.cmd.second == ctx.message.text) {
            deleteLastMessage(ctx);
            ctx.scene.enter('secondCourseWizard');
            return true;
        }
    }
    return false;
}


function sendTables(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    ordersLock.writeLock('order', function (release) {
        DB.getTablesStatus(null, (err, tables) => {
            if (err) {
                console.error(err);
                ctx.reply("DB error ehm");
                release();
                return leave(ctx);
            } else {
                //lets find the available tables
                let inline_keyboard = ctx.session.dailyMenu.tables.map((t) => {
                    let usedSeats = tables[t._id] ? tables[t._id].used : 0;
                    return [{
                        text: t.name + " [" + usedSeats + "/" + t.seats + "]",
                        callback_data: t._id
                    }]
                });
                //sort by table name
                inline_keyboard.sort((t1, t2) => (t1[0].text).localeCompare(t2[0].text))
                ctx.reply("Available tables:", {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
                release();
            }
        });
    });
}

const firstCourseWizard = new WizardScene('firstCourseWizard',
    (ctx) => {
        let inline_keyboard = ctx.session.dailyMenu.firstCourse.items.map((fc) => {
            return [{
                text: fc.value,
                callback_data: md5(fc.value)
            }]
        });
        if (!inline_keyboard.length) {
            return leave(ctx);
        }
        //clear previous order draft in case user enter again in this schene
        ctx.session.order.firstCourse = {
            item: undefined,
            condiment: undefined
        };
        ctx.session.order.secondCourse = {
            item: undefined,
            sideDishes: []
        };
        ctx.reply("Available first courses:", {
            parse_mode: "markdown",
            remove_keyboard: true,
            reply_markup: JSON.stringify({
                inline_keyboard: inline_keyboard,
                remove_keyboard: true
            })
        }).then((msg) => {
            //lets save the message to delete it afterward
            ctx.session.lastMessage = msg;
        });
        return ctx.wizard.next()
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.availableFirstCourses.map(fc => md5(fc)).indexOf(ctx.update.callback_query.data) >= 0) {
            let choosenFC = "";
            ctx.session.dailyMenu.availableFirstCourses.map(fc => {
                if (md5(fc) == ctx.update.callback_query.data) {
                    choosenFC = fc;
                }
            });
            if (ctx.session.lastMessage) {
                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "First course: *" + choosenFC + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.firstCourse.item = choosenFC;
            //lets find the firstCourse condiments
            let inline_keyboard = []
            for (let i = 0; i < ctx.session.dailyMenu.firstCourse.items.length; i++) {
                if (ctx.session.dailyMenu.firstCourse.items[i].value == choosenFC) {
                    inline_keyboard = ctx.session.dailyMenu.firstCourse.items[i].condiments.map((c) => {
                        return [{
                            text: c,
                            callback_data: md5(c)
                        }]
                    });
                    break;
                }
            }
            //if there are condiments
            if (inline_keyboard.length) {
                ctx.reply("Available condiments:", {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard,
                        remove_keyboard: true
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
                return ctx.wizard.next()
            } else {
                //If there are no condiments, skip
                sendTables(ctx);
                ctx.wizard.next();
                ctx.wizard.next();
            }
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.availableCondiments.map(c => md5(c)).indexOf(ctx.update.callback_query.data) >= 0) {
            let choosenC = "";
            ctx.session.dailyMenu.availableCondiments.map(c => {
                if (md5(c) == ctx.update.callback_query.data) {
                    choosenC = c;
                }
            });
            if (ctx.session.lastMessage) {
                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Condiment: *" + choosenC + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.firstCourse.condiment = choosenC;
            sendTables(ctx);
            ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.tables.map((t) => new mongoose.Types.ObjectId(t._id).toHexString()).indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.lastMessage) {
                let tableName = "";
                ctx.session.dailyMenu.tables.map((t) => {
                    if (t._id == ctx.update.callback_query.data)
                        tableName = t.name
                })
                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Table: *" + tableName + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.table = ctx.update.callback_query.data;
            ctx.reply("Confirm order?", {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{
                            text: "Confirm",
                            callback_data: 'confirm'
                        }],
                        [{
                            text: "Cancel",
                            callback_data: 'cancel'
                        }]
                    ]
                })
            }).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
            return ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.update.callback_query.data == 'confirm') {
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            ordersLock.writeLock('order', function (release) {

                //reload the daily menu in case something has been changed
                DB.getDailyMenu(null, (err, m) => {
                    if (err) {
                        console.error(err);
                        ctx.reply("DB menu error ehm");
                        release();
                        return leave(ctx);
                    }
                    ctx.session.dailyMenu = m;

                    //check order consistency
                    delete ctx.session.order.secondCourse;
                    const orderError = manager.validateOrder(ctx.session.order, ctx.session.dailyMenu);
                    if (orderError != null) {
                        ctx.reply(orderError);
                        release();
                        return leave(ctx);
                    }

                    //Deadline check
                    if (!moment().isBefore(moment(ctx.session.dailyMenu.deadline))) {
                        let text = "*Time is up!*\nYou can't place any order after the deadline (" + moment(ctx.session.dailyMenu.deadline).format("HH:mm") + ")";
                        if (ctx.session.lastMessage) {
                            ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                parse_mode: "markdown"
                            });
                            delete ctx.session.lastMessage;
                        } else {
                            ctx.reply(text, {
                                parse_mode: "markdown"
                            });
                        }
                        release();
                        leave(ctx);
                        return;
                    }
                    DB.getTablesStatus(null, (err, tables) => {
                        if (err) {
                            console.error(err);
                            ctx.reply("DB error ehm");
                            release();
                            return leave(ctx);
                        } else if (tables[ctx.session.order.table].used >= tables[ctx.session.order.table].total) {
                            let tableName = tables[ctx.session.order.table].name,
                                text = "Somebody was faster than you!\n*" + tableName + "* is full. Try again.";
                            if (ctx.session.lastMessage) {
                                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                    parse_mode: "markdown"
                                });
                                delete ctx.session.lastMessage;
                            } else {
                                ctx.reply(text, {
                                    parse_mode: "markdown"
                                });
                            }
                            release();
                            return ctx.scene.enter('order');
                        } else {
                            const newOrder = new DB.Order(ctx.session.order);
                            newOrder.save((err, order) => {
                                if (err) {
                                    console.error(err);
                                    release();
                                    return leave(ctx, true); //force exit
                                } else if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                    bot.broadcastMessage("New order from *" + ctx.session.user.email + "*", accessLevels.root, null, true);
                                }
                                deleteLastMessage(ctx);
                                release();
                                leave(ctx);
                            });
                        }
                    });
                });
            });
            return ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        leave(ctx);
    }
)
exports.firstCourse = firstCourseWizard;

function sendAddSideDishesQuery(ctx) {
    let inline_keyboard = [];
    for (let i = 0; i < ctx.session.dailyMenu.secondCourse.sideDishes.length; i++) {
        let sd = ctx.session.dailyMenu.secondCourse.sideDishes[i];
        if (ctx.session.order.secondCourse.sideDishes.indexOf(sd) < 0) {
            inline_keyboard.push([{
                text: sd,
                callback_data: md5(sd)
            }]);
        }
    }
    const sideDishes = inline_keyboard.length;
    inline_keyboard.push([{
        text: sideDishes > 0 ? "Skip" : "Continue",
        callback_data: "skipcontinue"
    }])
    ctx.reply(sideDishes > 0 ? "Add side dish:" : "No side dishes left.", {
        parse_mode: "markdown",
        force_reply: true,
        reply_markup: JSON.stringify({
            inline_keyboard: inline_keyboard
        })
    }).then((msg) => {
        //lets save the message to delete it afterward
        ctx.session.lastMessage = msg;
    });
}

const secondCourseWizard = new WizardScene('secondCourseWizard',
    (ctx) => {
        let inline_keyboard = ctx.session.dailyMenu.secondCourse.items.map((sc) => {
            return [{
                text: sc,
                callback_data: md5(sc)
            }]
        });
        if (!inline_keyboard.length) {
            return leave(ctx);
        }
        //clear previous order draft in case user enter again in this schene
        ctx.session.order.firstCourse = {
            item: undefined,
            condiment: undefined
        };
        ctx.session.order.secondCourse = {
            item: undefined,
            sideDishes: []
        };
        ctx.reply("Available second courses:", {
            parse_mode: "markdown",
            remove_keyboard: true,
            reply_markup: JSON.stringify({
                inline_keyboard: inline_keyboard,
                remove_keyboard: true
            })
        }).then((msg) => {
            //lets save the message to delete it afterward
            ctx.session.lastMessage = msg;
        });
        return ctx.wizard.next()
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.secondCourse.items.map(sc => md5(sc)).indexOf(ctx.update.callback_query.data) >= 0) {
            let choosenSC = "";
            ctx.session.dailyMenu.secondCourse.items.map(sc => {
                if (md5(sc) == ctx.update.callback_query.data) {
                    choosenSC = sc;
                }
            });
            if (ctx.session.lastMessage) {
                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Second course: *" + choosenSC + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.secondCourse.item = choosenSC;
            sendAddSideDishesQuery(ctx);
            return ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.secondCourse.sideDishes.map(sd => md5(sd)).indexOf(ctx.update.callback_query.data) >= 0) {
            let choosenSD = "";
            ctx.session.dailyMenu.secondCourse.sideDishes.map(sd => {
                if (md5(sd) == ctx.update.callback_query.data) {
                    choosenSD = sd;
                }
            });
            if (ctx.session.order.secondCourse.sideDishes.indexOf(choosenSD) < 0) {
                if (ctx.session.lastMessage) {
                    ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Side dish: *" + choosenSD + "*", {
                        parse_mode: "markdown"
                    });
                    delete ctx.session.lastMessage;
                }
                ctx.session.order.secondCourse.sideDishes.push(choosenSD);
            } else {
                //Item already present
                if (ctx.session.lastMessage) {
                    ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Side dish already set", {
                        parse_mode: "markdown"
                    });
                    delete ctx.session.lastMessage;
                }
            }
            //loop over side dishes
            sendAddSideDishesQuery(ctx);

        } else if (ctx.update.callback_query && ctx.update.callback_query.data == "skipcontinue") {
            deleteLastMessage(ctx);
            //no more side dishes to add, go ahead...
            sendTables(ctx);
            ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.tables.map((t) => new mongoose.Types.ObjectId(t._id).toHexString()).indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.lastMessage) {
                let tableName = "";
                ctx.session.dailyMenu.tables.map((t) => {
                    if (t._id == ctx.update.callback_query.data)
                        tableName = t.name
                })
                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Table: *" + tableName + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.table = ctx.update.callback_query.data;
            ctx.reply("Confirm order?", {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{
                            text: "Confirm",
                            callback_data: 'confirm'
                        }],
                        [{
                            text: "Cancel",
                            callback_data: 'cancel'
                        }]
                    ]
                })
            }).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
            return ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.update.callback_query.data == 'confirm') {
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            ordersLock.writeLock('order', function (release) {

                //reload the daily menu in case something has been changed
                DB.getDailyMenu(null, (err, m) => {
                    if (err) {
                        console.error(err);
                        ctx.reply("DB menu error ehm");
                        release();
                        return leave(ctx);
                    }
                    ctx.session.dailyMenu = m;

                    //check order consistency
                    delete ctx.session.order.firstCourse;
                    const orderError = manager.validateOrder(ctx.session.order, ctx.session.dailyMenu);
                    if (orderError != null) {
                        ctx.reply(orderError);
                        release();
                        return leave(ctx);
                    }

                    //Deadline check
                    if (!moment().isBefore(moment(ctx.session.dailyMenu.deadline))) {
                        let text = "*Time is up!*\nYou can't place any order after the deadline (" + moment(ctx.session.dailyMenu.deadline).format("HH:mm") + ")";
                        if (ctx.session.lastMessage) {
                            ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                parse_mode: "markdown"
                            });
                            delete ctx.session.lastMessage;
                        } else {
                            ctx.reply(text, {
                                parse_mode: "markdown"
                            });
                        }
                        release();
                        leave(ctx);
                        return;
                    }
                    DB.getTablesStatus(null, (err, tables) => {
                        if (err) {
                            console.error(err);
                            ctx.reply("DB error ehm");
                            release();
                            return leave(ctx)
                        } else if (tables[ctx.session.order.table].used >= tables[ctx.session.order.table].total) {
                            let tableName = tables[ctx.session.order.table].name,
                                text = "Somebody was faster than you!\n*" + tableName + "* is full. Try again.";
                            if (ctx.session.lastMessage) {
                                ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                    parse_mode: "markdown"
                                });
                                delete ctx.session.lastMessage;
                            } else {
                                ctx.reply(text, {
                                    parse_mode: "markdown"
                                });
                            }
                            release();
                            return ctx.scene.enter('order');
                        } else {
                            const newOrder = new DB.Order(ctx.session.order);
                            newOrder.save((err, order) => {
                                if (err) {
                                    console.error(err);
                                    release();
                                    return leave(ctx, true); //force exit
                                } else if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                    bot.broadcastMessage("New order from *" + ctx.session.user.email + "*", accessLevels.root, null, true);
                                }
                                deleteLastMessage(ctx);
                                release();
                                leave(ctx);
                            });
                        }
                    });
                });
            });
            return ctx.wizard.next()
        } else {
            leave(ctx);
        }
    },
    (ctx) => {
        leave(ctx);
    }
)
exports.secondCourse = secondCourseWizard;

const ratingDeadline = require('./orderRating').ratingDeadline;

const scene = new Scene('order')
scene.enter((ctx) => {
    DB.getDailyUserOrder(null, ctx.session.user._id, (err, dailyOrder) => {
        if (err) {
            ctx.reply(err);
            return ctx.scene.leave();
        } else if (dailyOrder) {
            require('../bot').formatOrder(dailyOrder, ctx.session.user).then(text => {
                ctx.reply(text, {
                    parse_mode: "markdown"
                }).then(() => {
                    if (moment().isAfter(ratingDeadline(dailyOrder)) && ctx.session.user && levels.getLevel(ctx.session.user.points) > 0 && dailyOrder.rating == undefined) {
                        //users with level > 0 can rate their orders after the ratingDeadline
                        ctx.reply("Did you enjoy your lunch?", {
                            parse_mode: "markdown",
                            force_reply: true,
                            reply_markup: JSON.stringify({
                                inline_keyboard: [
                                    [{
                                        text: 'Rate it!',
                                        callback_data: 'rateit'
                                    }]
                                ]
                            })
                        }).then((msg) => {
                            //lets save the message to delete it afterward
                            ctx.session.lastMessage = msg;
                        });
                    } else {
                        ctx.scene.leave();
                    }
                });
            }, error => {
                ctx.reply("Something went wrong!", {
                    parse_mode: "markdown"
                });
            });
        } else {
            DB.getDailyMenu(null, (err, dailyMenu) => {
                if (err) {
                    console.error(err);
                    ctx.reply("DB error ehm");
                    return ctx.scene.leave();
                } else if (!dailyMenu) {
                    ctx.reply("Daily menu not available yet.");
                    return ctx.scene.leave();
                } else if (moment().isAfter(dailyMenu.deadline)) {
                    ctx.reply("🤦🏻‍♂️ Sorry bro, *you are late!*\nCome back tomorrow!", {
                        parse_mode: "markdown"
                    });
                    return ctx.scene.leave();
                }
                ctx.session.dailyMenu = dailyMenu;
                ctx.session.order = {
                    firstCourse: {
                        item: undefined,
                        condiment: undefined
                    },
                    secondCourse: {
                        item: undefined,
                        sideDishes: []
                    },
                    table: undefined,
                    menu: dailyMenu._id,
                    owner: ctx.session.user._id
                }
                //Utility arrays
                ctx.session.dailyMenu.availableCondiments = [];
                ctx.session.dailyMenu.availableFirstCourses = [];
                for (let i = 0; i < ctx.session.dailyMenu.firstCourse.items.length; i++) {
                    let item = ctx.session.dailyMenu.firstCourse.items[i];
                    if (ctx.session.dailyMenu.availableFirstCourses.indexOf(item.value) < 0)
                        ctx.session.dailyMenu.availableFirstCourses.push(item.value)
                    for (let j = 0; j < item.condiments.length; j++) {
                        if (ctx.session.dailyMenu.availableCondiments.indexOf(item.condiments[j]) < 0)
                            ctx.session.dailyMenu.availableCondiments.push(item.condiments[j])
                    }
                }
                keyboards.order.getOptions(ctx, opts => {
                    ctx.reply(keyboards.order.text, opts);
                });
            });
        }
    })
})

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);
    if (keyboards.order.cmd.first == ctx.message.text) {
        ctx.scene.enter('firstCourseWizard');
    } else if (keyboards.order.cmd.second == ctx.message.text) {
        ctx.scene.enter('secondCourseWizard');
    } else if (ctx.message.text == keyboards.order.cmd.back) {
        //back button
        ctx.scene.leave();
        ctx.reply('️✖️ ️️️️️️Order not placed', keyboards.btb(ctx).opts);
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
    if (ctx.update.callback_query.data == 'rateit') {
        ctx.scene.enter("orderRating");
    } else {
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;