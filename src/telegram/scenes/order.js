/**
 * order.js
 * Telegram Bot order scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    moment = require("moment"),
    mongoose = require("mongoose"),
    Scene = require('telegraf/scenes/base'),
    Composer = require('telegraf/composer'),
    Markup = require('telegraf/markup'),
    WizardScene = require('telegraf/scenes/wizard'),
    keyboards = require('../keyboards'),
    ReadWriteLock = require('rwlock'),
    DB = require("../../db"),
    ACTIONS = require('../bot').ACTIONS;

let ordersLock = new ReadWriteLock();

function leave(ctx) {
    if (ctx.session.lastMessage) {
        require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "😬", {
            parse_mode: "markdown"
        });
        delete ctx.session.lastMessage;
    }
    ctx.scene.leave()
    ctx.reply('ACK', keyboards.btb(ctx).opts)
}

function checkReEnter(ctx) {
    if (ctx.message) {
        if (keyboards.order(ctx).cmd.first == ctx.message.text) {
            if (ctx.session.lastMessage) {
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "😬", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.scene.enter('firstCourseWizard');
            return true;
        } else if (keyboards.order(ctx).cmd.second == ctx.message.text) {
            if (ctx.session.lastMessage) {
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "😬", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.scene.enter('secondCourseWizard');
            return true;
        }
    }
    return false;
}


function sendTables(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    ordersLock.writeLock('order', function(release) {
        DB.getTablesStatus(null, (err, tables) => {
            if (err) {
                console.error(err);
                ctx.reply("DB error ehm");
                release();
                return leave(ctx)
            } else {
                //lets find the favailable tables
                let inline_keyboard = ctx.session.dailyMenu.tables.map((t) => {
                    let usedSeats = tables[t._id] ? tables[t._id].used : 0;
                    return [{
                        text: t.name + " [" + usedSeats + "/" + t.seats + "]",
                        callback_data: t._id
                    }]
                });
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
                callback_data: fc.value
            }]
        });
        if (!inline_keyboard.length) {
            return leave(ctx);
        }
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
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.availableFirstCourses.indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.lastMessage) {
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "First course: *" + ctx.update.callback_query.data + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.firstCourse.item = ctx.update.callback_query.data;
            //lets find the firstCourse condiments
            let inline_keyboard = []
            for (let i = 0; i < ctx.session.dailyMenu.firstCourse.items.length; i++) {
                if (ctx.session.dailyMenu.firstCourse.items[i].value == ctx.update.callback_query.data) {
                    inline_keyboard = ctx.session.dailyMenu.firstCourse.items[i].condiments.map((c) => {
                        return [{
                            text: c,
                            callback_data: c
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
            leave(ctx)
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.availableCondiments.indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.lastMessage) {
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Condiment: *" + ctx.update.callback_query.data + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.firstCourse.condiment = ctx.update.callback_query.data;
            sendTables(ctx);
            ctx.wizard.next()
        } else {
            leave(ctx)
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
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Table: *" + tableName + "*", {
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
            leave(ctx)
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.update.callback_query.data == 'confirm') {
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            ordersLock.writeLock('order', function(release) {
                DB.getTablesStatus(null, (err, tables) => {
                    if (err) {
                        console.error(err);
                        ctx.reply("DB error ehm");
                        release();
                        return leave(ctx)
                    } else if (tables[ctx.session.order.table].used >= tables[ctx.session.order.table].total) {
                        let tableName = tables[ctx.session.order.table].name;
                        ctx.reply("Somebody was faster than you!\n*" + tableName + "* is full. Try again.", {
                            parse_mode: "markdown"
                        });
                        release();
                        return ctx.scene.enter('firstCourseWizard');
                    } else {
                        const newOrder = new DB.Order(ctx.session.order);
                        newOrder.save((err, order) => {
                            let text = "*Order confirmed!*";
                            if (err) {
                                console.error(err)
                                text = "*Something went wrong!*\nContact the admin for more info.";
                            }
                            if (ctx.session.lastMessage) {
                                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                    parse_mode: "markdown"
                                });
                                delete ctx.session.lastMessage;
                            }
                            release();
                            leave(ctx)
                        });
                    }
                });
            });
            return ctx.wizard.next()
        } else {
            leave(ctx)
        }
    },
    (ctx) => {
        leave(ctx)
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
                callback_data: sd
            }]);
        }
    }
    const sideDishes = inline_keyboard.length;
    inline_keyboard.push([{
        text: "Continue",
        callback_data: "continue"
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
                callback_data: sc
            }]
        });
        if (!inline_keyboard.length) {
            return leave(ctx);
        }
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
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.secondCourse.items.indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.lastMessage) {
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Second course: *" + ctx.update.callback_query.data + "*", {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            ctx.session.order.secondCourse.item = ctx.update.callback_query.data;
            sendAddSideDishesQuery(ctx);
            return ctx.wizard.next()
        } else {
            leave(ctx)
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.session.dailyMenu.secondCourse.sideDishes.indexOf(ctx.update.callback_query.data) >= 0) {
            if (ctx.session.order.secondCourse.sideDishes.indexOf(ctx.update.callback_query.data) < 0) {
                if (ctx.session.lastMessage) {
                    require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Side dish: *" + ctx.update.callback_query.data + "*", {
                        parse_mode: "markdown"
                    });
                    delete ctx.session.lastMessage;
                }
                ctx.session.order.secondCourse.sideDishes.push(ctx.update.callback_query.data);
            } else {
                //Item already present
                if (ctx.session.lastMessage) {
                    require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Side dish already set", {
                        parse_mode: "markdown"
                    });
                    delete ctx.session.lastMessage;
                }
            }
            //loop over side dishes
            sendAddSideDishesQuery(ctx);

        } else if (ctx.update.callback_query && ctx.update.callback_query.data == "continue") {
            if (ctx.session.lastMessage) {
                let text = (ctx.update.callback_query.data != "continue" ? ("Side dish: *" + ctx.update.callback_query.data + "*") : "😬");
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                    parse_mode: "markdown"
                });
                delete ctx.session.lastMessage;
            }
            //no more side dishes to add, go ahead...
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            ordersLock.writeLock('order', function(release) {
                DB.getTablesStatus(null, (err, tables) => {
                    if (err) {
                        console.error(err);
                        ctx.reply("DB error ehm");
                        release();
                        return leave(ctx)
                    } else {
                        //lets find the available tables
                        let inline_keyboard = ctx.session.dailyMenu.tables.map((t) => {
                            let usedSeats = tables[t._id] ? tables[t._id].used : 0;
                            return [{
                                text: t.name + " [" + usedSeats + "/" + t.seats + "]",
                                callback_data: t._id
                            }]
                        });
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
            ctx.wizard.next()
        } else {
            leave(ctx)
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
                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, "Table: *" + tableName + "*", {
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
            leave(ctx)
        }
    },
    (ctx) => {
        if (checkReEnter(ctx)) {
            return;
        } else if (ctx.update.callback_query && ctx.update.callback_query.data == 'confirm') {
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            ordersLock.writeLock('order', function(release) {
                DB.getTablesStatus(null, (err, tables) => {
                    if (err) {
                        console.error(err);
                        ctx.reply("DB error ehm");
                        release();
                        return leave(ctx)
                    } else if (tables[ctx.session.order.table].used >= tables[ctx.session.order.table].total) {
                        let tableName = tables[ctx.session.order.table].name;
                        ctx.reply("Somebody was faster than you!\n*" + tableName + "* is full. Try again.", {
                            parse_mode: "markdown"
                        });
                        release();
                        return ctx.scene.enter('secondCourseWizard');
                    } else {
                        const newOrder = new DB.Order(ctx.session.order);
                        newOrder.save((err, order) => {
                            let text = "*Order confirmed!*";
                            if (err) {
                                console.error(err)
                                text = "*Something went wrong!*\nContact the admin for more info.";
                            }
                            if (ctx.session.lastMessage) {
                                require('../bot').bot.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                                    parse_mode: "markdown"
                                });
                                delete ctx.session.lastMessage;
                            }
                            release();
                            leave(ctx)
                        });
                    }
                });
            });
            return ctx.wizard.next()
        } else {
            leave(ctx)
        }
    },
    (ctx) => {
        leave(ctx)
    }
)
exports.secondCourse = secondCourseWizard;

const scene = new Scene('order')
scene.enter((ctx) => {
    DB.getDailyUserOrder(null, ctx.session.user.id, (err, dailyOrder) => {
        if (err) {
            ctx.reply(err);
            return ctx.scene.leave();
        } else if (dailyOrder) {
            ctx.reply(require('../bot').formatOrder(dailyOrder), {
                parse_mode: "markdown"
            });
            return ctx.scene.leave();
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
                    ctx.reply("Sorry bro, you are late! Come back tomorrow!", {
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
                ctx.reply(keyboards.order(ctx).text, keyboards.order(ctx).opts);
            });
        }
    })
})

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }

    if (keyboards.order(ctx).cmd.first == ctx.message.text) {
        ctx.scene.enter('firstCourseWizard');
    } else if (keyboards.order(ctx).cmd.second == ctx.message.text) {
        ctx.scene.enter('secondCourseWizard');
    } else {
        leave(ctx)
    }
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {
    ctx.deleteMessage(ctx.message_id);
    delete ctx.session.lastMessage;
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
});

exports.scene = scene;