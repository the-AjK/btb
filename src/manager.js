/**
 * manager.js
 * Application manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const schedule = require('node-schedule'),
    moment = require('moment'),
    async = require('async'),
    roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    reminder = require('./reminder'),
    bot = require("./telegram/bot"),
    botNotifications = require('./telegram/notifications'),
    DB = require("./db");

function _getUsers(req, res) {
    const id = req.params.id,
        query = {},
        select = {
            telegram: 1,
            username: 1,
            email: 1,
            enabled: 1,
            deleted: 1,
            role: 1,
            loginCounter: 1,
            settings: 1,
            beerCounter: 1,
            lastLogin: 1,
            lastIp: 1,
            createdAt: 1,
            updatedAt: 1
        },
        options = {
            offset: req.query.offset || undefined,
            limit: req.query.limit || 50
        };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        select.loginCounter = -1;
        select.settings = -1;
        select.beerCounter = -1;
        select.lastLogin = -1;
        select.lastIp = -1;
        select["telegram.id"] = -1;
        select["telegram.enabled"] = 1;
        select["telegram.username"] = -1;
        select["telegram.first_name"] = -1;
        select["telegram.last_name"] = -1;
        select["telegram.language_code"] = -1;
        query.deleted = false;
    }
    if (!id) {
        DB.User.find(query, select, options, (err, users) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            res.send(users);
        });
    } else {
        query._id = id;
        DB.User.findOne(query, select, (err, user) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!user) {
                return res.sendStatus(404);
            }
            res.send(user);
        });
    }
}

function _addUser(req, res) {
    let data = req.body;
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.salt;
        delete data.deleted;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.telegram;
        delete data.loginCounter;
        delete data.settings;
        delete data.beerCounter;
        delete data.lastLogin;
        if (!checkUser(data.role, userRoles.user) && !checkUser(data.role, userRoles.admin)) {
            //avoid non root user to create root users
            delete data.role;
        }
    }
    //If password is specified, lets salt/hash it
    if (data.password) {
        const newPassword = auth.saltHashPassword(data.password)
        data.password = newPassword.hash;
        data.salt = newPassword.salt;
    }

    data.createdAt = moment().format();

    const newUser = new DB.User(data);
    newUser.save((err, user) => {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }
        res.status(201).send(user);
    });
}

function _updateUser(req, res) {
    const query = {
            _id: req.params.id
        },
        data = req.body,
        options = {
            new: false
        };
    if (!data.telegram)
        data.telegram = {}
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.salt;
        delete data.deleted;
        delete data.createdAt;
        delete data.telegram.id;
        delete data.telegram.username;
        delete data.telegram.first_name;
        delete data.telegram.last_name;
        delete data.telegram.language_code;
        //TODO avoid to update root users or other admind

        //non root users can update only basic users
        query.role = userRoles.user
    }

    //If password is specified, lets salt/hash it
    if (data.password) {
        const newPassword = auth.saltHashPassword(data.password)
        data.password = newPassword.hash;
        data.salt = newPassword.salt;
    }

    data.updatedAt = moment().format();

    if (data.telegram) {
        data.$set = {};
        for (let key in data.telegram) {
            data.$set["telegram." + key] = data.telegram[key];
        }
        delete data.telegram;
    }

    DB.User.findOneAndUpdate(query, data, options, (err, user) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        } else if (!user) {
            return res.sendStatus(404);
        }
        if (!user.telegram.enabled && data.$set && data.$set["telegram.enabled"] && data.sendNotification) {
            botNotifications.accountEnabledDisabled(user, true);
        } else if (user.telegram.enabled && data.$set && !data.$set["telegram.enabled"] && data.sendNotification) {
            botNotifications.accountEnabledDisabled(user, false);
        }
        res.sendStatus(200);
    });

}

function _deleteUser(req, res) {
    const query = {
        _id: req.params.id
    };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user change only the deleted flag
        //avoid to delete enabled users
        query.enabled = false;
        const data = {
                deleted: true,
                updatedAt: moment().format()
            },
            options = {
                new: false
            };
        DB.User.findOneAndUpdate(query, data, options, (err, user) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!user) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    } else {
        //Root users remove completely
        DB.User.findOneAndRemove(query, (err, user) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!user) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    }
}

//MENU stuff
function _getMenus(req, res) {
    const id = req.params.id,
        query = {},
        select = {
            owner: 1,
            enabled: 1,
            deleted: 1,
            label: 1,
            firstCourse: 1,
            secondCourse: 1,
            additionalInfos: 1,
            day: 1,
            deadline: 1,
            tables: 1,
            createdAt: 1,
            updatedAt: 1
        },
        options = {
            offset: req.query.offset || undefined,
            limit: req.query.limit || 50
        };
    //TODO add filter query
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        query.deleted = false;
    }
    if (!id) {
        DB.Menu.find(query, select, options).populate('tables').populate({
            path: 'owner',
            select: 'username email _id'
        }).exec((err, menus) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            res.send(menus);
        });
    } else {
        query._id = id;
        DB.Menu.findOne(query, select).populate('tables').populate({
            path: 'owner',
            select: 'username email _id'
        }).exec((err, menu) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!menu) {
                return res.sendStatus(404);
            }
            res.send(menu);
        });
    }
}

//Check if the daily menu was already saved into the DB
function checkDailyMenu(data, cb) {
    const today = moment(data.day).startOf("day"),
        tomorrow = moment(today).add(1, "days"),
        toyota = {
            deleted: false,
            _id: {
                $ne: data._id
            },
            day: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            }
        };
    DB.Menu.findOne(toyota, (err, res) => {
        if (err) {
            console.error(err);
        } else {
            cb(res)
        }
    });
}

function _addMenu(req, res) {
    let data = req.body;
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.updatedAt;
        delete data.createdAt;
        data.owner = req.user._id;
    }
    if (!data.owner) {
        data.owner = req.user._id;
    }

    data.createdAt = moment().format();

    if (!data.day) {
        res.status(400).send("Menu date is required");
    } else {
        if (data.deadline) {
            let deadline = moment(data.deadline, "HH:mm");
            data.deadline = moment(data.day, "YYYY-MM-DD").set('hour', deadline.hours()).set('minutes', deadline.minutes()).toISOString(true);
        }
        checkDailyMenu(data, (dailymenu) => {
            if (dailymenu) {
                res.status(400).send("Daily menu already present");
            } else {
                const newMenu = new DB.Menu(data);
                newMenu.save((err, menu) => {
                    if (err) {
                        console.error(err);
                        return res.sendStatus(400);
                    }
                    if (data.sendNotification && menu.enabled) {
                        if (moment(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline)))
                            botNotifications.dailyMenu(menu);
                    }
                    //update reminder stuff
                    reminder.setOrderReminder();
                    res.status(201).send(menu);
                });
            }
        });
    }
}

function _updateMenu(req, res) {
    const query = {
            _id: req.params.id
        },
        data = req.body,
        options = {
            new: true
        };

    data.updatedAt = moment().format();

    if (!data.day) {
        res.status(400).send("Menu date is required");
    } else {
        if (data.deadline) {
            let deadline = moment(data.deadline, "HH:mm");
            data.deadline = moment(data.day, "YYYY-MM-DD").set('hour', deadline.hours()).set('minutes', deadline.minutes()).toISOString(true);
        }
        checkDailyMenu(data, (dailymenu) => {
            if (dailymenu) {
                res.status(400).send("Daily menu already present");
            } else {

                if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
                    //non root user limitations
                    delete data._id;
                    delete data.deleted;
                    delete data.createdAt;
                    data.owner = req.user._id;
                }

                if (moment(data.day).isSame(moment(), 'day')) {
                    //is updating the daily menu
                    DB.Menu.findOne(query, (err, oldMenu) => {
                        if (err) {
                            console.error(err);
                            return res.sendStatus(400);
                        } else if (!oldMenu) {
                            return res.sendStatus(404);
                        }
                        DB.Menu.findOneAndUpdate(query, data, options, (err, menu) => {
                            if (err) {
                                console.error(err);
                                return res.sendStatus(500);
                            } else if (!menu) {
                                return res.sendStatus(404);
                            }
                            if (data.sendNotification) {
                                if (moment(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline))) {
                                    if (!oldMenu.enabled && menu.enabled) {
                                        botNotifications.dailyMenu(menu);
                                    } else if (menu.enabled) {
                                        //TODO check the menu diff and send notification to the right user
                                        //plus clear those user's orders
                                        // NOW i will delete ALL user orders
                                        DB.getDailyOrders(null, (err, orders) => {
                                            if (err) {
                                                console.error(err);
                                            } else {
                                                orders.map((o) => {
                                                    DB.Order.findOneAndRemove(o._id).exec();
                                                })
                                            }
                                        });
                                        botNotifications.dailyMenuUpdated(menu);
                                    }
                                }
                            }
                            //update reminder stuff
                            reminder.setOrderReminder();
                            res.sendStatus(200);
                        });
                    });
                } else {
                    //updating another menu
                    DB.Menu.findOne(query, (err, oldMenu) => {
                        if (err) {
                            console.error(err);
                            return res.sendStatus(400);
                        } else if (!oldMenu) {
                            return res.sendStatus(404);
                        }
                        DB.Menu.findOneAndUpdate(query, data, options, (err, menu) => {
                            if (err) {
                                console.error(err);
                                return res.sendStatus(500);
                            } else if (!menu) {
                                return res.sendStatus(404);
                            }
                            res.sendStatus(200);
                        });
                    });
                }
            }
        })
    }
}

function _deleteMenu(req, res) {
    const query = {
        _id: req.params.id
    };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root users SHALL update ONLY the deleted flag
        query.enabled = false;
        const data = {
                deleted: true,
                updatedAt: moment().format()
            },
            options = {
                new: false
            };
        DB.Menu.findOneAndUpdate(query, data, options, (err, menu) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!menu) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    } else {
        //Root user full remove
        DB.Menu.findOneAndRemove(query, (err, menu) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!menu) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    }
}

//Orders stuff
function _getOrders(req, res) {
    const id = req.params.id,
        query = {},
        select = {
            owner: 1,
            deleted: 1,
            table: 1,
            firstCourse: 1,
            secondCourse: 1,
            createdAt: 1,
            updatedAt: 1
        },
        options = {
            offset: req.query.offset || undefined,
            limit: req.query.limit || 50
        };
    //TODO add filter query
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        query.deleted = false;
    }
    if (!id) {
        DB.Order.find(query, select, options).populate('table').populate({
            path: 'owner',
            select: 'username email _id'
        }).populate('menu').exec((err, orders) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            res.json(orders);
        });
    } else {
        query._id = id;
        DB.Order.findOne(query, select).populate('table').populate({
            path: 'owner',
            select: 'username email _id'
        }).populate('menu').exec((err, order) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!order) {
                return res.sendStatus(404);
            }
            res.json(order);
        });
    }
}

function _addOrder(req, res) {
    let data = req.body;
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.updatedAt;
        delete data.createdAt;
    }
    data.createdAt = moment().format();
    const newOrder = new DB.Order(data);
    newOrder.save((err, order) => {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }
        res.status(201).send(order);
    });
}

function _updateOrder(req, res) {
    const query = {
            _id: req.params.id
        },
        data = req.body,
        options = {
            new: true
        };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.createdAt;
    }

    data.updatedAt = moment().format();

    DB.Order.findOneAndUpdate(query, data, options, (err, order) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        } else if (!order) {
            return res.sendStatus(404);
        }
        res.sendStatus(200);
    });
}

function _deleteOrder(req, res) {
    const query = {
        _id: req.params.id
    };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root users SHALL update ONLY the deleted flag
        const data = {
                deleted: true,
                updatedAt: moment().format()
            },
            options = {
                new: false
            };
        DB.Order.findOneAndUpdate(query, data, options, (err, order) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!order) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    } else {
        //Root user full remove
        DB.Order.findOneAndRemove(query, (err, order) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!order) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    }
}

//Tables stuff
function _getTables(req, res) {
    const id = req.params.id,
        query = {},
        select = {
            name: 1,
            enabled: 1,
            deleted: 1,
            seats: 1,
            createdAt: 1,
            updatedAt: 1
        },
        options = {
            offset: req.query.offset || undefined,
            limit: req.query.limit || 50
        };
    //TODO add filter query
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        query.deleted = false;
    }
    if (!id) {
        DB.Table.find(query, select, options).exec((err, tables) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            res.send(tables);
        });
    } else {
        query._id = id;
        DB.Table.findOne(query, select).exec((err, table) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!table) {
                return res.sendStatus(404);
            }
            res.send(table);
        });
    }
}

function _addTable(req, res) {
    let data = req.body;
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.updatedAt;
        delete data.createdAt;
    }
    const newTable = new DB.Table(data);
    data.createdAt = moment().format();
    newTable.save((err, table) => {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }
        res.status(201).send(table);
    });
}

function _updateTable(req, res) {
    const query = {
            _id: req.params.id
        },
        data = req.body,
        options = {
            new: true
        };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.createdAt;
    }

    data.updatedAt = moment().format();

    DB.Table.findOneAndUpdate(query, data, options, (err, table) => {
        if (err) {
            console.error(err);
            return res.sendStatus(500);
        } else if (!table) {
            return res.sendStatus(404);
        }
        res.sendStatus(200);
    });
}

function _deleteTable(req, res) {
    const query = {
        _id: req.params.id
    };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root users SHALL update ONLY the deleted flag
        const data = {
                deleted: true,
                updatedAt: moment().format()
            },
            options = {
                new: false
            };
        DB.Table.findOneAndUpdate(query, data, options, (err, table) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!table) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    } else {
        //Root user full remove
        DB.Table.findOneAndRemove(query, (err, table) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (!table) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        });
    }
}

exports.users = {
    get: _getUsers,
    add: _addUser,
    update: _updateUser,
    delete: _deleteUser
};

exports.menus = {
    get: _getMenus,
    add: _addMenu,
    update: _updateMenu,
    delete: _deleteMenu
};

exports.orders = {
    get: _getOrders,
    add: _addOrder,
    update: _updateOrder,
    delete: _deleteOrder
};

exports.tables = {
    get: _getTables,
    add: _addTable,
    update: _updateTable,
    delete: _deleteTable
};

exports.getStats = function(req, res) {
    let stats = {
        users: 1,
        dailyOrders: 2,
        orders: 3,
        menus: 4,
        dailyMenuStatus: false
    }

    async.parallel({
        users: (callback) => {
            DB.User.count({
                deleted: false,
                "telegram.enabled": true
            }, callback)
        },
        usersPending: (callback) => {
            DB.User.count({
                deleted: false,
                "telegram.enabled": false
            }, callback)
        },
        menus: (callback) => {
            DB.Menu.count({
                deleted: false
            }, callback)
        },
        orders: (callback) => {
            DB.Order.count({
                deleted: false
            }, callback)
        },
        ordersStats: (callback) => {
            DB.getDailyOrderStats(null, (err, stats) => {
                if (err) {
                    return callback(err);
                }
                //console.log(stats)
                callback(null, {
                    stats: stats,
                    text: bot.formatOrderComplete(stats)
                });
            })
        },
        dailyOrders: (callback) => {
            DB.getDailyOrdersCount(null, callback);
        },
        dailyMenu: (callback) => {
            DB.getDailyMenu(null, callback);
        }
    }, (err, results) => {
        stats.users = results.users
        stats.usersPending = results.usersPending
        stats.menus = results.menus
        stats.orders = results.orders
        stats.ordersStats = results.ordersStats
        stats.dailyOrders = results.dailyOrders
        stats.dailyMenu = results.dailyMenu
        res.send(stats);
    });

}