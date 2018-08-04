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
        odd: 6,
        firstDozen: 7,
        secondDozen: 8,
        thirdDozen: 9,
        firstColumn: 10,
        secondColumn: 11,
        thirdColumn: 12
    },
    MAXBET = 50,
    MINBET = 1,
    redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

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
        } else if (this.kind == BETKIND.firstDozen && number > 0 && number < 13) {
            return this.value * 3;
        } else if (this.kind == BETKIND.secondDozen && number > 12 && number < 25) {
            return this.value * 3;
        } else if (this.kind == BETKIND.thirdDozen && number > 24) {
            return this.value * 3;
        } else if (this.kind == BETKIND.firstColumn && [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].indexOf(number) >= 0) {
            return this.value * 3;
        } else if (this.kind == BETKIND.secondColumn && [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].indexOf(number) >= 0) {
            return this.value * 3;
        } else if (this.kind == BETKIND.thirdColumn && [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].indexOf(number) >= 0) {
            return this.value * 3;
        }
        return 0;
    }
}

class Roulette {

    constructor(config) {
        this._bets = [];
        this._isRunning = false;
        this.enabled = process.env.ROULETTE_ENABLED || false;
        this._interval = process.env.NODE_ENV == "production" ? (60000 * 33) : (20000); //production running interval (33mins)
        this._lastRunningTime = moment();
        this.runningInterval = setInterval(() => {
            this._lastRunningTime = moment();
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
            if (totalValue > 0)
                console.log("clearbets for " + owner.email + ": " + totalValue);
            levels.addPoints(owner._id, totalValue, true, (err, points) => {
                if (err) {
                    console.error(err);
                }
                this._bets = this._bets.filter(b => b.owner._id != owner._id);
                release();
                cb();
            }, true); //disable levelUp notifications in case of
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
                            console.log(bet.owner.email + " roulette bet update: " + bet.value + " kind: " + bet.kind + (bet.kind == BETKIND.number ? (" number: " + bet.number) : ""));
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
                    console.log(bet.owner.email + " roulette bet: " + bet.value + " kind: " + bet.kind);
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

    //simulate the roulette wheel running 
    wheelRun() {
        //37 positions wheel with numbers from 0 to 36 included
        const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
            startPoint = utils.getRandomInt(0, 37),
            steps = utils.getRandomInt(100, 500);
        return wheel[(startPoint + steps) % 37];
    }

    //run the roulette
    run() {
        lock.writeLock('roulette', release => {
            if (this._bets.length == 0) {
                return release();
            }
            this._isRunning = true;
            //force update roulette
            for (let j = 0; j < activeUsers.length; j++) {
                updateRoulette(activeUsers[j]);
            }
            this.lastRun = moment();
            const runningTimeSec = utils.getRandomInt(40, 60);
            console.log("Roulette is running!");
            setTimeout(() => {
                const number = this.wheelRun();
                console.log("Roulette lucky number is: " + number + "-" + (number == 0 ? "green" : (redNumbers.indexOf(number) >= 0 ? "red" : "black")));
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
                    console.log("Roulette " + winning.owner.email + " got: " + (totalWinning - totalBetValue));
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
                    //send notifications to winner users
                    let msg = "*BTB Roulette results:*\n\nLucky number: *" + number + "* " + (number == 0 ? "" : (redNumbers.indexOf(number) >= 0 ? "🔴" : "⚫️")) + "\n\nYour bets:";
                    for (let j = 0; j < winning.bets.length; j++) {
                        const isWinning = winning.bets[j].getResult(number) > 0;
                        msg += "\n" + (isWinning ? "✅" : "✖️") + " " + formatSingleBet(winning.bets[j]);
                    }
                    msg += "\n\nTotal bets: " + totalBetValue + " beercoin" + (totalBetValue > 1 ? "s" : "");
                    msg += "\nTotal winning: " + totalWinning + " beercoin" + (totalWinning > 1 ? "s" : "");
                    const bcoins = totalWinning - totalBetValue;
                    if (bcoins > 0) {
                        msg += "\n\nCongratulations!\nYou won *" + bcoins + " beercoin" + (bcoins > 1 ? "s" : "") + "* 💰 !";
                    } else if (bcoins < 0) {
                        msg += "\n\nYou lost *" + Math.abs(bcoins) + " beercoin" + (Math.abs(bcoins) > 1 ? "s" : "") + "* 💩";
                    } else {
                        msg += "\n\nYou had no luck! 😐";
                    }
                    require('../bot').bot.telegram.sendMessage(winning.owner.telegram.id, msg, {
                        parse_mode: "markdown"
                    }).then(() => {
                        //all ok
                    }, err => {
                        console.error(err);
                    });
                }
                this._bets = [];
                this.lastNumber = number;
                this._isRunning = false;
                //force update roulette
                for (let j = 0; j < activeUsers.length; j++) {
                    updateRoulette(activeUsers[j]);
                }
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
        ctx.deleteMessage(ctx.session.rouletteMessage.message_id).then(() => {
            //all ok
        }, err => {
            console.error(err);
        });
        delete ctx.session.rouletteMessage;
    }
    if (ctx.session.pictureMessage) {
        ctx.deleteMessage(ctx.session.pictureMessage.message_id).then(() => {
            //all ok
        }, err => {
            console.error(err);
        });
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
    } else if (bet.kind == BETKIND.firstDozen) {
        text += "first dozen";
    } else if (bet.kind == BETKIND.secondDozen) {
        text += "second dozen";
    } else if (bet.kind == BETKIND.thirdDozen) {
        text += "third dozen";
    } else if (bet.kind == BETKIND.firstColumn) {
        text += "first column";
    } else if (bet.kind == BETKIND.secondColumn) {
        text += "second column";
    } else if (bet.kind == BETKIND.thirdColumn) {
        text += "third column";
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

    if (!btbRoulette.isRunning) {
        if (btbRoulette.lastNumber != undefined)
            text += "\n\nLast run: *" + moment(btbRoulette.lastRun).format("Do MMMM YYYY HH:mm") + "*\nLast winning number: *" + btbRoulette.lastNumber + "* " + (btbRoulette.lastNumber == 0 ? "" : (redNumbers.indexOf(btbRoulette.lastNumber) >= 0 ? "🔴" : "⚫️"));
        if (btbRoulette.lastWinnings != undefined && btbRoulette.lastNumber != undefined && btbRoulette.lastWinnings.length > 0) {
            text += "\nLast bets:";
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
        text += "\n\nActual bets:";
        for (let i = 0; i < userBets.length; i++) {
            text += "\n- " + formatBet(userBets[i]);
        }
    }

    if (ctx.session.bet && !btbRoulette.isRunning)
        text += "\n\nDefault bet: *" + ctx.session.bet.value + " beercoin" + (ctx.session.bet.value > 1 ? "s" : "") + "* 💰\nCredits: *" + ctx.session.user.points + "*";

    text += "\n\n[Roulette Table](https://bitethebot.herokuapp.com/static/images/roulette-table.jpg):";

    cb(text);
}

function updateRoulette(ctx, doNotResetUpdateCounter) {
    if (!doNotResetUpdateCounter)
        ctx.session.updateMessageCounter = 0;
    if (ctx.session.rouletteMessage) {
        const opts = (btbRoulette.isRunning ? {
            parse_mode: "markdown",
            reply_markup: undefined
        } : ctx.session.rouletteOptions);
        formatRoulette(ctx, text => {
            ctx.telegram.editMessageText(ctx.session.rouletteMessage.chat.id, ctx.session.rouletteMessage.message_id, null, text, opts).then(() => {

            }, err => {
                console.error("cannot update roulette message");
            });
        });
    }
}

function initRoulette(ctx) {
    ctx.session.bet = new Bet({
        owner: ctx.session.user
    });
    ctx.session.rouletteRunningIcon = false;
    ctx.session.updateMessageCounter = 0;
    if (ctx.session.updateMessageInterval)
        clearInterval(ctx.session.updateMessageInterval);
    ctx.session.updateMessageInterval = setInterval(() => {
        ctx.session.updateMessageCounter += 1;
        if (ctx.session.updateMessageCounter > 10) { // 30sec * 10 = 5mins timeout
            ctx.session.updateMessageCounter = 0;
            deleteLastMessage(ctx);
            const opts = keyboards.extra(ctx).opts; //use the extra keyboard
            opts.disable_notification = true; //disable notification for the next message
            ctx.reply("*BiteTheBot Roulette* has been closed due to user inactivity", opts).then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
            ctx.scene.enter('extra', {}, true); //silently enter extra scene
        } else {
            updateRoulette(ctx, true);
        }
    }, 30000);
    updateRoulette(ctx);
}

const activeUsers = [];
const scene = new Scene('roulette');
scene.enter((ctx) => {
    if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 0) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        if (!btbRoulette.enabled) {
            ctx.reply("*BiteTheBot Roulette* is out of service.\nCome back later.", {
                parse_mode: "markdown"
            }).then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
            return ctx.scene.enter('extra', {}, true);
        } else if (btbRoulette.isRunning) {
            let text = "*BiteTheBot Roulette* is running... please wait.";
            const userBets = btbRoulette.getBets();
            if (userBets.length > 0) {
                text += "\n\nActual bets:";
                for (let i = 0; i < userBets.length; i++) {
                    text += "\n- " + formatBet(userBets[i]);
                }
            }
            ctx.reply(text, {
                parse_mode: "markdown"
            }).then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
            return ctx.scene.enter('extra', {}, true);
        }
        ctx.session.rouletteInitComplete = false;
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
                            ctx.session.rouletteInitComplete = true;
                        });
                    });
                }, err => {
                    console.error(err);
                });
            }, err => {
                console.error(err);
            });
        });
    } else {
        ctx.reply(text + "\nThis item is available only for level 1 users").then(() => {
            //all ok
        }, err => {
            console.error(err);
        });
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
    if (ctx.session.updateMessageInterval)
        clearInterval(ctx.session.updateMessageInterval);
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.rouletteInitComplete) {
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
}

