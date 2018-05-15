/**
 * beers.js
 * Beers manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const schedule = require('node-schedule'),
    moment = require('moment'),
    utils = require("../utils"),
    roles = require("../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../levels'),
    bot = require('./bot'),
    DB = require("../db"),
    ACTIONS = bot.ACTIONS;

let beerLock = null,
    beerLockTimeout = 60000 * 60, //1h
    lastUserBeer,
    drunkBot = false,
    autoDrinkRange = 60000 * 30, //30mins
    drinkingSchedule;

exports.botIsDrunk = function () {
    return drunkBot;
}

function drinkBeer(user) {
    const minDrinkingTime = 60000 * 30, //30min
        maxDrinkingTime = 60000 * 60, //60min
        minDrunkDrinkingTime = 60000 * 30 * 3, //1,5h
        maxDrunkDrinkingTime = 60000 * 30 * 5; //2,5h
    let drinkingTime = Math.round(utils.getRandomInt(minDrinkingTime, maxDrinkingTime));
    beerLock = user;
    if (drunkBot) {
        drinkingTime = Math.round(utils.getRandomInt(minDrunkDrinkingTime, maxDrunkDrinkingTime));
    }
    console.log("Beer lock for: " + beerLock.email + " [" + Math.round(drinkingTime / 60000) + "mins]");
    setTimeout(() => {
        beerLock = null;
        drunkBot = false;
        console.log("Beer unlocked")
    }, drinkingTime);
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
        console.log("Locked beer from: btb@btb.com");
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

function addBeer(ctx) {
    if (drunkBot && beerLock.username != ctx.session.user.username) {
        ctx.reply("😵 [" + lastUserBeer.username + "](tg://user?id=" + lastUserBeer.telegram.id + ") got me drunk!", {
            parse_mode: "markdown"
        });
        console.log("Drunk beer from: " + ctx.session.user.email);
        return;
    } else if (drunkBot) {
        ctx.reply("😵 You got me drunk!", {
            parse_mode: "markdown"
        });
        console.log("Drunk beer from: " + ctx.session.user.email);
        return;
    }
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
        console.log("Locked beer from: " + ctx.session.user.email);
    } else {
        if (lastUserBeer && lastUserBeer.email == ctx.session.user.email) {
            drunkBot = true;
        } else {
            lastUserBeer = ctx.session.user;
        }
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
                if (drunkBot) {
                    ctx.reply("😵 You got me drunk!");
                    levels.removePoints(ctx.session.user._id, 1, false, (err, points) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        //update user session points
                        ctx.session.user.points = points;
                        if (!checkUser(ctx.session.user.role, userRoles.root)) {
                            bot.broadcastMessage("New drunk beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
                        }
                    });
                } else {
                    ctx.reply("Thank you bro!");
                    levels.addPoints(ctx.session.user._id, 1, false, (err, points) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        //update user session points
                        ctx.session.user.points = points;
                        if (!checkUser(ctx.session.user.role, userRoles.root)) {
                            bot.broadcastMessage("New beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
                        }
                    });
                }
            }, type == 'pint' ? 3000 : 2000)
        });
    }
}
exports.addBeer = addBeer;