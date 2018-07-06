/**
 * keyboards.js
 * Telegram Bot keyboards
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const roles = require("../roles"),
    moment = require("moment"),
    db = require("../db"),
    levels = require('../levels'),
    checkUserAccessLevel = roles.checkUserAccessLevel,
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
                settings: "⚙️ Settings",
                extra: "🚀 Extra"
            };
        keyboard.push([{
            text: cmd.menu
        }, {
            text: cmd.order
        }]);
        keyboard.push([{
            text: cmd.extra
        }]);
        keyboard.push([{
            text: cmd.settings
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
            text: "Btb",
            cmd: cmd
        };

        return obj;
    },
    order: function (ctx) {
        let keyboard = [],
            cmd = {
                first: "First course",
                second: "Second course",
                back: "◀️ Back",
            };

        let done = false,
            dailyMenu;
        db.getDailyMenu(null, (err, m) => {
            if (!err && m) {
                dailyMenu = m;
            }
            done = true;
        });
        require('deasync').loopWhile(function () {
            return !done;
        });
        if (dailyMenu.firstCourse && dailyMenu.firstCourse.items && dailyMenu.firstCourse.items.length) {
            keyboard.push([{
                text: cmd.first
            }]);
        }
        if (dailyMenu.secondCourse && ((dailyMenu.secondCourse.items && dailyMenu.secondCourse.items.length) || (dailyMenu.secondCourse.sideDishes && dailyMenu.secondCourse.sideDishes.length))) {
            keyboard.push([{
                text: cmd.second
            }]);
        }
        keyboard.push([{
            text: cmd.back
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
            text: "Choose one course:",
            cmd: cmd
        };

        return obj;
    },
    orderRating: function (ctx) {
        let inline_keyboard = [
                [{
                    text: '-',
                    callback_data: 'remove'
                }, {
                    text: '+',
                    callback_data: 'add'
                }],
                [{
                    text: 'Rate It!',
                    callback_data: 'rateit'
                }],
                [{
                    text: 'Cancel',
                    callback_data: 'cancel'
                }]
            ],
            key_add = {
                text: '+++',
                callback_data: 'add'
            },
            key_remove = {
                text: '---',
                callback_data: 'remove'
            };
        if (ctx.session.rating == 1) {
            inline_keyboard[0] = [key_add];
        } else if (ctx.session.rating == 10) {
            inline_keyboard[0] = [key_remove];
        } else {
            inline_keyboard[0] = [key_remove, key_add];
        }
        let obj = {
            opts: {
                parse_mode: "markdown",
                force_reply: true,
                reply_markup: JSON.stringify({
                    inline_keyboard: inline_keyboard
                })
            },
            text: "*Rate your lunch!*\n0 - Low (Glicinet was much better)\n...\n10 - High (It was Super!)\n\n" + ctx.session.rating + " stars! "
        };
        for (let i = 0; i < ctx.session.rating; i++) {
            obj.text += "⭐️"
        }
        return obj;
    },
    reminders: function (ctx) {
        let keyboard = [],
            cmd = {
                back: "◀️ Back to settings",
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
        if (ctx && ctx.session.user && checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
            keyboard.push([{
                text: cmd.adminReminders
            }]);
        }
        if (ctx && ctx.session.user && checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
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
                back: "◀️ Back",
                orderDelete: "✖️ Delete Order",
                unsubscribe: "/unsubscribe",
                reminders: "⏰ Reminders",
                about: "ℹ️ About BTB"
            };

        let done = false,
            userHasOrdered = false,
            dailyDeadlineReached = false;
        db.getDailyUserOrder(null, ctx.session.user._id, (err, order) => {
            if (!err && order) {
                userHasOrdered = true;
                dailyDeadlineReached = moment().isAfter(moment(order.menu.deadline));
            }
            done = true;
        });
        require('deasync').loopWhile(function () {
            return !done;
        });

        if (userHasOrdered && !dailyDeadlineReached) {
            keyboard.push([{
                text: cmd.orderDelete
            }]);
        }
        keyboard.push([{
            text: cmd.about
        }]);
        keyboard.push([{
            text: cmd.reminders
        }]);
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

        obj[cmd.unsubscribe] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }],
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }, {
                        text: 'Unsubscribe',
                        callback_data: 'unsubscribe'
                    }, {
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }],
                    [{
                        text: 'Cancel',
                        callback_data: 'cancel'
                    }]
                ],
                text = "*WHAT!?*\nDo you really wanna unsubscribe?\nYour account will be deleted and you will no longer be able to give me a beer!\nYou should think about it!",
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
    },
    extra: function (ctx) {
        let keyboard = [],
            cmd = {
                back: "◀️ Back",
                beer: "🍺 Beer",
                status: "📋 Status",
                slot: "🎰 Slot",
                shop: "🛍 Shop",
                top: "🔝 Top ten",
                nim: "🎱 NIM"
            };

        keyboard.push([{
            text: cmd.beer
        }, {
            text: cmd.slot
        }]);

        if (ctx && ctx.session.user && (checkUserAccessLevel(ctx.session.user.role, accessLevels.root) || levels.getLevel(ctx.session.user.points) > 3)) {
            //Level 4 or root 
            keyboard[keyboard.length - 1].push({
                text: cmd.nim
            });
        }

        if (ctx && ctx.session.user && (checkUserAccessLevel(ctx.session.user.role, accessLevels.admin) || levels.getLevel(ctx.session.user.points) > 1)) {
            // level 2 or admin
            keyboard.push([{
                text: cmd.status
            }]);
            if (checkUserAccessLevel(ctx.session.user.role, accessLevels.root) || levels.getLevel(ctx.session.user.points) > 0) {
                //level 1 admin
                keyboard[keyboard.length - 1].push({
                    text: cmd.shop
                });
                keyboard[keyboard.length - 1].push({
                    text: cmd.top
                });
            }
        } else if (levels.getLevel(ctx.session.user.points) > 0) {
            //level 1 user
            keyboard.push([{
                text: cmd.shop
            }, {
                text: cmd.top
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
            text: "*Extra stuff*",
            cmd: cmd
        };

        obj[cmd.beer] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Pint',
                        callback_data: 'pint'
                    }, {
                        text: 'Half Pint',
                        callback_data: 'halfPint'
                    }]
                ],
                text = "Send me a beer!";

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

        obj[cmd.status] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Orders',
                        callback_data: 'statusorders'
                    }]
                ],
                text = "Daily status:";
            if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 1) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
                inline_keyboard.push([{
                    text: 'Tables',
                    callback_data: 'statustables'
                }, {
                    text: 'Users',
                    callback_data: 'userswithoutorder'
                }]);
            }
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
    },
    slot: function (ctx) {
        let keyboard = [],
            cmd = {
                back: "◀️ Back to extra"
            };

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
                    resize_keyboard: true,
                    keyboard: keyboard
                })
            },
            text: "*Welcome to BTB Slot*",
            cmd: cmd
        };

        return obj;
    },
    shop: function (ctx) {
        let keyboard = [],
            cmd = {
                news: "🗞 Newspaper",
                shield: "🛡 Bomb Shield",
                gun: "🔫 Anti-Thief WaterGun",
                trade: "💰 Trading",
                hp: "🥔 Hot Potato",
                back: "◀️ Back to extra"
            };

        keyboard.push([{
            text: cmd.news
        }]);

        keyboard.push([{
            text: cmd.shield
        }, {
            text: cmd.gun
        }]);

        keyboard.push([{
            text: cmd.trade
        }/*, {
            text: cmd.hp
        }*/]);

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
                    resize_keyboard: true,
                    keyboard: keyboard
                })
            },
            text: "*BTB Shop*",
            cmd: cmd
        };

        obj[cmd.news] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Free',
                        callback_data: 'news'
                    }, {
                        text: 'Premium (1 credit)',
                        callback_data: 'newspremium'
                    }]
                ],
                text = "Get latest BTB news";
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

        obj[cmd.hp] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Buy a Hot Potato (1 credit)',
                        callback_data: 'hp'
                    }]
                ],
                text = "Never play with fire!";
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

        obj[cmd.shield] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Buy a bombshield (5 credits)',
                        callback_data: 'shield'
                    }]
                ],
                text = "Protect yourself from bombs!";
            if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 2) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
                //Level 3 user or root
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
            } else {
                ctx.reply(text + "\nThis item is available only for level 3 users");
            }
        }

        obj[cmd.gun] = () => {
            let inline_keyboard = [
                    [{
                        text: 'Buy a watergun (5 credits)',
                        callback_data: 'gun'
                    }]
                ],
                text = "Protect yourself from thieves!";
            if ((ctx && ctx.session.user && levels.getLevel(ctx.session.user.points) > 2) || checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
                //Level 3 user or root
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
            } else {
                ctx.reply(text + "\nThis item is available only for level 3 users");
            }
        }

        return obj;
    },
    nim: function (ctx) {
        let keyboard = [],
            cmd = {
                back: "◀️ Back to extra"
            };

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
                    resize_keyboard: true,
                    keyboard: keyboard
                })
            },
            text: "*NIM Game*",
            cmd: cmd
        };

        return obj;
    }
};