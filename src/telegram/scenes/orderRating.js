/**
 * orderRating.js
 * Telegram Bot order rating scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require('moment'),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    roles = require("../../roles"),
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require('../bot'),
    DB = require("../../db"),
    levels = require("../../levels"),
    ACTIONS = bot.ACTIONS;

const scene = new Scene('orderRating'),
    ratingDeadline = (order) => {
        return moment(order.menu.deadline).add(2, 'hours');
    };

exports.ratingDeadline = ratingDeadline;

scene.enter((ctx) => {
    DB.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
        if (err) {
            console.log(err)
            ctx.reply("Ehm, you can't rate your order");
        } else if (!order) {
            ctx.reply("You didn't placed any order yet! c'mon...");
        } else if (order.rating) {
            ctx.reply("You already rate your order!");
        } else if (moment().isBefore(ratingDeadline(order))) {
            ctx.reply("You can't rate your order yet! Please wait");
        } else {
            //Default start rating
            ctx.session.rating = 7;
            ctx.reply(keyboards.orderRating(ctx).text, keyboards.orderRating(ctx).opts).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
            return
        }
        ctx.scene.leave();
    });
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
    ctx.reply("ACK", keyboards.btb(ctx).opts)
    ctx.scene.leave();
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {

    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == 'add') {
        if (ctx.session.rating < 10) {
            ctx.session.rating += 1;
            ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, keyboards.orderRating(ctx).text, keyboards.orderRating(ctx).opts);
        }
    } else if (ctx.update.callback_query.data == 'remove') {
        if (ctx.session.rating > 1) {
            ctx.session.rating -= 1;
            ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, keyboards.orderRating(ctx).text, keyboards.orderRating(ctx).opts);
        }
    } else if (ctx.update.callback_query.data == 'rateit') {
        setOrderRating(ctx);
        ctx.scene.leave();
    } else {
        if (ctx.session.lastMessage) {
            ctx.deleteMessage(ctx.session.lastMessage.message_id);
            delete ctx.session.lastMessage;
        }
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;

function setOrderRating(ctx) {
    DB.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
        if (err) {
            ctx.reply("Ehm, you can't rate your order");
        } else if (!order) {
            ctx.reply("You didn't placed any order yet! c'mon...");
        } else if (order.rating) {
            ctx.reply("You already rate your order!");
        } else if (moment().isBefore(ratingDeadline(order))) {
            ctx.reply("You can't rate your order yet! Please wait")
        } else {
            DB.Order.findByIdAndUpdate(order._id, {
                rating: ctx.session.rating
            }, (err, order) => {
                if (err) {
                    console.error(err);
                    ctx.reply("Ehm, something went wrong");
                } else {
                    let text = "Well done!\nYour rating was: *" + ctx.session.rating + "* stars! ⭐️";
                    ctx.telegram.editMessageText(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, text, {
                        parse_mode: "markdown"
                    });
                    if (!checkUser(ctx.session.user.role, userRoles.root)) {
                        bot.broadcastMessage("New order rating: *" + ctx.session.user.email + "* ( " + ctx.session.rating + " stars )", accessLevels.root, null, true);
                    }
                    levels.addPoints(ctx.session.user._id, 1, false, (err, points) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    //Save event
                    const event = new DB.RatingEvent({
                        owner: ctx.session.user._id,
                        rating: ctx.session.rating
                    });
                    event.save((err, s) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                }
            });
            return;
        }
        if (ctx.session.lastMessage) {
            ctx.deleteMessage(ctx.session.lastMessage.message_id);
            delete ctx.session.lastMessage;
        }
    });
}