/**
 * settings.js
 * Telegram Bot settings scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    schedule = require('node-schedule'),
    moment = require('moment'),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    packageJSON = require('../../../package.json'),
    utils = require("../../utils"),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    bot = require('../bot'),
    DB = require("../../db"),
    ACTIONS = bot.ACTIONS;

let beerLock = null,
    beerLockTimeout = 60000 * 60, //1h
    autoDrinkRange = 60000 * 30, //30mins
    drinkingSchedule;

function drinkBeer(user) {
    beerLock = user;
    console.log("Beer lock for: " + beerLock.email);
    setTimeout(() => {
        beerLock = null;
        console.log("Beer unlocked")
    }, beerLockTimeout);
}

function setDrinkingSchedule(minimumToWait) {
    //clear schedule
    if (drinkingSchedule && drinkingSchedule.cancel) {
        drinkingSchedule.cancel();
    }
    //calculate the next drink time
    const m = Math.round(utils.getRandomInt(minimumToWait, minimumToWait + autoDrinkRange) / 60000),
        drink = moment().add(m, 'minutes');
    console.log("Next drinking time in " + m + " minutes.");
    drinkingSchedule = schedule.scheduleJob({
        date: drink.date(),
        month: drink.month(),
        year: drink.year(),
        hour: drink.hours(),
        minute: drink.minutes(),
        second: 0
    }, function () {
        autoDrink();
    });
}

function autoDrink() {
    if (beerLock) {
        console.log("Cannot auto drink");
        //bot.broadcastMessage("I wish to drink but I can't", accessLevels.root, null, true);
        setDrinkingSchedule(beerLockTimeout);
    } else {
        drinkBeer({
            email: "btb@btb.com",
            username: "BiteTheBot"
        });
        //bot.broadcastMessage("I'm drinking!", accessLevels.root, null, true);
        const halfhour = 60000 * 30;
        setDrinkingSchedule(beerLockTimeout + halfhour);
    }
}

//randomly set beerLock during the day, acting like the bot is drinking time to time
setDrinkingSchedule(60000 * 30);

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
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    DB.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
        if (err) {
            console.error(err);
            ctx.reply("Cannot delete the daily order");
        } else if (!order) {
            ctx.reply("You didn't placed any order yet! c'mon...");
        } else {
            if (moment().isAfter(order.menu.deadline)) {
                ctx.reply("AAHahahAH too late! 😂\n\nRemoving the daily order is no longer possible when the deadline is reached.");
                return;
            }
            DB.Order.findByIdAndRemove(order._id, (err, deletedOrder) => {
                if (!err && deletedOrder) {
                    ctx.reply("Your daily order has been deleted!");
                    levels.removePoints(ctx.session.user._id, 1, (err, points) => {
                        if(err){
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
            });
        }
    });
}

function addBeer(ctx) {
    if (beerLock != null) {
        if (beerLock.username == "BiteTheBot") {
            ctx.reply("Wait wait, I'm drinking my own beer!\nI can get one beer at time!", {
                parse_mode: "markdown"
            });
        } else if (beerLock.username != ctx.session.user.username) {
            ctx.reply("Wait wait, I can get one beer at time!\nI'm still drinking the [" + beerLock.username + "](tg://user?id=" + beerLock.telegram.id + ")'s one!", {
                parse_mode: "markdown"
            });
        } else {
            ctx.reply("Wait wait, I can get one beer at time!", {
                parse_mode: "markdown"
            });
        }
        if (!checkUser(ctx.session.user.role, userRoles.root)) {
            bot.broadcastMessage("Locked beer from: *" + ctx.session.user.email + "*", accessLevels.root, null, true);
        }
    } else {
        drinkBeer(ctx.session.user);
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
            setTimeout(() => {
                ctx.reply("Thank you bro!");
                //lets check the total beers
                DB.getUserBeers(ctx.session.user._id, null, (err, beers) => {
                    if (!err) {
                        levels.addPoints(ctx.session.user._id, 1, (err, points) => {
                            if(err){
                                console.error(err);
                            }
                            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                bot.broadcastMessage("New beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
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
        about = "*BiteTheBot* [v" + version + "](https://github.com/the-AjK/btb/blob/" + version + "/CHANGELOG.md)\n\n" +
        "made with ❤️ by [Alberto Garbui](tg://user?id=7050263) aka JK\n" +
        "(alberto.garbui@gmail.com)\n" +
        "\n" +
        "_A special thanks goes to my girlfriend Giulia for the support and for choosing the name BiteTheBot._" +
        "\n\n*Tips&Tricks*:" +
        "\nOnce you have placed an order you can use mentions like `@table` to broadcast a message to all the people in your table." +
        "\nYou can use `@tables` to broadcast a message to all the people who already made an order." +
        "\n\n*Do you like BTB?*\n[Give me a real beer](https://www.paypal.me/AlbertoGarbui)" +
        "\n\n*Are you a developer?*\n[Pull Requests are welcome!](https://github.com/the-AjK/btb/pulls)\n\n" +
        "*License*:\n[BSD-3](https://github.com/the-AjK/btb/blob/" + version + "/LICENSE)";
    return about;
}