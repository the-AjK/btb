/**
 * keyboards.js
 * Telegram Bot keyboards
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const roles = require("../roles"),
    db = require("../db"),
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

module.exports = {
    register: function (ctx) {
        let keyboard = [],
            cmd = {
                register: "Register"
            };
        keyboard.push([{
            text: cmd.register
        }]);
        return {
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    one_time_keyboard: false,
                    keyboard: keyboard
                })
            },
            text: "Type \"Register\" to register yourself.",
            cmd: cmd
        };
    },
    btb: function (ctx) {
        let keyboard = [],
            cmd = {
                menu: "Menu",
                order: "Order",
                orderStatus: "Orders status",
                settings: "⚙️ Settings"
            };
        keyboard.push([{
            text: cmd.menu
        }, {
            text: cmd.order
        }]);

        if (ctx && ctx.session.user && roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
            keyboard.push([{
                text: cmd.orderStatus
            }]);
        }

        keyboard.push([{
            text: cmd.settings
        }]);
        return {
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    one_time_keyboard: false,
                    keyboard: keyboard
                })
            },
            text: "Btb",
            cmd: cmd
        };
    },
    order: function (ctx) {
        let keyboard = [],
            cmd = {
                first: "First course",
                second: "Second course",
                cancel: "Cancel",
            };
        keyboard.push([{
            text: cmd.first
        }]);
        keyboard.push([{
            text: cmd.second
        }]);
        keyboard.push([{
            text: cmd.cancel
        }]);

        let obj = {
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    one_time_keyboard: false,
                    keyboard: keyboard
                })
            },
            text: "Choose first or second course:",
            cmd: cmd
        };

        return obj;
    },
    reminders: function (ctx) {
        let keyboard = [],
            cmd = {
                back: "Back to settings",
                orderReminder: "Order Reminder",
                dailyMenuReminder: "Daily Menu Notification",
                rootReminders: "Root Notifications",
                adminReminders: "Admin Notifications",
            };
        keyboard.push([{
            text: cmd.dailyMenuReminder
        }]);
        keyboard.push([{
            text: cmd.orderReminder
        }]);
        if (ctx && ctx.session.user && roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
            keyboard.push([{
                text: cmd.adminReminders
            }]);
        }
        if (ctx && ctx.session.user && roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            keyboard.push([{
                text: cmd.rootReminders
            }]);
        }
        keyboard.push([{
            text: cmd.back
        }]);

        let obj = {
            availableCmd: Object.keys(cmd).map(c => cmd[c]),
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    one_time_keyboard: false,
                    keyboard: keyboard
                })
            },
            text: "*Reminders*",
            cmd: cmd
        };

        obj[cmd.rootReminders] = () => {
            let inline_keyboard = [
                    [{
                        text: 'On',
                        callback_data: 'rootreminderson'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Root Notifications are *OFF*, do you like to switch them on?";

            if (ctx.session.user.settings.rootReminders == true) {
                inline_keyboard = [
                    [{
                        text: 'Off',
                        callback_data: 'rootremindersoff'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ];
                text = "Root Notifications are *ON*, do you like to switch them off?";
            }

            let infoMessage = "*Root Notifications setting* allow you to receive roots related notifications";
            ctx.reply(infoMessage, {
                parse_mode: "markdown"
            }).then(() => {
                ctx.reply(text, {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
            });
        }

        obj[cmd.adminReminders] = () => {
            let inline_keyboard = [
                    [{
                        text: 'On',
                        callback_data: 'adminreminderson'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Admin Notifications are *OFF*, do you like to switch them on?";

            if (ctx.session.user.settings.adminReminders == true) {
                inline_keyboard = [
                    [{
                        text: 'Off',
                        callback_data: 'adminremindersoff'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ];
                text = "Admin Notifications are *ON*, do you like to switch them off?";
            }

            let infoMessage = "*Admin Notifications setting* allow you to receive admins related notifications";
            ctx.reply(infoMessage, {
                parse_mode: "markdown"
            }).then(() => {
                ctx.reply(text, {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
            });
        }

        obj[cmd.orderReminder] = () => {
            let inline_keyboard = [
                    [{
                        text: 'On',
                        callback_data: 'orderreminderon'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Order Reminder is *OFF*, do you like to switch it on?";

            if (ctx.session.user.settings.orderReminder == true) {
                inline_keyboard = [
                    [{
                        text: 'Off',
                        callback_data: 'orderreminderoff'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ];
                text = "Order Reminder is *ON*, do you like to switch it off?";
            }

            let infoMessage = "*Order Reminder setting* allow you to receive a reminder if you didn't placed any order before the daily deadline";
            ctx.reply(infoMessage, {
                parse_mode: "markdown"
            }).then(() => {
                ctx.reply(text, {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
            });

        }

        // cmd dailyMenuReminder
        obj[cmd.dailyMenuReminder] = () => {
            let inline_keyboard = [
                    [{
                        text: 'On',
                        callback_data: 'dailymenuon'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Daily Menu Notification is *OFF*, do you like to switch it on?";

            if (ctx.session.user.settings.dailyMenu == true) {
                inline_keyboard = [
                    [{
                        text: 'Off',
                        callback_data: 'dailymenuoff'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ];
                text = "Daily Menu Notification is *ON*, do you like to switch it off?";
            }

            let infoMessage = "*Daily Menu Notification setting* allow you to receive your daily menu as soon as it becomes available";
            ctx.reply(infoMessage, {
                parse_mode: "markdown"
            }).then(() => {
                ctx.reply(text, {
                    parse_mode: "markdown",
                    force_reply: true,
                    reply_markup: JSON.stringify({
                        inline_keyboard: inline_keyboard
                    })
                }).then((msg) => {
                    //lets save the message to delete it afterward
                    ctx.session.lastMessage = msg;
                });
            })
        }

        return obj;
    },
    settings: function (ctx) {
        let keyboard = [],
            cmd = {
                orderDelete: "✖️ Delete Order",
                beer: "🍺 Beer",
                reminders: "⏰ Reminders",
                leave: "❗️ Leave the ship",
                about: "ℹ️ About"
            };

        let done = false,
            userHasOrdered = false;
        db.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
            if (!err && order) {
                userHasOrdered = true;
            }
            done = true;
        });
        require('deasync').loopWhile(function () {
            return !done;
        });

        if (userHasOrdered) {
            keyboard.push([{
                text: cmd.orderDelete
            }]);
        }
        keyboard.push([{
            text: cmd.beer
        }, {
            text: cmd.reminders
        }]);
        keyboard.push([{
            text: cmd.about
        }]);
        keyboard.push([{
            text: "Cancel"
        }]);
        keyboard.push([{
            text: cmd.leave
        }]);

        let obj = {
            availableCmd: Object.keys(cmd).map(c => cmd[c]),
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    one_time_keyboard: false,
                    keyboard: keyboard
                })
            },
            text: "*Settings*",
            cmd: cmd
        };

        obj[cmd.orderDelete] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Delete',
                        callback_data: 'deletedailyorder'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Are you sure to delete your daily order?";

            ctx.reply(text, {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: inline_keyboard
                })
            }).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
        }

        obj[cmd.beer] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Pint',
                        callback_data: 'pint'
                    }, {
                        text: 'Half Pint',
                        callback_data: 'halfPint'
                    }],
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "Give me a beer and I will love you!";

            ctx.reply(text, {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: inline_keyboard
                })
            }).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
        }

        obj[cmd.leave] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }],
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }, {
                        text: 'Leave',
                        callback_data: 'leave'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }],
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "WHAT!? Do you really wanna leave? Your account will be deleted and you will no longer be able to give me a beer!\nYou should think about it!\nJust sayin...",
                value = true;

            ctx.reply(text, {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: inline_keyboard
                })
            }).then((msg) => {
                //lets save the message to delete it afterward
                ctx.session.lastMessage = msg;
            });
        }

        return obj;
    }
};