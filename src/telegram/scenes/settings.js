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
    DB = require("../../db"),
    ACTIONS = require('../bot').ACTIONS;

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
            parse_mode: "markdown"
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
                ctx.reply("AAHahahAH too late!\nRemoving the daily order is no longer possible when the deadline is reached.");
                return;
            }
            DB.Order.findOneAndRemove({
                deleted: false,
                owner: ctx.session.user._id,
                menu: menu._id
            }).exec((err, order) => {
                if (!err && order) {
                    ctx.reply("Your daily order has been deleted!");
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
            updateQuery = {
                $inc: {}
            };
        updateQuery.$inc["beerCounter." + type] = 1;
        DB.User.findByIdAndUpdate(ctx.session.user._id, updateQuery, {
            new: true
        }, (err, updatedUser) => {
            if (err) {
                console.error(err);
                ctx.reply("Something went wrong...");
                return;
            }
            ctx.session.user = updatedUser;
            //TODO send beer image
            ctx.reply("Oh yeah, let me drink it...");
            ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
            setTimeout(() => {
                if (type == 'pint') {
                    ctx.reply("Thank you bro!")
                } else {
                    ctx.reply("Thanks, but next time give me a pint!")
                };
                beerLock = null;
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
        ctx.answerCbQuery("Daily Menu " + (updatedUser.settings.dailyMenu == true ? "ON" : "OFF") + "!", true);
        ctx.session.user = updatedUser;
    });
}

function generateAbout(ctx) {
    let about = "*BiteTheBot* v1.0.0\n\n" +
        "made with ❤️ by *Alberto Garbui* aka JK\n" +
        "(alberto.garbui@gmail.com)\n" +
        "\n" +
        "_A special thanks goes to my girlfriend Giulia for the support and for choosing the name BiteTheBot._" +
        "";
    return about;
}