scene.on("text", textManager);

function clearBet(ctx, cb) {
    ctx.session.bet = new Bet({
        owner: ctx.session.user
    });
    btbRoulette.clearUserBets(ctx.session.user, cb);
}

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (btbRoulette.isRunning)
        return ctx.answerCbQuery("Roulette is running!");
    if (ctx.update.callback_query.data.indexOf("betmore") == 0) {
        ctx.session.bet.increment(parseInt(ctx.update.callback_query.data.replace("betmore", "")));
        updateRoulette(ctx);
        ctx.answerCbQuery("Default bet set to " + ctx.session.bet.value).then(() => {
            //all ok
        }, err => {
            console.error(err);
        });
    } else if (ctx.update.callback_query.data.indexOf("betless") == 0) {
        ctx.session.bet.decrement(parseInt(ctx.update.callback_query.data.replace("betless", "")));
        updateRoulette(ctx);
        ctx.answerCbQuery("Default bet set to " + ctx.session.bet.value).then(() => {
            //all ok
        }, err => {
            console.error(err);
        });
    } else if (!isNaN(parseInt(ctx.update.callback_query.data))) {
        if (ctx.session.bet.value > ctx.session.user.points) {
            return ctx.answerCbQuery("You don't have enought credits!").then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
        }
        ctx.session.bet.kind = BETKIND.number;
        ctx.session.bet.number = parseInt(ctx.update.callback_query.data);
        btbRoulette.addBet(ctx.session.bet, (msg) => {
            ctx.session.bet = new Bet({
                owner: ctx.session.user,
                value: ctx.session.bet.value //keep the selected default value
            });
            updateRoulette(ctx);
            ctx.answerCbQuery(msg).then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
        });
    } else if (ctx.update.callback_query.data == keyboards.roulette.cmd.clear) {
        clearBet(ctx, () => {
            updateRoulette(ctx);
            ctx.answerCbQuery("Bet cleared!").then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
        });
    } else if (keyboards.roulette.availableCmd.indexOf(ctx.update.callback_query.data)) {
        if (ctx.session.bet.value > ctx.session.user.points) {
            return ctx.answerCbQuery("You don't have enought credits!").then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
        }
        ctx.session.bet.kind = BETKIND[ctx.update.callback_query.data];
        if (ctx.session.bet.kind != undefined) {
            btbRoulette.addBet(ctx.session.bet, (msg) => {
                ctx.session.bet = new Bet({
                    owner: ctx.session.user,
                    value: ctx.session.bet.value //keep the selected default value
                });
                updateRoulette(ctx);
                ctx.answerCbQuery(msg).then(() => {
                    //all ok
                }, err => {
                    console.error(err);
                });
            });
        } else {
            console.error("Invalid bet kind: " + ctx.update.callback_query.data)
            ctx.answerCbQuery("Cannot add bet.").then(() => {
                //all ok
            }, err => {
                console.error(err);
            });
        }
    } else {
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;