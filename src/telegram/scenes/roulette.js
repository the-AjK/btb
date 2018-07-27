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

class Bet {
    constructor(bet) {
        this.owner = bet.owner;
        this.number = bet.number || null;
        this.numberBet = bet.numberBet || 0;
        this.manque = bet.manque || 0;
        this.passe = bet.passe || 0;
        this.red = bet.red || 0;
        this.black = bet.black || 0;
        this.even = bet.even || 0;
        this.odd = bet.odd || 0;
    }

    isWinner(number) {
        return true;
    }
}

class Roulette {

    constructor(config) {
        this._bets = [];
        this._isRunning = false;
        this.enabled = true;
        this._interval = 60000 * 12; //running interval (default 30mins)
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

    userBets(owner) {
        return this._bets.filter(b => b.owner._id == owner._id);
    }

    addBet(bet) {
        lock.writeLock('roulette', release => {
            this._bets.push(new Bet(bet));
            release();
        });
    }

    //clear all bets of an owner
    clear(owner) {
        lock.writeLock('roulette', release => {
            this._bets.push(new Bet(bet));
            release();
        });
    }

    //run the roulette
    run() {
        lock.writeLock('roulette', release => {
            this._isRunning = true;
            this._lastRunningTime = moment();
            const runningTimeSec = utils.getRandomInt(10, 30);
            console.log("Roulette is running!");
            setTimeout(() => {
                const number = utils.getRandomInt(0, 37);
                console.log("Roulette lucky number is: " + number);
                for (let i = 0; i < this._bets.length; i++) {
                    if (this._bets[i].isWinner(number)) {

                    }
                }

                this._isRunning = false;
                release();
            }, 1000 * runningTimeSec);
        });
    }

}

const btbRoulette = new Roulette();

btbRoulette.addBet({
    owner: {}
})


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
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function formatRoulette(ctx) {


    let text = keyboards.roulette.text;

    text += "\n\nNext run in " + btbRoulette.nextRunDiff;

    let userBets = btbRoulette.userBets(ctx.session.user);
    if (userBets.length > 0) {
        text += "\n\nYour bets:";
        for (let i = 0; i < userBets.length; i++) {
            text += "\n- bet";
        }
    } else {
        text += "\n\nNo bets";
    }

    return text;
}

function initRoulette(ctx) {
    ctx.session.roulette.bet = new Bet({
        owner: ctx.session.user
    });
    ctx.telegram.editMessageText(ctx.session.roulette.message.chat.id, ctx.session.roulette.message.message_id, null, formatRoulette(ctx), {
        parse_mode: "markdown"
    }).then(() => {

    }, err => {
        console.error(err);
    });
    ctx.session.roulette.updateMessageInterval = setInterval(() => {
        console.log(ctx.session.roulette.message.chat.id)
        console.log(ctx.session.roulette.message.message_id)
        
    }, 10000);

}

const scene = new Scene('roulette')
scene.enter((ctx) => {
    if (!btbRoulette.enabled) {
        ctx.reply("BTB roulette is not available now");
        ctx.scene.leave();
        return ctx.scene.enter('extra');
    } else if (btbRoulette.isRunning) {
        ctx.reply("BTB roulette is running... please wait");
        ctx.scene.leave();
        return ctx.scene.enter('extra');
    }

    keyboards.roulette.getOptions(ctx, opts => {
        ctx.reply(formatRoulette(ctx), opts).then(m => {
            ctx.session.roulette = {
                message: m
            }
            initRoulette(ctx);
        });
    });
});

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.roulette[ctx.message.text]) {
        keyboards.roulette[ctx.message.text](ctx);
    } else if (ctx.message.text == keyboards.roulette.cmd.back) {
        //back button
        ctx.scene.leave();
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == "aaa") {

    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;