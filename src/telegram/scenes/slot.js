/**
 * slot.js
 * Slot scene
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
    Scene = require('telegraf/scenes/base'),
    keyboards = require('../keyboards'),
    async = require("async"),
    moment = require("moment"),
    PaginatedInlineKeyboard = require("../tools/paginatedInlineKeyboard").PaginatedInlineKeyboard,
    roles = require("../../roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    levels = require('../../levels'),
    utils = require('../../utils'),
    beers = require('../beers'),
    DB = require("../../db"),
    bot = require('../bot'),
    ACTIONS = bot.ACTIONS;

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

class Slot {
    constructor(row, col, colElements) {
        this._row = row;
        this._col = col;
        this._progress = 0;
        this._position = [];
        this.isRunning = false;
        this._elements = ["🍔", "🚰", "💣", "💰", "🍺"];
        this._colElements = this._elements.length;
        this.initPosition();
        this.initSlot();
        while (this.isWinningState()) {
            this.initSlot();
        }
    }

    initSlot() {
        this._slot = [];
        for (let i = 0; i < this._col; i++) {
            this._slot.push([]);
            for (let j = 0; j < this._colElements; j++) {
                let element = this.getRandomElement();
                if (this._slot[i].indexOf(element) < 0) {
                    this._slot[i].push(element);
                } else {
                    j--;
                }
            }
            shuffle(this._slot[i]);
        }
    }

    initPosition() {
        this._position = [];
        for (let i = 0; i < this._col; i++) {
            this._position.push(0);
        }
    }

    setProgress(p) {
        this._progress = p;
    }

    getRandomElement() {
        return this._elements[Math.round(utils.getRandomInt(0, this._elements.length))];
    }

    //get a relative row based on the actual index position
    getRelativeRow(delta) {
        let result = [];
        for (let i = 0; i < this._col; i++) {
            let pos = this._position[i] + delta;
            if (pos >= this._colElements) {
                //console.error("getRelativeRow overflow: " + pos);
                pos -= this._colElements;
            }
            result.push(this._slot[i][pos]);
        }
        return result;
    }

    getSlot() {
        let slot = [];
        for (let i = 0; i < this._row; i++) {
            slot.push([]);
            slot[i] = this.getRelativeRow(i);
        }
        return slot;
    }

    isWinningRow(row) {
        return this.getRelativeRow(row).reduce(function (a, b) {
            return (a === b) ? a : NaN;
        });
    }

    isWinningState() {
        let counter = 0;
        for (let i = 0; i < this._row; i++) {
            if (this.isWinningRow(i)) {
                counter += 1;
                if (this.getRelativeRow(i)[0] == "🚰") {
                    //water is not so healthy
                    counter -= 2;
                }
                if (this.getRelativeRow(i)[0] == "🍺") {
                    //double count for beers!
                    counter += 1;
                }
            }
        }
        return counter;
    }

    isWinningBomb() {
        for (let i = 0; i < this._row; i++) {
            if (this.isWinningRow(i)) {
                if (this.getRelativeRow(i)[0] == "💣") {
                    return true;
                }
            }
        }
        return false;
    }

    isWinningRob() {
        for (let i = 0; i < this._row; i++) {
            if (this.isWinningRow(i)) {
                if (this.getRelativeRow(i)[0] == "💰") {
                    return true;
                }
            }
        }
        return false;
    }

    formatProgress() {
        let slotString = "";
        slotString += "\n  |";
        for (let i = 0; i < this._progress; i++) {
            slotString += "=";
        }
        slotString += ">";
        for (let i = 0; i < 10 - this._progress; i++) {
            slotString += "-";
        }
        slotString += "|";
        return slotString;
    }

    formatWin() {
        let slotString = "",
            winningRows = this.isWinningState();
        if (winningRows > 0) {
            slotString += "\n  *  You Win!  *";
            slotString += "\n    +" + this.getPoints(winningRows) + " points!";
        } else {
            slotString += "\n  *  You Lost!  *";
            if (winningRows < 0)
                slotString += "\n    " + winningRows + " points!";
        }
        return slotString;
    }

    getPoints(winningRows) {
        const points = {
            1: 2,
            2: 5,
            3: 10,
            4: 15,
            5: 20
        }
        return points[winningRows] || 2;
    }

    bombPoints() {
        let winningRows = this.isWinningState();
        if (winningRows > 0) {
            return this.getPoints(winningRows) * 3;
        } else {
            return 0;
        }
    }

    robPoints() {
        let winningRows = this.isWinningState();
        if (winningRows > 0) {
            return this.getPoints(winningRows) * 3;
        } else {
            return 0;
        }
    }

    toString(ctx, running, firstTime) {
        let slot = this.getSlot(),
            lineDiv = " ──────────────",
            slotString = "`";
        slotString += "\n" + "  🎰 BTB Slot 🎰   ";
        slotString += "\n";
        for (let i = 0; i < this._row; i++) {
            let winningRow = this.isWinningRow(i),
                separator = " ";
            slotString += "\n";
            slotString += ((!running && winningRow ? ">" : " ") + "|" + separator);
            for (let j = 0; j < this._col; j++) {
                slotString += slot[i][j] + separator + "|" + (j == this._col - 1 ? "" : separator);
            }
            slotString += (!running && winningRow ? "<  " : " ")
        }
        if (!firstTime) {
            slotString += "\n";
            if (!running) {
                slotString += this.formatWin();
            } else {
                slotString += this.formatProgress();
            }
        } else {
            slotString += "\n";
        }

        slotString += "\n" + lineDiv;
        slotString += "\n credits: " + (ctx.session.user.dailySlotRunning ? "∞" : ctx.session.user.points);

        return slotString + "`";
    }

    rotate(col, n, direction) {
        if (!direction) {
            //rotate down
            this._position[col] -= n;
            if (this._position[col] < 0)
                this._position[col] = this._colElements + this._position[col];
        } else {
            // rotate up
            this._position[col] += n;
            if (this._position[col] >= this._colElements)
                this._position[col] -= this._colElements;
        }
    }

    // rotate by one each column
    fullRotation(dir) {
        for (let i = 0; i < this._col; i++) {
            this.rotate(i, 1, dir);
        }
    }

    //Rotate by 1 one random column
    randomRotate(dir) {
        this.rotate(Math.round(utils.getRandomInt(0, this._col)), 1), dir;
    }

}

const scene = new Scene('slot')
scene.enter((ctx) => {
    ctx.session.slot = new Slot(3, 3);
    ctx.session.slot.bombSent = false;
    ctx.reply(keyboards.slot(ctx).text, keyboards.slot(ctx).opts).then(() => {
        let message = "Feeling lucky?";
        //Free daily run
        const dailyFreeRun = !ctx.session.user.dailySlot || !moment(ctx.session.user.dailySlot).isSame(moment(), 'day');
        if (dailyFreeRun) {
            ctx.session.user.dailySlotRunning = true;
            message = "You got a free run!";
        }
        bot.typingEffect(ctx, message, (err, m) => {
            if (err) {
                console.error(err);
            } else {
                ctx.session.slot_header = m;
            }
            let inline_keyboard = [
                [{
                    text: !dailyFreeRun ? 'Spin (1 credit)' : 'Spin',
                    callback_data: 'spin'
                }]
            ];
            ctx.reply(ctx.session.slot.toString(ctx, false, true), {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: inline_keyboard
                })
            }).then((m) => {
                ctx.session.slot_message = m;
            });
        });
    });
});

scene.leave((ctx) => {
    const bombPoints = ctx.session.slot.bombPoints();
    if (ctx.session.slot.isWinningBomb() && bombPoints > 0 && !ctx.session.slot.bombSent) {
        ctx.session.slot.bombSent = true;
        //User won some bombs, but didn't get rid of them
        console.log("User " + ctx.session.user.email + " dint't get rid of his " + bombPoints + " bombs");
        ctx.reply("You didn't get rid of your " + bombPoints + " bombs!").then(() => {
            levels.removePoints(ctx.session.user._id, bombPoints, false, (err, points) => {
                if (err) {
                    console.error(err);
                } else {
                    //Save slot event
                    const slotRun = new DB.Slot({
                        owner: ctx.session.user._id,
                        bombedUser: ctx.session.user._id,
                        points: bombPoints
                    });
                    slotRun.save((err, s) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                }
            });
        });
    }
});

function printRunningSlot(ctx, cb) {
    if (ctx.session.slot_message) {
        require('../bot').bot.telegram.editMessageText(ctx.session.slot_message.chat.id, ctx.session.slot_message.message_id, null, ctx.session.slot.toString(ctx, true), {
            parse_mode: "markdown",
        }).then((msg) => {
            cb(null, msg);
        }, (err) => {
            //nothing to do
            cb(err);
        });
    } else {
        cb("Cannot update slot message");
    }
}

function printSlot(ctx) {
    let inline_keyboard = [
        [{
            text: !ctx.session.user.dailySlotRunning ? 'Spin (1 credit)' : 'Spin',
            callback_data: 'spin'
        }]
    ];
    const bombWin = ctx.session.slot.isWinningBomb() && ctx.session.slot.bombPoints() > 0,
        robWin = ctx.session.slot.isWinningRob() && ctx.session.slot.robPoints() > 0;
    if (ctx.session.slot_message) {
        require('../bot').bot.telegram.editMessageText(ctx.session.slot_message.chat.id, ctx.session.slot_message.message_id, null, ctx.session.slot.toString(ctx), {
            parse_mode: "markdown",
            reply_markup: !ctx.session.user.dailySlotRunning && !bombWin && !robWin ? JSON.stringify({
                inline_keyboard: inline_keyboard
            }) : undefined
        }).then((msg) => {
            ctx.session.user.dailySlotRunning = false;
            if (robWin)
                return selectUserToRob(ctx);
            if (bombWin)
                return selectUserToBomb(ctx);
        });
    }
}

function selectUserToBomb(ctx) {
    DB.User.find({
        "_id": {
            "$ne": ctx.session.user._id
        },
        /*"telegram.id": {
            "$ne": process.env.ROOT_TELEGRAM_ID
        },*/
        "telegram.enabled": true,
        "telegram.banned": false,
        points: {
            "$gt": 0
        },
        deleted: false
    }, null, {
        sort: {
            points: -1
        }
    }, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            let data = users.map(u => {
                    return {
                        text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : "") + " (" + u.points + ")",
                        callback_data: "userbomb_" + String(u.telegram.id)
                    };
                }),
                options = {
                    columns: 2,
                    pageSize: 6
                };
            ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
            console.log("User: " + ctx.session.user.email + " won " + ctx.session.slot.bombPoints() + " bombs");
            ctx.reply("You won " + ctx.session.slot.bombPoints() + " bombs 💣 !\nGet rid of them or they will explode here!\nWho do you want to send them to?", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: ctx.session.users_inline_keyboard.render()
                })
            }).then((m) => {
                ctx.session.lastMessage = m;
            });
        }
    });
}

