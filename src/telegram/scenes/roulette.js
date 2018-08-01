/**
 * roulette.js
 * Roulette scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    async = require("async"),
    moment = require("moment"),
    ReadWriteLock = require('rwlock'),
    lock = new ReadWriteLock(),
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    utils = require('../../utils'),
    DB = require("../../db"),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

const BETKIND = {
        number: 0,
        manque: 1,
        passe: 2,
        red: 3,
        black: 4,
        even: 5,
        odd: 6
    },
    MAXBET = 50,
    MINBET = 1;

class Bet {

    constructor(bet) {
        this.owner = bet.owner;
        this.value = bet.value || MINBET;
        this.kind = bet.kind;
        this.number = bet.number;
    }

    increment(v) {
        this.value = Math.min(MAXBET, this.value + v);
    }

    decrement(v) {
        this.value = Math.max(MINBET, this.value - v);
    }

    getResult(number) {
        const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        if (this.kind == BETKIND.number && number == this.number) {
            return this.value * 35;
        } else if (this.kind == BETKIND.even && (number % 2) == 0) {
            return this.value * 2;
        } else if (this.kind == BETKIND.odd && (number % 2) != 0) {
            return this.value * 2;
        } else if (this.kind == BETKIND.manque && number > 0 && number < 19) {
            return this.value * 2;
        } else if (this.kind == BETKIND.passe && number > 18) {
            return this.value * 2;
        } else if (this.kind == BETKIND.red && redNumbers.indexOf(number) >= 0) {
            return this.value * 2;
        } else if (this.kind == BETKIND.black && number != 0 && redNumbers.indexOf(number) < 0) {
            return this.value * 2;
        }
        return 0;
    }
}

class Roulette {

    constructor(config) {
        this._bets = [];
        this._isRunning = false;
        this.enabled = process.env.ROULETTE_ENABLED || false;
        this._interval = 60000 * 33; //running interval (33mins)
        this._lastRunningTime = moment();
        this.runningInterval = setInterval(() => {
            this.run();
        }, this._interval);
    }

    get isRunning() {
        return this._isRunning;
    }

    get nextRunningTime() {
        return moment(this._lastRunningTime).add(this._interval, 'millisecond')
    }

    get nextRunDiff() {
        const diff = this.nextRunningTime.diff(moment(), 'seconds'),
            minutes = Math.floor(diff / 60),
            seconds = diff % 60;
        //return (minutes > 0 ? (minutes + " minute" + (minutes > 1 ? "s" : "") + " and ") : "") + seconds + " seconds";
        return (minutes > 0 ? (minutes + " minute" + (minutes > 1 ? "s" : "")) : "few seconds");
    }

    clearUserBets(owner, cb) {
        lock.writeLock('roulette', release => {
            const totalValue = this.userBets(owner).reduce((sum, bet) => {
                return sum + bet.value
            }, 0);
            console.log("clearbets for " + owner.email + ": " + totalValue);
            levels.addPoints(owner._id, totalValue, true, (err, points) => {
                if (err) {
                    console.error(err);
                }
                this._bets = this._bets.filter(b => b.owner._id != owner._id);
                release();
                cb();
            });
        });
    }

    userBets(owner) {
        return this._bets.filter(b => b.owner._id == owner._id);
    }

    getBets() {
        return this._bets;
    }

    addBet(bet, cb) {
        if (this._isRunning) {
            return cb("Roulette is running!");
        }
        lock.writeLock('roulette', release => {
            const uBets = this.userBets(bet.owner);
            for (let i = 0; i < uBets.length; i++) {
                //same user, same kind
                if (uBets[i].kind == bet.kind &&
                    (bet.kind != BETKIND.number || bet.kind == BETKIND.number && bet.number == uBets[i].number)) {
                    if (uBets[i].value == MAXBET) {
                        release();
                        return cb("Cannot update bet!");
                    }
                    levels.removePoints(bet.owner._id, bet.value, true, (err, points) => {
                        if (err) {
                            console.error(err);
                            cb("Something went wrong");
                        } else {
                            uBets[i].value += bet.value
                            console.log(bet.owner.email + " roulette bet: " + bet.value);
                            cb("Bet updated!");
                        }
                        release();
                    });
                    return;
                }
            }
            //otherwise, lets add a new bet
            levels.removePoints(bet.owner._id, bet.value, true, (err, points) => {
                if (err) {
                    console.error(err);
                    cb("Something went wrong");
                } else {
                    this._bets.push(new Bet(bet));
                    console.log(bet.owner.email + " roulette bet: " + bet.value);
                    cb("Bet added!");
                }
                release();
            });
        });
    }

    //returns an array of users with their bets
    getWinningUsers() {
        let users = [];
        for (let i = 0; i < this._bets.length; i++) {
            let found = false;
            for (let j = 0; j < users.length; j++) {
                if (this._bets[i].owner.email == users[j].owner.email) {
                    found = true;
                    users[j].bets.push(this._bets[i]);
                    break;
                }
            }
            if (!found) {
                users.push({
                    owner: this._bets[i].owner,
                    bets: [this._bets[i]]
                });
            }
        }
        return users;
    }

    //run the roulette
    run() {
        lock.writeLock('roulette', release => {
            this._isRunning = true;
            this._lastRunningTime = moment();
            if (this._bets.length == 0) {
                this._isRunning = false;
                return release();
            }
            const runningTimeSec = utils.getRandomInt(40, 60);
            console.log("Roulette is running!");
            //force update roulette
            for (let j = 0; j < activeUsers.length; j++) {
                updateRoulette(activeUsers[j]);
            }
            setTimeout(() => {
                const number = utils.getRandomInt(0, 37);
                console.log("Roulette lucky number is: " + number);
                this.lastWinnings = this.getWinningUsers();
                for (let i = 0; i < this.lastWinnings.length; i++) {
                    const winning = this.lastWinnings[i];
                    let totalBetValue = 0,
                        totalWinning = 0,
                        bets = [];
                    for (let j = 0; j < winning.bets.length; j++) {
                        let b = winning.bets[j],
                            bwin = b.getResult(number);
                        bets.push({
                            value: b.value,
                            number: b.number,
                            kind: b.kind,
                            win: bwin
                        });
                        totalWinning += bwin;
                        totalBetValue += b.value;
                    }
                    console.log(winning.owner.email + " roulette won: " + totalWinning);
                    levels.addPoints(winning.owner._id, totalWinning, true, (err, points) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    const newRouletteEvent = new DB.RouletteEvent({
                        owner: winning.owner._id,
                        number: number,
                        bets: bets
                    });
                    newRouletteEvent.save((err, evt) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                    //force update roulette
                    for (let j = 0; j < activeUsers.length; j++) {
                        updateRoulette(activeUsers[j]);
                    }
                    //send notifications to winner users
                    let msg = "*BTB Roulette results:*\n\nlucky number: *" + number + "* \n\nyour bets:";
                    for (let j = 0; j < winning.bets.length; j++) {
                        const isWinning = winning.bets[j].getResult(number) > 0;
                        msg += "\n" + (isWinning ? "✅" : "✖️") + " " + formatSingleBet(winning.bets[j]);
                    }
                    if (totalWinning - totalBetValue > 0) {
                        msg += "\n\nCongratulations!\nYou won *" + (totalWinning - totalBetValue) + " beercoins* 💰 !";
                    } else {
                        msg += "\n\nYou had no luck! Try again!";
                    }
                    require('../bot').bot.telegram.sendMessage(winning.owner.telegram.id, msg, {
                        parse_mode: "markdown"
                    });
                }
                this._bets = [];
                this.lastNumber = number;
                this._isRunning = false;
                release();
            }, 1000 * runningTimeSec);
        });
    }

}

const btbRoulette = new Roulette();

function deleteLastMessage(ctx) {
    if (ctx.session.updateMessageInterval)
        clearInterval(ctx.session.updateMessageInterval);
    if (ctx.session.rouletteMessage) {
        ctx.deleteMessage(ctx.session.rouletteMessage.message_id);
        delete ctx.session.rouletteMessage;
    }
    if (ctx.session.pictureMessage) {
        ctx.deleteMessage(ctx.session.pictureMessage.message_id);
        delete ctx.session.pictureMessage;
    }
}

function formatSingleBet(bet) {
    let text = "";
    if (bet.kind == BETKIND.even) {
        text += "even numbers";
    } else if (bet.kind == BETKIND.odd) {
        text += "odd numbers";
    } else if (bet.kind == BETKIND.manque) {
        text += "manque (1-18)";
    } else if (bet.kind == BETKIND.passe) {
        text += "passe (19-36)";
    } else if (bet.kind == BETKIND.red) {
        text += "red numbers";
    } else if (bet.kind == BETKIND.black) {
        text += "black numbers";
    } else if (bet.kind == BETKIND.number) {
        text += "number " + bet.number;
    }
    text += " (*" + bet.value + "* beercoin" + (bet.value > 1 ? "s" : "") + ")";
    return text;
}

function formatBet(bet) {
    return bot.getUserLink(bet.owner) + ": " + formatSingleBet(bet);
}

function formatRoulette(ctx, cb) {

    let text = "";
    if (btbRoulette.isRunning) {
        text += "*Roulette is running... please wait* " + (ctx.session.rouletteRunningIcon ? "⏳" : "⌛️");
    } else {
        text += "*Come on, place your bet!*\nNext run in *" + btbRoulette.nextRunDiff + "* " + (ctx.session.rouletteRunningIcon ? "⏳" : "⌛️");
    }
    ctx.session.rouletteRunningIcon = !ctx.session.rouletteRunningIcon;
    text += "\n[View Roulette Table](https://bitethebot.herokuapp.com/static/images/roulette-table.jpg)";

    if (!btbRoulette.isRunning) {
        if (btbRoulette.lastNumber != undefined)
            text += "\n\nlast winning number: *" + btbRoulette.lastNumber + "*";

        if (btbRoulette.lastWinnings != undefined && btbRoulette.lastNumber != undefined && btbRoulette.lastWinnings.length > 0) {
            text += "\nlast bets:";
            for (let i = 0; i < btbRoulette.lastWinnings.length; i++) {
                const totalBet = btbRoulette.lastWinnings[i].bets.reduce((sum, bet) => {
                        return sum + bet.value;
                    }, 0),
                    totalWin = btbRoulette.lastWinnings[i].bets.reduce((sum, bet) => {
                        return sum + bet.getResult(btbRoulette.lastNumber);
                    }, 0),
                    bcoins = totalWin - totalBet;
                text += "\n- " + bot.getUserLink(btbRoulette.lastWinnings[i].owner) + (btbRoulette.lastWinnings[i].owner._id == ctx.session.user._id ? " (*You*)" : "") + ": ";
                if (bcoins > 0) {
                    text += "won *" + bcoins + " beercoin" + (bcoins > 1 ? "s" : "") + "* 🎉";
                } else if (bcoins < 0) {
                    text += "lost *" + Math.abs(bcoins) + " beercoin" + (Math.abs(bcoins) > 1 ? "s" : "") + "* 💩";
                } else {
                    text += " had no luck! 😐";
                }
            }
        }
    }

    const userBets = btbRoulette.getBets();

    if (userBets.length > 0) {
        text += "\n\nBets:";
        for (let i = 0; i < userBets.length; i++) {
            text += "\n- " + formatBet(userBets[i]);
        }
    }

    if (ctx.session.bet && !btbRoulette.isRunning)
        text += "\n\nActual bet: *" + ctx.session.bet.value + " beercoin" + (ctx.session.bet.value > 1 ? "s" : "") + "* 💰";

    cb(text);

}

function updateRoulette(ctx, doNotResetUpdateCounter) {
    if (!doNotResetUpdateCounter)
        ctx.session.updateMessageCounter = 0;
    formatRoulette(ctx, text => {
        ctx.telegram.editMessageText(ctx.session.rouletteMessage.chat.id, ctx.session.rouletteMessage.message_id, null, text, ctx.session.rouletteOptions).then(() => {

        }, err => {
            //console.error(err);
            //console.error("cannot update message")
        });
    });
}

function initRoulette(ctx) {
    ctx.session.bet = new Bet({
        owner: ctx.session.user
    });
    ctx.session.rouletteRunningIcon = false;
    ctx.session.updateMessageCounter = 0;
    ctx.session.updateMessageInterval = setInterval(() => {
        ctx.session.updateMessageCounter += 1;
        if (ctx.session.updateMessageCounter > 30) { //30 * 10sec = 5mins timeout
            deleteLastMessage(ctx);
            ctx.reply("*BiteTheBot Roulette* was closed due to user inactivity", {
                parse_mode: "markdown",
                disable_notification: true
            });
            ctx.scene.enter('extra');
        } else {
            updateRoulette(ctx, true);
        }
    }, 10000);
    updateRoulette(ctx);
}

const activeUsers = [];
const scene = new Scene('roulette');
scene.enter((ctx) => {
    if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 0) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        if (!btbRoulette.enabled) {
            ctx.reply("*BiteTheBot Roulette* is out of service.\nCome back later.", {
                parse_mode: "markdown"
            });
            return ctx.scene.enter('extra', {}, true);
        } else if (btbRoulette.isRunning) {
            ctx.reply("*BiteTheBot Roulette* is running... please wait", {
                parse_mode: "markdown"
            });
            return ctx.scene.enter('extra', {}, true);
        }
        activeUsers.push(ctx);
        keyboards.roulette.getOptions(ctx, opts => {
            ctx.session.rouletteOptions = opts;
            ctx.reply(keyboards.roulette.text, {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    resize_keyboard: true,
                    keyboard: [
                        [{
                            text: keyboards.roulette.cmd.back
                        }]
                    ]
                })
            }).then(m => {
                ctx.replyWithSticker({
                    source: require('fs').createReadStream(__dirname + "/../img/roulette.gif")
                }).then(pictureMessage => {
                    ctx.session.pictureMessage = pictureMessage;
                    formatRoulette(ctx, text => {
                        ctx.telegram.sendMessage(ctx.session.user.telegram.id, text, ctx.session.rouletteOptions).then(message => {
                            ctx.session.rouletteMessage = message;
                            initRoulette(ctx);
                        });
                    });
                });
            });
        });
    } else {
        ctx.reply(text + "\nThis item is available only for level 1 users");
        return ctx.scene.enter('extra', {}, true);
    }
});

scene.leave(ctx => {
    for (let i = 0; i < activeUsers.length; i++) {
        if (activeUsers[i].session.user._id == ctx.session.user._id) {
            activeUsers.splice(i, 1);
            break;
        }
    }
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);
    if (ctx.message.text == keyboards.roulette.cmd.back) {
        //back button
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

function clearBet(ctx, cb) {
    ctx.session.bet = new Bet({
        owner: ctx.session.user
    });
    btbRoulette.clearUserBets(ctx.session.user, cb);
}

function checkCreditAvailability(ctx) {
    const previousBetsValue = btbRoulette.userBets(ctx.session.user).reduce((sum, bet) => {
        return sum + bet.value;
    }, 0);
    if ((previousBetsValue + ctx.session.bet.value) > ctx.session.user.points) {
        ctx.answerCbQuery("You don't have enought credits!");
        return false;
    }
    return true;
}

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (btbRoulette.isRunning)
        return ctx.answerCbQuery("Roulette is running!");
    if (ctx.update.callback_query.data.indexOf("betmore") == 0) {
        ctx.session.bet.increment(parseInt(ctx.update.callback_query.data.replace("betmore", "")));
        updateRoulette(ctx);
        ctx.answerCbQuery("Actual bet updated!");
    } else if (ctx.update.callback_query.data.indexOf("betless") == 0) {
        ctx.session.bet.decrement(parseInt(ctx.update.callback_query.data.replace("betless", "")));
        updateRoulette(ctx);
        ctx.answerCbQuery("Actual bet updated!");
    } else if (!isNaN(parseInt(ctx.update.callback_query.data)) && checkCreditAvailability(ctx)) {
        ctx.session.bet.kind = BETKIND.number;
        ctx.session.bet.number = parseInt(ctx.update.callback_query.data);
        btbRoulette.addBet(ctx.session.bet, (msg) => {
            ctx.session.bet = new Bet({
                owner: ctx.session.user
            });
            updateRoulette(ctx);
            ctx.answerCbQuery(msg);
        });
    } else if (ctx.update.callback_query.data == keyboards.roulette.cmd.clear) {
        clearBet(ctx, () => {
            updateRoulette(ctx);
            ctx.answerCbQuery("Bet cleared!");
        });
    } else if (keyboards.roulette.availableCmd.indexOf(ctx.update.callback_query.data) && checkCreditAvailability(ctx)) {
        ctx.session.bet.kind = BETKIND[ctx.update.callback_query.data];
        btbRoulette.addBet(ctx.session.bet, (msg) => {
            ctx.session.bet = new Bet({
                owner: ctx.session.user
            });
            updateRoulette(ctx);
            ctx.answerCbQuery(msg);
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;