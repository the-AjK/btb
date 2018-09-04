/**
 * slot.js
 * Slot scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    async = require("async"),
        moment = require("moment"),
        roles = require("../../roles"),
        checkUserAccessLevel = roles.checkUserAccessLevel,
        checkUser = roles.checkUser,
        userRoles = roles.userRoles,
        accessLevels = roles.accessLevels,
        levels = require('../../levels'),
        DB = require("../../db"),
        bot = require('../bot'),
        ACTIONS = bot.ACTIONS;

const scene = new Scene('shop')
scene.enter((ctx) => {
    if (levels.getLevel(ctx.session.user.points) > 0 || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        //authorized user
        ctx.reply(keyboards.shop(ctx).text, keyboards.shop(ctx).opts).then(() => {

        });
    } else {
        //unauthorized user -> back to extra
        ctx.scene.enter('extra');
    }
});

scene.leave((ctx) => {

});

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    deleteLastMessage(ctx);

    if (keyboards.shop(ctx)[ctx.message.text]) {
        keyboards.shop(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.shop(ctx).cmd.trade) {
        ctx.scene.enter('tradeWizard');
    } else if (ctx.message.text == keyboards.shop(ctx).cmd.bombs) {
        ctx.scene.enter('bombsWizard');
    } else if (ctx.message.text == keyboards.shop(ctx).cmd.back) {
        //back button
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

scene.on("callback_query", ctx => {

    if (levels.getLevel(ctx.session.user.points) < 1 && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
        //unauthorized user -> back to extra
        return ctx.scene.enter('extra');
    }

    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == "gun") {
        deleteLastMessage(ctx);
        buyGun(ctx);
    } else if (ctx.update.callback_query.data == "shield") {
        deleteLastMessage(ctx);
        buyShield(ctx);
    } else if (ctx.update.callback_query.data == "hp") {
        deleteLastMessage(ctx);
        bot.enterScene(ctx, 'hp');
    } else if (ctx.update.callback_query.data == "news") {
        sendNews(ctx);
    } else if (ctx.update.callback_query.data == "newspremium") {
        sendNews(ctx, true);
    } else {
        ctx.scene.leave();
        //fallback to main bot scen
        bot.callbackQueryManager(ctx);
    }
});

exports.scene = scene;

function buyGun(ctx) {
    const price = 5; //5beercoins
    if (ctx.session.user.backpack.guns > 0) {
        return ctx.reply("You already have a watergun 🔫 !");
    } else if (ctx.session.user.points < price) {
        return ctx.reply("You don't have enough beercoins!");
    }
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        "$inc": {
            "backpack.guns": 1
        }
    }, {
        new: true
    }, (err, user) => {
        if (err) {
            console.error(err);
            return ctx.reply('Something went wrong!');
        }
        ctx.session.user = user;
        ctx.reply('Here you are!\nYou just got a brand new *watergun* 🔫 !', {
            parse_mode: "markdown"
        });
        levels.removePoints(ctx.session.user._id, price, true, (err) => {
            if (err) {
                console.error(err);
            }
        });
    });
}

function buyShield(ctx) {
    const price = 5; //5beercoins
    if (ctx.session.user.backpack.shields > 0) {
        return ctx.reply("You already have a bomb shield 🛡 !");
    } else if (ctx.session.user.points < price) {
        return ctx.reply("You don't have enough beercoins!");
    }
    DB.User.findByIdAndUpdate(ctx.session.user._id, {
        "$inc": {
            "backpack.shields": 1
        }
    }, {
        new: true
    }, (err, user) => {
        if (err) {
            console.error(err);
            return ctx.reply('Something went wrong!');
        }
        ctx.session.user = user;
        ctx.reply('Here you are!\nYou just got a brand new *bomb shield* 🛡 !', {
            parse_mode: "markdown"
        });
        levels.removePoints(ctx.session.user._id, price, true, (err) => {
            if (err) {
                console.error(err);
            }
        });
    });
}

function formatNews(news, topUsers, dailyOrders, premium) {
    let text = "*~~~ Latest BiteTheBot News" + (premium ? " (Premium)" : "") + " ~~~*",
        newsListLenght = premium ? 70 : 50,
        limit = news.length > newsListLenght ? newsListLenght : news.length,
        actualDate;

    if (topUsers && topUsers.length) {
        let user = topUsers[0],
            userLink = bot.getUserLink(user) + " (" + user.points + ")";
        text += "\n\n*Top user*: 🥇 " + userLink;
    }

    if (dailyOrders && dailyOrders.length) {
        let dailyWinner = dailyOrders[0].owner;
        text += "\n\n*Daily winner*: 🍺 " + bot.getUserLink(dailyWinner) + " was the first to place the daily order!";

        if (!moment().isBefore(moment(dailyOrders[0].menu.deadline))) {
            let dailyLooser = dailyOrders[dailyOrders.length - 1].owner;
            text += "\n\n*Daily loser*: 💩 " + bot.getUserLink(dailyLooser) + " was the last to place the daily order!";
        }
    }

    if (premium) {
        const activeSessions = bot.session.getTopSessions();
        if (activeSessions && activeSessions.length) {
            const s = activeSessions[0];
            text += "\n\n*Most active user*: 🏃 " + bot.getUserLink(s.user) +
                "\n*User sessions*: " + activeSessions.length;
        }
    }

    text += "\n\n*Events*:";

    for (let i = 0; i < limit; i++) {
        let n = news[i];
        if ((!premium && n.type != undefined && !n.drunk) || //normal beers are show on premium only newspaper
            (n.type != undefined && n.locked) || //locked beers are not show on newspaper
            !n.owner) { //skipping events without the owner, should never happen tho, but who knows!
            if (news.length > limit)
                limit++;
            continue;
        }
        let user = bot.getUserLink(n.owner),
            date = moment(n.createdAt).format('Do MMMM YYYY'),
            hour = moment(n.createdAt).format('HH:mm');
        if (actualDate != date) {
            actualDate = date;
            text += "\n\n_" + actualDate + "_:";
        }
        text += "\n_" + hour + "_ - " + user;
        if (n.recipient != undefined && n.kind == "TradeEvent") {
            //trade stuff
            text += " sent 💰 " + n.quantity + " beercoin" + (n.quantity > 1 ? "s" : "") + " to " + bot.getUserLink(n.recipient);
        } else if (n.recipient != undefined && n.kind == "BombEvent") {
            //bombs stuff
            const bombedUser = bot.getUserLink(n.recipient);
            if (n.shield) {
                text += " tried to drop " + n.quantity + " bomb" + (n.quantity > 1 ? "s" : "") + " to " + bombedUser + " but found a bombshield 🛡";
            } else {
                text += " dropped 💣 " + n.quantity + " bomb" + (n.quantity > 1 ? "s" : "") + " to " + bombedUser;
            }
        } else if (n.rating != undefined) {
            //rating stuff
            text += " gave ⭐️ " + n.rating + " stars to the daily lunch";
        } else if (n.level != undefined) {
            //levelup stuff
            text += " level up! 🔝";
        } else if (n.points != undefined) {
            //slot stuff
            if (n.bet != undefined && n.bet == 0) {
                text += " got a free daily run and";
            }
            if (n.points < 0) {
                text += " lost " + (n.points * -1) + " slot points 🎰";
            } else if (n.points == 0) {
                text += " had no luck with the slot!";
            } else {
                if (n.robbedUser != undefined) {
                    user = bot.getUserLink(n.robbedUser);
                    if (n.gun) {
                        text += " tried to steal " + n.points + " beercoins from " + user + " but found a watergun 🔫";
                    } else {
                        text += " stole 💰 " + n.points + " beercoins from " + user;
                    }
                } else if (n.bombedUser != undefined) {
                    user = bot.getUserLink(n.bombedUser);
                    if (n.shield) {
                        text += " tried to send " + n.points + " bombs to " + user + " but found a bombshield 🛡";
                    } else {
                        text += " sent 💣 " + n.points + " bombs to " + user;
                    }
                } else {
                    text += " won " + n.points + " slot points 🎰";
                }
            }
        } else if (n.number != undefined) {
            //roulette stuff
            const totalBets = n.bets.reduce((sum, bet) => {
                    return sum + bet.value;
                }, 0),
                totalWin = n.bets.reduce((sum, bet) => {
                    return sum + bet.win;
                }, 0),
                bcoins = totalWin - totalBets;
            if (bcoins > 0) {
                text += " won " + bcoins + " beercoin" + (bcoins > 1 ? "s" : "") + " at the roulette!";
            } else if (bcoins < 0) {
                text += " lost " + Math.abs(bcoins) + " beercoin" + (Math.abs(bcoins) > 1 ? "s" : "") + " at the roulette!";
            } else {
                text += " had no luck with the roulette!";
            }
        } else if (n.type != undefined) {
            //beer stuff
            if (n.type == 0) {
                text += " sent a beer 🍺";
            } else {
                text += " sent a double beer 🍻";
            }
            if (n.drunk) {
                text += " and made the bot drunk 😵";
            }
        } else if (n.menu != undefined) {
            //menu stuff
            text += " place a daily order 🍽";
        } else if (n.history != undefined) {
            //HP stuff
            const burnedUser = n.history.length ? n.history[n.history.length - 1].owner : n.owner;
            let damage = n.history.length ? n.history[n.history.length - 1].damage : 1;
            text += " threw an HotPotato 🥔 ";
            switch (damage) {
                case 1:
                    damage = "first";
                    break;
                case 2:
                    damage = "second";
                    break;
                case 3:
                    damage = "third";
                    break;
                case 4:
                    damage = "fourth";
                    break;
                case 5:
                    damage = "fifth";
                    break;
            }
            if (burnedUser.email != n.owner.email) {
                text += "! " + bot.getUserLink(burnedUser) + " got " + damage + " degree burns!";
            } else {
                text += "and got " + damage + " degree burns!";
            }
        }
        //Current maximum message length is 4096 UTF8 characters
        if (text.length > 4000)
            break;
    }

    return text;
}

function sendNews(ctx, premium) {

    console.log((premium ? "Premium " : "") + "News request from user: " + ctx.session.user.email)
    let funList = [];

    //Res0
    funList.push(function () {
        return (cb) => {
            DB.GenericEvent.find({
                    locked: {
                        '$ne': true //avoid locked beers events
                    }
                }, null, {
                    sort: {
                        createdAt: -1
                    },
                    limit: 50
                })
                .populate('history.owner')
                .populate('owner')
                .populate('recipient')
                .populate('bombedUser')
                .populate('robbedUser')
                .exec(cb);
        }
    }());

    //Res1
    funList.push(function () {
        return (cb) => {
            DB.Order.find({
                deleted: false
            }, {
                owner: 1,
                menu: 1,
                createdAt: 1
            }, {
                sort: {
                    createdAt: -1
                },
                limit: 50
            }).populate('owner').exec(cb);
        }
    }());

    //Res2
    funList.push(function () {
        return (cb) => {
            DB.getTopTenUsers(cb);
        }
    }());

    //Res3
    funList.push(function () {
        return (cb) => {
            DB.getDailyOrders(null, (err, res) => {
                if (err) {
                    console.error(err);
                }
                cb(null, res || []);
            });
        }
    }());

    async.parallel(funList, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            const results = result[0].concat(result[1]);
            //desc createdAt sorting
            results.sort((t1, t2) => {
                if (t1.createdAt > t2.createdAt) {
                    return -1
                } else if (t1.createdAt < t2.createdAt) {
                    return 1
                } else {
                    return 0;
                }
            });
            deleteLastMessage(ctx);
            ctx.reply(formatNews(results, result[2], result[3], premium), {
                parse_mode: "markdown"
            });
            if (premium && !checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
                levels.removePoints(ctx.session.user._id, 1, true, (err, p) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }
        }
    });
}