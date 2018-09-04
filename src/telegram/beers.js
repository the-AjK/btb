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
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    ReadWriteLock = require('rwlock'),
    levels = require('../levels'),
    bot = require('./bot'),
    DB = require("../db"),
    ACTIONS = bot.ACTIONS;

let beerLock = null,
    beerLockTimeout = 60000 * 60, //1h
    lastUserBeer,
    drunkBot = false,
    autoDrinkRange = 60000 * 30, //30mins
    drinkingSchedule,
    lock = new ReadWriteLock();

const beerType = {
    "single": 0,
    "double": 1
}
exports.beerType = beerType;

exports.botIsDrunk = function () {
    return drunkBot;
}

function enableDashboardUser(userID) {
    DB.User.findOne({
        _id: userID,
        enabled: false,
        deleted: false,
        role: userRoles.user,
        "telegram.enabled": true,
        "telegram.banned": false
    }, (err, user) => {
        if (err) {
            console.error(err);
        } else if (user) {
            user.enabled = true;
            user.updatedAt = moment();
            user.save((_err, _user) => {
                if (_err) {
                    return console.error(_err);
                }
                const message = "*Congratulations!*\nYou just gained a full web access to the *BiteTheBot* dashboard!\n" +
                    "\nYour credentials are:\nusername: *" + user.email + "*\npassword: *" + user.telegram.id + "*\n" +
                    "\nYou may change your password following the instructions in the user profile's dashboard section.\n" +
                    "\n>>> [BTB Dashboard](https://bitethebot.herokuapp.com) <<<";
                require('./bot').bot.telegram.sendMessage(user.telegram.id, message, {
                    parse_mode: "markdown"
                }).then(() => {
                    console.log("User " + user.email + " has been dashboard enabled!");
                });
            });
        }
    });
}

function drinkBeer(user) {
    const minDrinkingTime = 60000 * 30, //30min
        maxDrinkingTime = 60000 * 60, //60min
        minDrunkDrinkingTime = 60000 * 30 * 3, //1,5h
        maxDrunkDrinkingTime = 60000 * 30 * 5; //2,5h
    let drinkingTime = Math.round(utils.getRandomInt(minDrinkingTime, maxDrinkingTime));
    beerLock = user;
    lastUserBeer = user;
    if (drunkBot) {
        drinkingTime = Math.round(utils.getRandomInt(minDrunkDrinkingTime, maxDrunkDrinkingTime));
    }
    console.log("Beer lock for: " + beerLock.email + " [" + Math.round(drinkingTime / 60000) + "mins]");
    //enableDashboardUser(user._id);
    setTimeout(() => {
        lock.writeLock('beer', function (release) {
            beerLock = null;
            drunkBot = false;
            console.log("Beer unlocked");
            release();
        });
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
        console.log("Locked beer from: btb@btb.com [" + beerLock.email + "]");
        setDrinkingSchedule(beerLockTimeout);
    } else {
        drinkBeer({
            _id: 0,
            email: "btb@btb.com",
            username: "BiteTheBot"
        });
        const halfhour = 60000 * 30;
        setDrinkingSchedule(beerLockTimeout + halfhour);
    }
}

function saveLockedBeerEvent(ctx) {
    const newLockedBeer = new DB.BeerEvent({
        owner: ctx.session.user._id,
        drunk: drunkBot,
        locked: true
    });
    newLockedBeer.save((err, beer) => {
        if (err) {
            console.error(err);
        }
    });
}

function checkDoubleBeer(ctx, type) {
    if (type == "double") {
        levels.removePoints(ctx.session.user._id, 1, false, (err, points) => {
            ctx.scene.enter('extra');
            bot.broadcastMessage("Double locked beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
        });
    } else {
        ctx.scene.enter('extra');
    }
}

function addBeer(ctx, type) {
    lock.readLock('beer', function (release) {
        if (drunkBot && beerLock.username != ctx.session.user.username) {
            ctx.reply("😵 " + bot.getUserLink(lastUserBeer) + " got me drunk!", {
                parse_mode: "markdown"
            });
            console.log("Drunk beer from: " + ctx.session.user.email + " [" + beerLock.email + "]");
            saveLockedBeerEvent(ctx);
            ctx.scene.enter('extra');
            return release();
        } else if (drunkBot) {
            ctx.reply("😵 You got me drunk!", {
                parse_mode: "markdown"
            });
            console.log("Drunk beer from: " + ctx.session.user.email);
            saveLockedBeerEvent(ctx);
            ctx.scene.enter('extra');
            return release();
        }
        if (beerLock != null) {
            if (beerLock.username == "BiteTheBot") {
                ctx.reply("Wait wait, I'm drinking my own beer!\nI can get one beer at time!", {
                    parse_mode: "markdown"
                }).then(() => {
                    checkDoubleBeer(ctx, type);
                });
            } else if (beerLock.username != ctx.session.user.username) {
                ctx.reply("Wait wait, I can get one beer at time!\nI'm still drinking the " + bot.getUserLink(beerLock) + "'s one!", {
                    parse_mode: "markdown"
                }).then(() => {
                    checkDoubleBeer(ctx, type);
                });
            } else {
                ctx.reply("Wait wait, I can get one beer at time!", {
                    parse_mode: "markdown"
                }).then(() => {
                    checkDoubleBeer(ctx, type);
                });
            }
            console.log("Locked beer from: " + ctx.session.user.email + " [" + beerLock.email + "]");
            saveLockedBeerEvent(ctx);
            return release();
        } else {
            if (lastUserBeer && lastUserBeer.email == ctx.session.user.email && levels.getLevel(ctx.session.user.points) > 0) {
                drunkBot = true;
            }
            //set the addBeer flag
            ctx.session.addBeer = true;
            drinkBeer(ctx.session.user);
            const newBeer = new DB.BeerEvent({
                owner: ctx.session.user._id,
                drunk: drunkBot,
                type: beerType[type]
            });
            newBeer.save((err, beer) => {
                if (err) {
                    console.error(err);
                    ctx.session.addBeer = false;
                    ctx.reply("Something went wrong...");
                    return release();
                }
                //TODO send beer image
                ctx.reply("Oh yeah, let me drink it...");
                ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
                setTimeout(() => {
                    const beerPoints = type == "single" ? 1 : 2;
                    if (drunkBot) {
                        ctx.reply("😵 You got me drunk!");
                        levels.removePoints(ctx.session.user._id, beerPoints, false, (err, points) => {
                            if (err) {
                                ctx.session.addBeer = false;
                                console.error(err);
                                return release();
                            }
                            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                bot.broadcastMessage("New drunk beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
                            }
                            ctx.session.addBeer = false;
                            ctx.scene.enter('extra');
                            return release();
                        });
                    } else {
                        ctx.reply("Thank you bro!");
                        levels.addPoints(ctx.session.user._id, beerPoints, false, (err, points) => {
                            if (err) {
                                ctx.session.addBeer = false;
                                console.error(err);
                                return release();
                            }
                            if (!checkUser(ctx.session.user.role, userRoles.root)) {
                                bot.broadcastMessage("New beer from: *" + ctx.session.user.email + "* (" + points + ")", accessLevels.root, null, true);
                            }
                            ctx.session.addBeer = false;
                            ctx.scene.enter('extra');
                            return release();
                        });
                    }
                }, type == 'double' ? 3000 : 2000)
            });
        }
    });
}
exports.addBeer = addBeer;

exports.init = function () {
    //randomly set beerLock during the day, acting like the bot is drinking time to time
    setDrinkingSchedule(60000 * 30);
}