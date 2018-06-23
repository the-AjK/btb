/**
 * reminder.js
 * Reminders manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const schedule = require('node-schedule'),
    moment = require('moment'),
    roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    bot = require("./telegram/bot"),
    botNotifications = require('./telegram/notifications'),
    DB = require("./db");

const schedulers = {
    dailyMenu: null,
    orderReminder: null,
    completeOrder: null
}

function clearScheduler(schedulerName) {
    if (schedulers[schedulerName] && schedulers[schedulerName].cancel) {
        console.log("clearScheduler: " + schedulerName);
        schedulers[schedulerName].cancel();
    }
}

function setScheduler(schedulerName, date, action) {
    clearScheduler(schedulerName);
    const s = {
        date: date.date(),
        month: date.month(),
        year: date.year(),
        hour: date.hours(),
        minute: date.minutes(),
        second: 0
    };
    console.log("setScheduler: " + schedulerName + " - " + JSON.stringify(s))
    schedulers[schedulerName] = schedule.scheduleJob(s, action);
}

exports.init = () => {

    console.log("Init reminders...");

    //Nightly schedule at 2:30AM
    const nightlySchedule = schedule.scheduleJob({
        hour: 2,
        minute: 30,
        second: 0
    }, function () {
        //chech if there are enabled daily menu, if yes, set the dailyReminders for that Menu
        initDailyReminders();
    });

    //Admin daily menu reminder at 10.00am from monday to friday
    const dailyMenuAdminReminderSchedule = schedule.scheduleJob("0 10 * * MON-FRI", function () {
        DB.getDailyMenu(null, (err, menu) => {
            if (err) {
                console.error(err);
            } else if (!menu && !isHoliday()) {
                //The daily menu wasnt uploaded yet, lets notify admins
                const message = "*Hey you 😬!*\n\nDid you forgot to upload a *new daily menu*?\nHurry up!\n\n[BTB - Dashboard](https://bitethebot.herokuapp.com)";
                bot.broadcastMessage(message, accessLevels.admin);
            }
        });
    });

    //in case of node process restart, lets set the reminders at the init time
    initDailyReminders();
}

function initDailyReminders() {
    console.log("Init daily reminders...")
    DB.getDailyMenu(null, (err, menu) => {
        if (err) {
            console.error(err);
        } else if (!menu) {
            console.warn("initDailyReminders - Daily menu not available yet.");
            clearScheduler("dailyMenu");
            clearScheduler("orderReminder");
            clearScheduler("completeOrder");
        } else {

            setScheduler("orderReminder", moment(menu.deadline).subtract(15, 'minutes'), () => {
                //send orderReminder to the bot users 10mins before the deadline
                botNotifications.orderReminder(menu.deadline);
            });

            setScheduler("completeOrder", moment(menu.deadline).add(10, 'minutes'), () => {
                //send ordersCompleteReminder to the bot admin users
                //with the dailyOrders results
                botNotifications.ordersCompleteReminder();
            });

            if (!moment.utc(menu.updatedAt).isSame(moment(), 'day')) {
                //The dailyMenu was updated in the past days, so lets remind the users that
                //its available today
                setScheduler("dailyMenu", moment(menu.deadline).subtract(120, 'minutes'), () => {
                    //send daily menu notification
                    botNotifications.dailyMenu(menu);
                });
            } else {
                //The dailyMenu has been update today. There is nothing to do. Manager section
                //will notify the users 
            }
        }
    });
}

exports.initDailyReminders = initDailyReminders;

function getEaster(year) {
    var f = Math.floor,
        // Golden Number - 1
        G = year % 19,
        C = f(year / 100),
        // related to Epact
        H = (C  -  f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        // number of days from 21 March to the Paschal full moon
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        // weekday for the Paschal full moon
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        // number of days from 21 March to the Sunday on or before the Paschal full moon
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);

    return [month, day];
}

function isHoliday(date) {
    if (!date)
        date = moment();

    const easter = getEaster(date.year()),
        month = date.month() + 1,
        day = date.date();

    // Easter check
    if (month == easter[0]) {
        if (day == easter[1]) {
            console.log("Today is Pasqua!");
            return true;
        } else if (day == (easter[1] + 1)) {
            console.log("Today is Pasquetta!");
            return true;
        }
    }

    const italianHolidays = [{
        day: 1,
        month: 1,
        name: "Capodanno"
    }, {
        day: 6,
        month: 1,
        name: "Epifania"
    }, {
        day: 25,
        month: 4,
        name: "Anniversario della Liberazione"
    }, {
        day: 1,
        month: 5,
        name: "Festa del Lavoro"
    }, {
        day: 2,
        month: 6,
        name: "Festa della Repubblica"
    }, {
        day: 15,
        month: 8,
        name: "Ferragosto"
    }, {
        day: 1,
        month: 11,
        name: "Ognissanti"
    }, {
        day: 8,
        month: 12,
        name: "Immacolata Concezione"
    }, {
        day: 25,
        month: 12,
        name: "Natale"
    }, {
        day: 26,
        month: 12,
        name: "Santo Stefano"
    }];

    //Check other holidays
    return italianHolidays.filter(h => {
        if (h.day == day && h.month == month) {
            console.log("Today is " + h.name + "!");
            return true;
        } else {
            return false
        }
    }).length > 0;

}