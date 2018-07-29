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
        this.enabled = false;
        this._interval = 60000 * 30; //running interval (default 30mins)
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
        return (minutes > 0 ? (minutes + " minute") : "") + (minutes > 1 ? "s" : "") + " and " + seconds + " seconds";
    }

    clearUserBets(owner, cb) {
        lock.writeLock('roulette', release => {
            this._bets = this._bets.filter(b => b.owner._id != owner._id);
            release();
            cb();
        });
    }

    userBets(owner) {
        return this._bets.filter(b => b.owner._id == owner._id);
    }

    getBets(cb) {
        lock.readLock('roulette', release => {
            cb(this._bets);
            release();
        });
    }

    addBet(bet, cb) {
        lock.writeLock('roulette', release => {
            const uBets = this.userBets(bet.owner);
            for (let i = 0; i < uBets.length; i++) {
                //same user, same kind
                if (uBets[i].kind == bet.kind &&
                    (bet.kind != BETKIND.number || bet.kind == BETKIND.number && bet.number == uBets[i].number)) {
                    uBets[i].value += bet.value
                    release();
                    return cb();
                }
            }
            //otherwise, lets add a new bet
            this._bets.push(new Bet(bet));
            release();
            cb();
        });
    }

    getBetUsers() {
        let users = [];
        for (let i = 0; i < this._bets.length; i++) {
            let found = false;
            for (let j = 0; j < users.length; j++) {
                if (this._bets[i].owner._id == users[j]._id) {
                    found == true;
                    break;
                }
            }
            if (!found)
                users.push(this._bets[i].owner);
        }
        return users;
    }

    //run the roulette
    run() {
        lock.writeLock('roulette', release => {
            this._lastRunningTime = moment();
            if (this._bets.length == 0)
                return release();
            this._isRunning = true;
            const runningTimeSec = utils.getRandomInt(10, 30);
            console.log("Roulette is running!");
            setTimeout(() => {
                const number = utils.getRandomInt(0, 37);
                console.log("Roulette lucky number is: " + number);
                const users = this.getBetUsers();
                for (let i = 0; i < this._bets.length; i++) {
                    if (this._bets[i].getResult(number) > 0) {

                    }
                }
                this._isRunning = false;
                release();
            }, 1000 * runningTimeSec);
        });
    }

}

const btbRoulette = new Roulette();


/*0-36

0 verde
1-rosso
2-nero

PIENO (A)
UN NUMERO PIENO: 35 VOLTE LA POSTA

MANQUE (I)
(1-18): 1 VOLTA LA POSTA
PASSE (L)
(19-36): 1 VOLTA LA POSTA
ROSSO O NERO (M)
1 VOLTA LA POSTA
PARI O DISPARI (N)
1 VOLTA LA POSTA

*/

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

function formatBet(bet) {
    let text = bot.getUserLink(bet.owner) + ": ";
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

function formatRoulette(ctx, cb) {

    let text = "*Come on, place your bet!*\nNext run in *" + btbRoulette.nextRunDiff + "*";

    btbRoulette.getBets((userBets) => {

        if (userBets.length > 0) {
            text += "\n\nBets:";
            for (let i = 0; i < userBets.length; i++) {
                text += "\n- " + formatBet(userBets[i]);
            }
        }

        if (ctx.session.bet)
            text += "\n\nActual bet: *" + ctx.session.bet.value + " beercoin" + (ctx.session.bet.value > 1 ? "s" : "") + "* 💰";

        cb(text);
    });
}

function initRoulette(ctx) {
    ctx.session.bet = new Bet({
        owner: ctx.session.user
    });
    ctx.session.updateMessageInterval = setInterval(() => {
        formatRoulette(ctx, text => {
            ctx.telegram.editMessageText(ctx.session.rouletteMessage.chat.id, ctx.session.rouletteMessage.message_id, null, text, ctx.session.rouletteOptions).then(() => {

            }, err => {
                console.error(err);
            });
        });
    }, 1000);

}

const scene = new Scene('roulette');
scene.enter((ctx) => {
    if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 0) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        if (!btbRoulette.enabled) {
            ctx.reply("BTB roulette is not available yet.\nCome back later.");
            return ctx.scene.enter('extra');
        } else if (btbRoulette.isRunning) {
            ctx.reply("BTB roulette is running... please wait");
            return ctx.scene.enter('extra');
        }
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
        return ctx.scene.enter('extra');
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

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data.indexOf("betmore") == 0) {
        ctx.session.bet.increment(parseInt(ctx.update.callback_query.data.replace("betmore", "")));
        ctx.answerCbQuery("Bet incremented!");
    } else if (ctx.update.callback_query.data.indexOf("betless") == 0) {
        ctx.session.bet.decrement(parseInt(ctx.update.callback_query.data.replace("betless", "")));
        ctx.answerCbQuery("Bet decremented!");
    } else if (!isNaN(parseInt(ctx.update.callback_query.data))) {
        ctx.session.bet.kind = BETKIND.number;
        ctx.session.bet.number = parseInt(ctx.update.callback_query.data);
        btbRoulette.addBet(ctx.session.bet, () => {
            ctx.session.bet = new Bet({
                owner: ctx.session.user
            });
            ctx.answerCbQuery("Bet done!");
        });
    } else if (ctx.update.callback_query.data == keyboards.roulette.cmd.clear) {
        clearBet(ctx, () => {
            ctx.answerCbQuery("Bet cleared!");
        });
    } else if (keyboards.roulette.availableCmd.indexOf(ctx.update.callback_query.data)) {
        ctx.session.bet.kind = BETKIND[ctx.update.callback_query.data];
        btbRoulette.addBet(ctx.session.bet, () => {
            ctx.session.bet = new Bet({
                owner: ctx.session.user
            });
            ctx.answerCbQuery("Bet done!");
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;