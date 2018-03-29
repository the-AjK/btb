/**
 * reminder.js
 * Reminders manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const schedule = require('node-schedule'),
    moment = require('moment'),
    async = require('async'),
    roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require("./telegram/bot"),
    botNotifications = require('./telegram/notifications'),
    DB = require("./db");

let dailyReminderSchedule,
    dailyCompleteOrderSchedule;

exports.init = () => {
    console.log("Setup nightly scheduler...");
    //Nightly schedule at 2:30AM
    const nightlySchedule = schedule.scheduleJob({
        hour: 2,
        minute: 30,
        second: 0
    }, function () {
        //chech if there are enabled daily menu, if yes, set the dailyReminder for that Menu
        setOrderReminder();
    });

    //in case of node process restart, lets set the reminder at the init time
    setOrderReminder();
}

function clearOrderReminder() {
    if (dailyReminderSchedule && dailyReminderSchedule.cancel) {
        console.log("clearOrderReminder - Cancel previous scheduler.");
        dailyReminderSchedule.cancel();
    }
}

function clearOrdersReminder() {
    if (dailyCompleteOrderSchedule && dailyCompleteOrderSchedule.cancel) {
        console.log("dailyCompleteOrderSchedule - Cancel previous scheduler.");
        dailyCompleteOrderSchedule.cancel();
    }
}

function setOrderReminder() {
    console.log("setOrderReminder...")
    DB.getDailyMenu(null, (err, menu) => {
        if (err) {
            console.error(err);
        } else if (!menu) {
            console.warn("setOrderReminder - Daily menu not available yet.");
            clearOrderReminder();
            clearOrdersReminder();
        } else {
            clearOrderReminder();
            const r = moment(menu.deadline).subtract(10, 'minutes'),
                s = {
                    hour: r.hours(),
                    minute: r.minutes(),
                    second: 0
                };
            console.log("setOrderReminder - " + JSON.stringify(s))
            dailyReminderSchedule = schedule.scheduleJob(s, function () {
                //send orderReminder to the bot users
                botNotifications.orderReminder(menu.deadline);
            });

            clearOrdersReminder();
            const rr = moment(menu.deadline).add(10, 'minutes'),
                ss = {
                    hour: rr.hours(),
                    minute: rr.minutes(),
                    second: 0
                };
            console.log("setOrdersReminder - " + JSON.stringify(ss))
            dailyCompleteOrderSchedule = schedule.scheduleJob(ss, function () {
                //send orderReminder to the bot users
                botNotifications.ordersCompleteReminder();
            });
        }
    });
}

exports.setOrderReminder = setOrderReminder;