function selectUserToRob(ctx) {
    DB.User.find({
        "_id": {
            "$ne": ctx.session.user._id
        },
        /*"telegram.id": {
            "$ne": process.env.ROOT_TELEGRAM_ID
        },*/
        "telegram.enabled": true,
        "telegram.banned": false,
        points: {
            "$gt": 0
        },
        deleted: false
    }, null, {
        sort: {
            points: -1
        }
    }, (err, users) => {
        if (err) {
            console.error(err);
        } else {
            let data = users.map(u => {
                    return {
                        text: u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : "") + " (" + u.points + ")",
                        callback_data: "userrob_" + String(u.telegram.id)
                    };
                }),
                options = {
                    columns: 2,
                    pageSize: 6
                };
            ctx.session.users_inline_keyboard = new PaginatedInlineKeyboard(data, options);
            const beercoins = ctx.session.slot.robPoints();
            console.log("User: " + ctx.session.user.email + " won " + beercoins + " beercoins");
            ctx.reply("You can steal " + beercoins + " beercoins 💰 !\nWho do you want to rob?", {
                parse_mode: "markdown",
                reply_markup: JSON.stringify({
                    inline_keyboard: ctx.session.users_inline_keyboard.render()
                })
            }).then((m) => {
                ctx.session.lastMessage = m;
            });
        }
    });
}

