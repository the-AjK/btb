/**
 * settings.js
 * Telegram Bot settings scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    moment = require('moment'),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    packageJSON = require('../../../package.json'),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require('../bot'),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

let beerLock = null;

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
        ctx.reply(keyboards.settings(ctx).text, keyboards.settings(ctx).opts);
    } else {
        ctx.reply("ACK", keyboards.btb(ctx).opts)
        ctx.scene.leave();
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
    } else if (ctx.update.callback_query.data.toLowerCase().indexOf('pint') != -1) {
        addBeer(ctx);
    } else if (ctx.update.callback_query.data == 'leave') {
        leave(ctx);
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;

function deleteDailyOrder(ctx) {
    const today = moment().startOf("day"),
        tomorrow = moment(today).add(1, "days"),
        query = {
            deleted: false,
            enabled: true,
            day: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            },

        };
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    DB.Menu.findOne(query, (err, menu) => {
        if (!err && menu) {
            if (moment().isAfter(menu.deadline)) {
                ctx.reply("AAHahahAH too late! 😂\n\nRemoving the daily order is no longer possible when the deadline is reached.");
                return;
            }
            DB.Order.findOneAndRemove({
                deleted: false,
                owner: ctx.session.user._id,
                menu: menu._id
            }).exec((err, order) => {
                if (!err && order) {
                    ctx.reply("Your daily order has been deleted!");
                    if (!checkUser(ctx.session.user.role, userRoles.root)) {
                        bot.broadcastMessage("Order deleted by *" + ctx.session.user.email + "* ", accessLevels.root, null, true);
                    }
                } else if (!order) {
                    ctx.reply("You didn't placed any order yet! c'mon...");
                } else {
                    console.error(err || "DB error");
                    ctx.reply("DB error!");
                }
            })
        } else if (!menu) {
            ctx.reply("You didn't placed any order yet!");
        } else {
            console.error(err || "DB error");
            ctx.reply("DB error!");
        }
    });
}

function addBeer(ctx) {
    if (beerLock != null) {
        ctx.reply("Wait wait, I can get one beer at time!\n*" + beerLock + "* was faster than you!", {
            parse_mode: "markdown"
        });
    } else {
        beerLock = ctx.session.user.username;
        const type = ctx.update.callback_query.data,
            newBeer = new DB.Beer({
                owner: ctx.session.user._id,
                type: (type == 'pint' ? 1 : 0)
            });
        newBeer.save((err, beer) => {
            if (err) {
                console.error(err);
                ctx.reply("Something went wrong...");
                return;
            }
            //TODO send beer image
            ctx.reply("Oh yeah, let me drink it...");
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                bot.broadcastMessage("New beer from: *" + ctx.session.user.email + "*", accessLevels.root, null, true);
            }
            setTimeout(() => {
                if (type == 'pint') {
                    ctx.reply("Thank you bro!")
                } else {
                    ctx.reply("Thanks, but next time give me a pint!")
                };
                beerLock = null;

                //lets check the total beers
                DB.getUserBeers(ctx.session.user._id, null, (err, beers) => {
                    if (!err) {
                        const beersLevelMap = {
                            10: 1,
                            50: 2,
                            200: 3,
                            500: 4,
                            1000: 5
                        };
                        if (beersLevelMap[beers.length])
                            DB.setUserLevel(ctx.session.user._id, beersLevelMap[beers.length], (err) => {
                                if (err) {
                                    console.error(err);
                                } else {
                                    ctx.reply("⭐️ Level UP! ( " + beers.length + " beers 🍻 )");
                                }
                            });
                    } else {
                        console.error(err);
                    }
                });
            }, type == 'pint' ? 3000 : 2000)
        });
    }
}

function leave(ctx) {
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
        about = "*BiteTheBot* v" + version + "\n\n" +
        "made with ❤️ by [Alberto Garbui](tg://user?id=7050263) aka JK\n" +
        "(alberto.garbui@gmail.com)\n" +
        "\n" +
        "_A special thanks goes to my girlfriend Giulia for the support and for choosing the name BiteTheBot._" +
        "\n\n*Tips&Tricks*:" +
        "\nOnce you have placed an order you can use mentions like *@ table* to broadcast a message to all the people in your table." +
        "\nYou can use *@ tables* to broadcast a message to all the people who already made an order." +
        "\n\n*Do you like BTB?*\n[Give me a real beer](https://www.paypal.me/AlbertoGarbui)" +
        "\n\n*Are you a developer?*\n[Pull Requests are welcome!](https://github.com/the-AjK/btb/pulls)\n\n" +
        "*License*:\n[BSD-3](https://github.com/the-AjK/btb/blob/master/LICENSE)";
    return about;
}