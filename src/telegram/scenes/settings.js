/**
 * settings.js
 * Telegram Bot settings scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require('moment'),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    packageJSON = require('../../../package.json'),
    roles = require("../../roles"),
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    bot = require('../bot'),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('settings')
scene.enter((ctx) => ctx.reply(keyboards.settings(ctx).text, keyboards.settings(ctx).opts))

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
    } else if (ctx.message.text == keyboards.slot(ctx).cmd.back) {
        //back from slot
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
    } else if (ctx.update.callback_query.data == 'dailymenuon') {
        setDailyMenuSetting(ctx, true);
    } else if (ctx.update.callback_query.data == 'deletedailyorder') {
        deleteDailyOrder(ctx);
    } else if (ctx.update.callback_query.data == 'orderreminderoff') {
        setOrderReminderSetting(ctx, false);
    } else if (ctx.update.callback_query.data == 'orderreminderon') {
        setOrderReminderSetting(ctx, true);
    } else if (ctx.update.callback_query.data == 'adminremindersoff') {
        setAdminReminders(ctx, false);
    } else if (ctx.update.callback_query.data == 'adminreminderson') {
        setAdminReminders(ctx, true);
    } else if (ctx.update.callback_query.data == 'rootremindersoff') {
        setRootReminders(ctx, false);
    } else if (ctx.update.callback_query.data == 'rootreminderson') {
        setRootReminders(ctx, true);
    } else if (ctx.update.callback_query.data == 'unsubscribe') {
        unsubscribe(ctx);
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;

function deleteDailyOrder(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    const ordersLock = require('./order').getOrdersLock();
    ordersLock.writeLock('order', function (release) {
        DB.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
            if (err) {
                console.error(err);
                ctx.reply("Cannot delete the daily order");
                release();
            } else if (!order) {
                ctx.reply("You didn't placed any order yet! c'mon...");
                release();
            } else if (moment().isAfter(order.menu.deadline)) {
                ctx.reply("AAHahahAH too late! 😂\n\nRemoving the daily order is no longer possible when the deadline is reached.");
                release();
            } else {
                DB.Order.findByIdAndRemove(order._id, (err, deletedOrder) => {
                    if (!err && deletedOrder) {
                        ctx.reply("Your daily order has been deleted!", keyboards.settings(ctx).opts);
                        levels.removePoints(ctx.session.user._id, 1, false, (err, points) => {
                            if (err) {
                                console.error(err);
                            }
                        });
                        if (!checkUser(ctx.session.user.role, userRoles.root)) {
                            bot.broadcastMessage("Order deleted by *" + ctx.session.user.email + "* ", accessLevels.root, null, true);
                        }
                    } else {
                        console.error(err || "DB error");
                        ctx.reply("DB error!");
                    }
                    release();
                });
            }
        });
    });
}

function unsubscribe(ctx) {
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        deleted: true,
        updatedAt: new Date()
    }, {
        new: true
    }, (err, updatedUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Something went wrong...");
            return;
        }
        bot.broadcastMessage("User unsubscribe: *" + ctx.session.user.email + "*", accessLevels.root, null, true);
        delete ctx.session.user;
        ctx.reply('Account successfully deleted!', {
            reply_markup: JSON.stringify({
                remove_keyboard: true
            })
        });
        ctx.scene.leave();
    });
}
exports.unsubscribe = unsubscribe;

function setOrderReminderSetting(ctx, status) {
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        $set: {
            "settings.orderReminder": status
        }
    }, {
        new: true
    }, (err, updatedUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Something went wrong...");
            return;
        }
        ctx.answerCbQuery("Order Reminder " + (updatedUser.settings.orderReminder == true ? "ON" : "OFF") + "!", true);
        ctx.session.user = updatedUser;
    });
}

function setDailyMenuSetting(ctx, status) {
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        $set: {
            "settings.dailyMenu": status
        }
    }, {
        new: true
    }, (err, updatedUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Something went wrong...");
            return;
        }
        ctx.answerCbQuery("Daily Menu Notification " + (updatedUser.settings.dailyMenu == true ? "ON" : "OFF") + "!", true);
        ctx.session.user = updatedUser;
    });
}

function setAdminReminders(ctx, status) {
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        $set: {
            "settings.adminReminders": status
        }
    }, {
        new: true
    }, (err, updatedUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Something went wrong...");
            return;
        }
        ctx.answerCbQuery("Admin Reminders " + (updatedUser.settings.adminReminders == true ? "ON" : "OFF") + "!", true);
        ctx.session.user = updatedUser;
    });
}

function setRootReminders(ctx, status) {
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        $set: {
            "settings.rootReminders": status
        }
    }, {
        new: true
    }, (err, updatedUser) => {
        if (err) {
            console.error(err);
            ctx.reply("Something went wrong...");
            return;
        }
        ctx.answerCbQuery("Root Reminders " + (updatedUser.settings.rootReminders == true ? "ON" : "OFF") + "!", true);
        ctx.session.user = updatedUser;
    });
}

function generateAbout(ctx) {
    let version = packageJSON.version,
        about = "*BiteTheBot* [v" + version + "](https://github.com/the-AjK/btb/blob/" + version + "/CHANGELOG.md)\n\n" +
        "made with ❤️ by [Alberto Garbui](tg://user?id=7050263) aka JK\n" +
        "(alberto.garbui@gmail.com)\n" +
        "\n" +
        "_A special thanks goes to my girlfriend Giulia for the support and for choosing the name BiteTheBot._" +
        "\n\n*Tips&Tricks*:" +
        "\nUse the `@all` mention to broadcast a message to everyone." +
        "\nOnce you have placed an order you can use `@table` to broadcast a message to all the people in your table." +
        "\nYou can use `@tables` to broadcast a message to all the people who already place an order." +
        "\n\n*Do you like BTB?*\n[Give me a real beer](https://www.paypal.me/AlbertoGarbui)" +
        "\n\n*Are you a developer?*\n[Pull Requests are welcome!](https://github.com/the-AjK/btb/pulls)\n\n" +
        "*License*:\n[BSD-3](https://github.com/the-AjK/btb/blob/" + version + "/LICENSE)" +
        "\n\n*Do you wanna unsubscribe?*\nType `/unsubscribe` and follow the instructions.";
    return about;
}