function textManager(ctx) {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.session.slot_header) {
        ctx.deleteMessage(ctx.session.slot_header.message_id);
        delete ctx.session.slot_header;
    }
    ctx.session.user.dailySlotRunning = false;
    if (ctx.session.slot_message) {
        ctx.deleteMessage(ctx.session.slot_message.message_id);
        delete ctx.session.slot_message;
    }
    deleteLastMessage(ctx);

    if (keyboards.slot(ctx)[ctx.message.text]) {
        keyboards.slot(ctx)[ctx.message.text]();
    } else if (ctx.message.text == keyboards.slot(ctx).cmd.back) {
        //back button
        ctx.scene.enter('extra');
    } else {
        ctx.scene.leave();
        //fallback to main bot scene
        bot.textManager(ctx);
    }
}

scene.on("text", textManager);

function handleResults(ctx) {
    let result = ctx.session.slot.isWinningState(),
        points = 0;
    console.log("Slot " + (ctx.session.user.dailySlotRunning ? "free daily " : "") + "run for user " + ctx.session.user.email);
    if (result > 0) {
        points = ctx.session.slot.getPoints(result);
        levels.addPoints(ctx.session.user._id, points, true, (err, _points) => {
            if (err) {
                console.error(err);
            } else {
                console.log("User: " + ctx.session.user.email + " got " + points + " slot points (" + ctx.session.user.points + ")");
                if (!checkUser(ctx.session.user.role, userRoles.root)) {
                    bot.broadcastMessage("User *" + ctx.session.user.email + "* got " + points + " slot points (" + ctx.session.user.points + ")", accessLevels.root, null, true);
                }
            }
            printSlot(ctx);
        });
    } else if (result < 0) {
        points = result;
        let pointsToRemove = result * -1;
        levels.removePoints(ctx.session.user._id, pointsToRemove, true, (err, _points) => {
            if (err) {
                console.error(err);
            } else {
                console.log("User: " + ctx.session.user.email + " lost " + pointsToRemove + " slot points (" + ctx.session.user.points + ")");
                if (!checkUser(ctx.session.user.role, userRoles.root)) {
                    bot.broadcastMessage("User *" + ctx.session.user.email + "* lost " + pointsToRemove + " slot points (" + ctx.session.user.points + ")", accessLevels.root, null, true);
                }
            }
            printSlot(ctx);
        });
    } else {
        printSlot(ctx);
    }
    //Save slot result
    const newSlotRun = new DB.Slot({
        owner: ctx.session.user._id,
        bet: ctx.session.user.dailySlotRunning ? 0 : 1,
        points: points
    });
    newSlotRun.save((err, s) => {
        if (err) {
            console.error(err);
        }
    });
}

