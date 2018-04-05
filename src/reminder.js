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
        date: date.day(),
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
    console.log("Setup nightly scheduler...");
    //Nightly schedule at 2:30AM
    const nightlySchedule = schedule.scheduleJob({
        hour: 2,
        minute: 30,
        second: 0
    }, function () {
        //chech if there are enabled daily menu, if yes, set the dailyReminders for that Menu
        initDailyReminders();
    });

    //in case of node process restart, lets set the reminders at the init time
    initDailyReminders();
}

function initDailyReminders() {
    console.log("initDailyReminders...")
    DB.getDailyMenu(null, (err, menu) => {
        if (err) {
            console.error(err);
        } else if (!menu) {
            console.warn("initDailyReminders - Daily menu not available yet.");
            clearScheduler("dailyMenu");
            clearScheduler("orderReminder");
            clearScheduler("completeOrder");
        } else {

            setScheduler("orderReminder", moment(menu.deadline).subtract(10, 'minutes'), () => {
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
                setScheduler("dailyMenu", moment(menu.deadline).subtract(60, 'minutes'), () => {
                    //send ordersCompleteReminder to the bot admin users
                    //with the dailyOrders results
                    botNotifications.ordersCompleteReminder();
                });
            } else {
                //The dailyMenu has been update today. There is nothing to do. Manager section
                //will notify the users 
            }
        }
    });
}

exports.initDailyReminders = initDailyReminders;