function runSlot(ctx, cb) {
    ctx.session.slot.bombSent = false;
    ctx.session.slot.isRunning = true;
    ctx.session.slot.setProgress(0);
    ctx.session.slot.initSlot();
    let funList = [],
        rotations = Math.round(utils.getRandomInt(10, 21)),
        rotations2 = Math.round(utils.getRandomInt(5, 10));

    for (let i = 0; i < rotations; i++) {
        funList.push(function () {
            return (cb) => {
                ctx.session.slot.fullRotation();
                ctx.session.slot.setProgress(Math.round((i + 1) * 10 / (rotations + rotations2)));
                setTimeout(() => {
                    printRunningSlot(ctx, () => {
                        cb();
                    });
                }, 100);
            }
        }());
    }
    for (let i = 0; i < rotations2; i++) {
        funList.push(function () {
            return (cb) => {
                ctx.session.slot.randomRotate();
                ctx.session.slot.setProgress(Math.round((i + rotations + 1) * 10 / (rotations + rotations2)));
                setTimeout(() => {
                    printRunningSlot(ctx, () => {
                        cb();
                    });
                }, 400);
            }
        }());
    }
    async.series(funList, (err, result) => {
        if (err) {
            console.error(err);
        }
        handleResults(ctx);
        ctx.session.slot.isRunning = false;
    });
}

function updateUsersKeyboard(ctx) {
    require('../bot').bot.telegram.editMessageReplyMarkup(ctx.session.lastMessage.chat.id, ctx.session.lastMessage.message_id, null, {
        inline_keyboard: ctx.session.users_inline_keyboard.render()
    }).then((m) => {
        ctx.session.lastMessage = m;
    });
}

function deleteLastMessage(ctx) {
    if (ctx.session.lastMessage) {
        ctx.deleteMessage(ctx.session.lastMessage.message_id);
        delete ctx.session.lastMessage;
    }
}

scene.on("callback_query", ctx => {
    ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
    if (ctx.update.callback_query.data == 'spin') {
        if (ctx.session.slot.isRunning) {
            return ctx.answerCbQuery("Running slot... please wait.");
        } else if (!ctx.session.user.dailySlot || !moment(ctx.session.user.dailySlot).isSame(moment(), 'day')) {
            //daily free run
            ctx.session.slot.isRunning = true;
            DB.User.findByIdAndUpdate(ctx.session.user._id, {
                dailySlot: moment().format()
            }, {
                new: true
            }, (err, u) => {
                if (err || !u) {
                    console.error(err || "User not found");
                    ctx.answerCbQuery("Ehm, something went wrong!");
                    ctx.session.slot.isRunning = false;
                } else if (u) {
                    ctx.session.user.dailySlot = u.dailySlot;
                    ctx.session.user.dailySlotRunning = true;
                    runSlot(ctx);
                }
            });
        } else if (ctx.session.user.points == 0) {
            return ctx.answerCbQuery("Ehm, You don't have enough credits!");
        } else {
            ctx.session.slot.isRunning = true;
            levels.removePoints(ctx.session.user._id, 1, true, (err, points) => {
                if (err) {
                    console.error(err);
                    ctx.answerCbQuery("Ehm, something went wrong!");
                    ctx.session.slot.isRunning = false;
                } else {
                    runSlot(ctx);
                }
            });
        }
    } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.previousCallbackData()) {
        ctx.session.users_inline_keyboard.previous();
        updateUsersKeyboard(ctx);
    } else if (ctx.session.users_inline_keyboard && ctx.update.callback_query.data == ctx.session.users_inline_keyboard.nextCallbackData()) {
        ctx.session.users_inline_keyboard.next();
        updateUsersKeyboard(ctx);
    } else if (ctx.update.callback_query.data.indexOf("userbomb_") == 0) {
        const userTelegramID = parseInt(ctx.update.callback_query.data.substring(9));
        if (isNaN(userTelegramID)) {
            console.error("Wrong callback data");
            return ctx.answerCbQuery("Something went wrong!");
        }
        DB.User.findOne({
            "telegram.id": userTelegramID
        }, (err, bombUser) => {
            if (err || !bombUser) {
                console.error(err || "Slot bomb user not found");
                return ctx.answerCbQuery("Something went wrong!");
            }
            deleteLastMessage(ctx);
            ctx.answerCbQuery("Sending bomb to " + bombUser.telegram.first_name + "...");
            const sender = "[" + (ctx.session.user.telegram.first_name + (ctx.session.user.telegram.last_name ? (" " + ctx.session.user.telegram.last_name) : "")) + "](tg://user?id=" + ctx.session.user.telegram.id + ")",
                message = "Boom! " + sender + " just sent you " + ctx.session.slot.bombPoints() + " bombs 💣 !";
            require('../bot').bot.telegram.sendMessage(bombUser.telegram.id, message, {
                parse_mode: "markdown"
            }).then(() => {
                const points = ctx.session.slot.bombPoints();
                levels.removePoints(bombUser._id, points, false, (err, _points) => {
                    if (err) {
                        ctx.reply("Something went wrong!");
                        return console.error(err);
                    }
                    const bombedUser = "[" + (bombUser.telegram.first_name + (bombUser.telegram.last_name ? (" " + bombUser.telegram.last_name) : "")) + "](tg://user?id=" + bombUser.telegram.id + ")";
                    ctx.reply(bombedUser + " got your bombs and lost " + points + " points 😬 !", {
                        parse_mode: "markdown"
                    });
                    ctx.session.slot.bombSent = true;
                    if (!checkUser(ctx.session.user.role, userRoles.root)) {
                        bot.broadcastMessage("User *" + ctx.session.user.email + "* sent " + points + " bombs to *" + bombUser.email + "*", accessLevels.root, null, true);
                    }
                    //Save slot event
                    const slotRun = new DB.Slot({
                        owner: ctx.session.user._id,
                        bombedUser: bombUser._id,
                        points: points
                    });
                    slotRun.save((err, s) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                });
            });
        });
    } else if (ctx.update.callback_query.data.indexOf("userrob_") == 0) {
        const userTelegramID = parseInt(ctx.update.callback_query.data.substring(8));
        if (isNaN(userTelegramID)) {
            console.error("Wrong callback data");
            return ctx.answerCbQuery("Something went wrong!");
        }
        DB.User.findOne({
            "telegram.id": userTelegramID
        }, (err, robbedUser) => {
            if (err || !robbedUser) {
                console.error(err || "Slot rob user not found");
                return ctx.answerCbQuery("Something went wrong!");
            }
            deleteLastMessage(ctx);
            ctx.answerCbQuery("Stealing beercoins from " + robbedUser.telegram.first_name + "...");
            const sender = "[" + (ctx.session.user.telegram.first_name + (ctx.session.user.telegram.last_name ? (" " + ctx.session.user.telegram.last_name) : "")) + "](tg://user?id=" + ctx.session.user.telegram.id + ")",
                message = "Ops! " + sender + " just stole " + ctx.session.slot.robPoints() + " beercoins 💰 !";
            require('../bot').bot.telegram.sendMessage(robbedUser.telegram.id, message, {
                parse_mode: "markdown"
            }).then(() => {
                const beercoins = ctx.session.slot.robPoints();
                levels.removePoints(robbedUser._id, beercoins, false, (err, _points) => {
                    if (err) {
                        ctx.reply("Something went wrong!");
                        return console.error(err);
                    }
                    const robUser = "[" + (robbedUser.telegram.first_name + (robbedUser.telegram.last_name ? (" " + robbedUser.telegram.last_name) : "")) + "](tg://user?id=" + robbedUser.telegram.id + ")";
                    ctx.reply("You stole " + beercoins + " beercoins from " + robUser + " 😬 !", {
                        parse_mode: "markdown"
                    }).then(() => {
                        levels.addPoints(ctx.session.user._id, beercoins, false, (err) => {
                            if (err)
                                console.error(err);
                        });
                    });
                    if (!checkUser(ctx.session.user.role, userRoles.root)) {
                        bot.broadcastMessage("User *" + ctx.session.user.email + "* stole " + beercoins + " beercoins from *" + robbedUser.email + "*", accessLevels.root, null, true);
                    }
                    //Save slot event
                    const slotRun = new DB.Slot({
                        owner: ctx.session.user._id,
                        robbedUser: robbedUser._id,
                        points: beercoins
                    });
                    slotRun.save((err, s) => {
                        if (err) {
                            console.error(err);
                        }
                    });
                });
            });
        });
    } else {
        ctx.answerCbQuery("Okey! I have nothing to do.");
    }
});

exports.scene = scene;