/**
 * manager.js
 * Application manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const moment = require('moment'),
    async = require('async'),
    validator = require('validator'),
    levels = require('./levels'),
    roles = require("./roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels,
    reminder = require('./reminder'),
    auth = require('./auth'),
    mail = require('./mail'),
    bot = require("./telegram/bot"),
    telegramBot = require("./telegram/bot").bot,
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
            points: 1,
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
            limit: req.query.limit || 100,
            sort: {
                updatedAt: -1
            }
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

    //Disabled for now
    return res.sendStatus(400);

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
        delete data.points;
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
        delete data.role;
        delete data.password;
        delete data.points;
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

    if (data.role) {
        if (!roles.userRoles[data.role])
            return res.sendStatus(400);
        data.role = roles.userRoles[data.role];
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
        if (!user.telegram.enabled && data.$set && data.$set["telegram.enabled"] == true && data.sendNotification) {
            botNotifications.accountEnabledDisabled(user, true);
            bot.broadcastMessage("User *" + user.email + "* enabled by *" + req.user.email + "*", accessLevels.admin, null, true);
        } else if (user.telegram.enabled && data.$set && data.$set["telegram.enabled"] == false && data.sendNotification) {
            botNotifications.accountEnabledDisabled(user, false);
            bot.broadcastMessage("User *" + user.email + "* disabled by *" + req.user.email + "*", accessLevels.admin, null, true);
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
            bot.broadcastMessage("User *" + user.email + "* deleted by *" + req.user.email + "*", accessLevels.root, null, true);
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
            limit: req.query.limit || 100,
            sort: {
                updatedAt: -1
            }
        };
    //TODO add filter query
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        query.deleted = false;
    }

    if (!checkUserAccessLevel(req.user.role, accessLevels.admin)) {
        //user limitations
        select.deleted = -1;
        select.owner = -1;
        select.enabled = -1;
        select.tables = -1;
        query.deleted = false;
        query.enabled = true; //users view only enabled menus
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
        query = {
            deleted: false,
            _id: {
                $ne: data._id
            },
            day: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            }
        };
    DB.Menu.findOne(query, (err, res) => {
        if (err) {
            console.error(err);
        } else {
            cb(res)
        }
    });
}

function menuIsValid(menu) {
    if (!menu.day) {
        console.error("Menu date is required")
        return false;
    }
    if (menu.firstCourse && menu.firstCourse.items) {
        for (let i = 0; i < menu.firstCourse.items.length; i++) {
            let fc = menu.firstCourse.items[i];
            if (fc.value == undefined || fc.value.trim() == "") {
                console.error("Invalid menu firstCourse item");
                return false;
            }
            for (let j = 0; j < fc.condiments.length; j++) {
                let condiment = fc.condiments[j];
                if (condiment == undefined || condiment.trim() == "") {
                    console.error("Invalid menu firstCourse item condiment");
                    return false;
                }
            }
        }
    } else {
        console.error("Invalid menu firstCourse");
        return false;
    }
    return true;
}

let dailyMenuNotificationTimeout;

function notifyDailyMenu(menu) {
    const timeout = 1; //seconds
    console.log("Daily menu will be broadcasted in " + timeout + " seconds.");
    clearTimeout(dailyMenuNotificationTimeout);
    dailyMenuNotificationTimeout = setTimeout(() => {
        botNotifications.dailyMenu(menu);
    }, 1000 * timeout);
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

    if (!menuIsValid(data)) {
        res.sendStatus(400);
    } else {
        if (data.deadline) {
            let deadline = moment(data.deadline, "HH:mm");
            data.deadline = moment(data.day, "YYYY-MM-DD").set('hour', deadline.hours()).set('minutes', deadline.minutes()).toISOString(true);
        }
        checkDailyMenu(data, (dailymenu) => {
            if (dailymenu) {
                console.log("Daily menu already present")
                res.status(400).send("Daily menu already present");
            } else {
                const newMenu = new DB.Menu(data);
                newMenu.save((err, menu) => {
                    if (err) {
                        console.error(err);
                        return res.sendStatus(400);
                    }
                    if (data.sendNotification && menu.enabled) {
                        if (moment(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline))) {
                            notifyDailyMenu(menu);
                            //Add 1 point
                            /*levels.addPoints(req.user._id, 1, false, (err, points) => {
                                if (err) {
                                    console.error(err);
                                }
                            });*/
                        }
                    }
                    bot.broadcastMessage("Daily Menu uploaded by *" + req.user.email + "*", accessLevels.root, null, true);
                    //update reminder stuff
                    reminder.initDailyReminders();
                    res.status(201).send(menu);
                });
            }
        });
    }
}

// Returns the orders which has been affected by the menu changes
// returns:
// ordersToDelete = result[0]
// ordersNotAffected = result[1]
function getOrdersMenuDiff(oldMenu, menu, orders) {

    console.log("Menu diff checking...");

    // check removed tables
    const removedTables = oldMenu.tables.filter(ot => menu.tables.indexOf(ot) < 0);
    for (let i = 0; i < removedTables.length; i++) {
        let tableID = removedTables[i];
        console.log("Table _id:" + tableID + " has been removed");
        for (let j = 0; j < orders.length; j++) {
            if (orders[j].deprecated)
                continue;
            orders[j].deprecated = String(tableID).localeCompare(String(orders[j].table._id)) == 0;
            if (orders[j].deprecated) {
                console.log("Order _id:" + orders[j]._id + " (" + orders[j].owner.email + ") will be removed because table '" + orders[j].table.name + "' has been removed");
            }
        }
    }

    // firstCourse check
    for (let i = 0; i < oldMenu.firstCourse.items.length; i++) {
        let oldFc = oldMenu.firstCourse.items[i];

        if (menu.firstCourse.items.map(mfc => mfc.value).indexOf(oldFc.value) < 0) {
            console.log("First course '" + oldFc.value + "' has been removed");
            for (let k = 0; k < orders.length; k++) {
                if (orders[k].deprecated)
                    continue;
                orders[k].deprecated = orders[k].firstCourse && orders[k].firstCourse.item.localeCompare(oldFc.value) == 0;
                if (orders[k].deprecated) {
                    console.log("Order _id:" + orders[k]._id + " (" + orders[k].owner.email + ") will be removed because firstCourse '" + oldFc.value + "' has been removed");
                }
            }
        } else {
            // condiments check
            for (let j = 0; j < menu.firstCourse.items.length; j++) {
                let newFc = menu.firstCourse.items[j];
                if (newFc.value.localeCompare(oldFc.value) == 0) {
                    for (let k = 0; k < oldFc.condiments.length; k++) {
                        let oldCondiment = oldFc.condiments[k];
                        if (newFc.condiments.indexOf(oldCondiment) < 0) {
                            console.log("Condiment '" + oldCondiment + "' has been removed");
                            for (let z = 0; z < orders.length; z++) {
                                if (orders[z].deprecated)
                                    continue;
                                orders[z].deprecated = orders[z].firstCourse && orders[z].firstCourse.item.localeCompare(oldFc.value) == 0 && orders[z].firstCourse.condiment.localeCompare(oldCondiment) == 0;
                                if (orders[z].deprecated) {
                                    console.log("Order _id:" + orders[z]._id + " (" + orders[z].owner.email + ") will be removed because condiment '" + oldCondiment + "' has been removed");
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // secondCourse check
    for (let i = 0; i < oldMenu.secondCourse.items.length; i++) {
        let oldSc = oldMenu.secondCourse.items[i];
        if (menu.secondCourse.items.indexOf(oldSc) < 0) {
            console.log("Second course '" + oldSc + "' has been removed");
            for (let z = 0; z < orders.length; z++) {
                if (orders[z].deprecated)
                    continue;
                orders[z].deprecated = orders[z].secondCourse && orders[z].secondCourse.item.localeCompare(oldSc) == 0;
                if (orders[z].deprecated) {
                    console.log("Order _id:" + orders[z]._id + " (" + orders[z].owner.email + ") will be removed because second course '" + oldSc + "' has been removed");
                }
            }
        }
    }

    //side dishes checks
    for (let i = 0; i < oldMenu.secondCourse.sideDishes.length; i++) {
        let oldSideDish = oldMenu.secondCourse.sideDishes[i];
        if (menu.secondCourse.sideDishes.indexOf(oldSideDish) < 0) {
            console.log("Side dish '" + oldSideDish + "' has been removed");
            for (let z = 0; z < orders.length; z++) {
                if (orders[z].deprecated)
                    continue;
                orders[z].deprecated = orders[z].secondCourse && orders[z].secondCourse.sideDishes.indexOf(oldSideDish) >= 0;
                if (orders[z].deprecated) {
                    console.log("Order _id:" + orders[z]._id + " (" + orders[z].owner.email + ") will be removed because side dish '" + oldSideDish + "' has been removed");
                }
            }
        }
    }

    let ordersToDelete = orders.filter(o => o.deprecated),
        ordersNotAffected = orders.filter(o => !o.deprecated);
    console.log(ordersToDelete.length + "/" + orders.length + " affected orders.");
    return [ordersToDelete, ordersNotAffected];
}
exports.getOrdersMenuDiff = getOrdersMenuDiff;

function getDailyOrdersMenuDiff(oldMenu, menu, cb) {
    DB.getDailyOrders(null, (err, orders) => {
        if (err) {
            cb(err);
        } else {
            cb(null, getOrdersMenuDiff(oldMenu, menu, orders));
        }
    });
}

function _updateMenu(req, res) {
    const query = {
            _id: req.params.id
        },
        data = req.body,
        options = {
            new: true
        };

    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data.deleted;
        data.owner = req.user._id;
    }
    if (!data.owner) {
        data.owner = req.user._id;
    }

    data._id = req.params.id;
    data.updatedAt = moment().format();
    delete data.createdAt;

    if (!menuIsValid(data)) {
        res.sendStatus(400);
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
                        } else if (oldMenu.enabled && !(moment(data.day).isSame(moment(oldMenu.day), 'day'))) {
                            console.warn("Changing menu data when menu is enabled its not allowed")
                            return res.sendStatus(400);
                        } else if (!checkUserAccessLevel(req.user.role, accessLevels.root) && moment().isAfter(moment(oldMenu.deadline).add(2, 'h'))) {
                            console.error("Cannot update daily menu 2h after deadline");
                            return res.sendStatus(400);
                        }

                        //require the orders lock to allow people that are ordering to finish their ordering process and then update the dailyMenu
                        //in case of conflicts the users will be notified afterward
                        const ordersLock = require('./telegram/scenes/order').getOrdersLock();
                        ordersLock.writeLock('order', function (release) {

                            DB.Menu.findOneAndUpdate(query, data, options, (err, menu) => {
                                if (err) {
                                    console.error(err);
                                    res.sendStatus(500);
                                    return release();
                                } else if (!menu) {
                                    res.sendStatus(404);
                                    return release();
                                }
                                if (data.sendNotification) {
                                    if (moment.utc(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline))) {
                                        if (!oldMenu.enabled && menu.enabled) {
                                            console.log("Daily menu has been enabled!")
                                            notifyDailyMenu(menu);
                                            release();
                                        } else if (menu.enabled) {

                                            getDailyOrdersMenuDiff(oldMenu, menu, (err, result) => {
                                                if (err) {
                                                    console.error(err);
                                                    return release();
                                                }
                                                const ordersToDelete = result[0],
                                                    ordersNotAffected = result[1];
                                                if (ordersToDelete.length == 0) {
                                                    console.log("No orders has been affected by menu changes. Skipping");
                                                    botNotifications.dailyMenuUpdatedNotify(ordersNotAffected.map(o => o.owner));
                                                    release();
                                                } else {
                                                    console.log("Deleting " + ordersToDelete.length + " orders...");
                                                    DB.Order.deleteMany({
                                                        _id: {
                                                            $in: ordersToDelete.map(o => o._id)
                                                        }
                                                    }, (_err) => {
                                                        if (_err) {
                                                            console.error(_err);
                                                            release();
                                                        } else {
                                                            console.log("Orders deleted!");
                                                            //and lets notify the related users to place an order again
                                                            botNotifications.dailyMenuUpdated(ordersToDelete.map(o => o.owner), () => {
                                                                release();
                                                            });
                                                            botNotifications.dailyMenuUpdatedNotify(ordersNotAffected.map(o => o.owner));
                                                        }
                                                    });

                                                }
                                            });
                                        } else {
                                            release();
                                        }
                                    } else {
                                        release();
                                    }
                                } else {
                                    release();
                                }
                                bot.broadcastMessage("Daily Menu updated by *" + req.user.email + "*", accessLevels.root, null, true);
                                //update reminder stuff
                                reminder.initDailyReminders();
                                res.sendStatus(200);
                            });
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
                        } else if (oldMenu.enabled && !(moment(data.day).isSame(moment(oldMenu.day), 'day'))) {
                            console.warn("Changing menu data when menu is enabled its not allowed")
                            return res.sendStatus(400);
                        } else if (oldMenu.enabled && moment(data.day).isBefore(moment(), 'day')) {
                            console.warn("Cannot edit old menus");
                            return res.sendStatus(400);
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
    const ordersLock = require('./telegram/scenes/order').getOrdersLock();
    ordersLock.writeLock('order', function (release) {
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
                release();
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                } else if (!menu) {
                    return res.sendStatus(404);
                }
                //check if its the daily menu
                if (moment.utc(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline))) {
                    clearTimeout(dailyMenuNotificationTimeout);
                    reminder.initDailyReminders();
                    bot.broadcastMessage("Daily Menu deleted by *" + req.user.email + "*", accessLevels.root, null, true);
                    //TODO send user notifications
                }
                res.sendStatus(200);
            });
        } else {
            //Root user full remove
            DB.Menu.findOneAndRemove(query, (err, menu) => {
                release();
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                } else if (!menu) {
                    return res.sendStatus(404);
                }
                //check if its the daily menu
                if (moment.utc(menu.day).isSame(moment(), 'day') && moment().isBefore(moment(menu.deadline))) {
                    clearTimeout(dailyMenuNotificationTimeout);
                    reminder.initDailyReminders();
                    bot.broadcastMessage("Daily Menu deleted by *" + req.user.email + "*", accessLevels.root, null, true);
                    //TODO send user notifications
                }
                res.sendStatus(200);
            });
        }
    });
}

function getPaginationOptions(req) {
    let options = {
        limit: 100,
        sort: {
            updatedAt: -1
        }
    };
    if (req.query.pageSize && parseInt(req.query.pageSize) != isNaN) {
        options.limit = parseInt(req.query.pageSize);
    }
    if (req.query.sorted) {
        try {
            let sort = JSON.parse(req.query.sorted);
            if (Array.isArray(sort)) {
                options.sort = {}
                for (let i = 0; i < sort.length; i++) {
                    options.sort[sort[i].id] = sort[i].desc ? -1 : 1
                }
            }
        } catch (ex) {
            console.error(ex);
        }
    }
    if (req.query.pageSize && req.query.page) {
        let pageSize = parseInt(req.query.pageSize),
            page = parseInt(req.query.page);
        if (pageSize != isNaN && page != isNaN && pageSize >= 0 && page >= 0)
            options.skip = req.query.pageSize * req.query.page;
    }
    return options;
}

function getPaginationQuery(req) {
    let query = {};
    if (req.query.filtered) {
        try {
            let filter = JSON.parse(req.query.filtered);
            if (Array.isArray(filter)) {
                for (let i = 0; i < filter.length; i++) {
                    query[filter[i].id] = {
                        "$regex": filter[i].value,
                        "$options": "i"
                    }
                }
            }
        } catch (ex) {
            console.error(ex);
        }
    }
    return query;
}

//Orders stuff
function _getOrders(req, res) {
    const id = req.params.id,
        query = {},
        select = {
            owner: 1,
            deleted: 1,
            table: 1,
            rating: 1,
            firstCourse: 1,
            secondCourse: 1,
            createdAt: 1,
            updatedAt: 1
        },
        options = getPaginationOptions(req);

    Object.assign(query, getPaginationQuery(req));

    if (!checkUserAccessLevel(req.user.role, accessLevels.admin)) {
        //normal user get only its own orders
        query.owner = req.user._id;
        select.owner = -1
    }
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        select.deleted = -1;
        query.deleted = false;
    }
    if (!id) {
        DB.Order.countDocuments(query, (err, totalOrders) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else {
                DB.Order.find(query, select, options).populate('table').populate({
                    path: 'owner',
                    select: 'username email _id'
                }).populate('menu').exec((err, orders) => {
                    if (err) {
                        console.error(err);
                        return res.sendStatus(500);
                    }
                    res.json({
                        data: orders,
                        total: totalOrders
                    });
                });
            }
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

//validate an order against a menu
function orderIsValid(order, menu) {

    try {

        if (order.firstCourse && order.secondCourse) {
            console.error("only one dish is allowed");
            return false;
        }
        if (!order.firstCourse && !order.secondCourse) {
            console.error("missing field firstCourse/secondCourse");
            return false;
        }
        if (!order.table || !menu.tables.reduce((r, m) => m._id == order.table ? r.concat(m._id) : r, []).length) {
            console.error("missing table/not found");
            return false;
        }

        //types check
        if (order.firstCourse && order.firstCourse.item && (order.firstCourse.item + '').length == 0) {
            console.error("invalid firstCourse item");
            return false;
        }
        if (order.firstCourse && order.firstCourse.condiment && (order.firstCourse.condiment + '').length == 0) {
            console.error("invalid firstCourse condiment");
            return false;
        }
        if (order.secondCourse && order.secondCourse.item && (order.secondCourse.item + '').length == 0) {
            console.error("invalid secondCourse item");
            return false;
        }
        if (order.secondCourse && order.secondCourse.sideDishes) {
            if (!Array.isArray(order.secondCourse.sideDishes)) {
                console.error("invalid secondCourse sideDishes");
                return false;
            }
            for (let i = 0; i < order.secondCourse.sideDishes.length; i++) {
                if ((order.secondCourse.sideDishes[i] + '').length == 0) {
                    console.error("invalid secondCourse sideDishes");
                    return false;
                }
            }
        }

        //firstCourse item check
        if (order.firstCourse && order.firstCourse.item) {
            if (!menu.firstCourse || menu.firstCourse.items.map(fc => fc.value).indexOf(order.firstCourse.item.toLowerCase()) < 0) {
                console.error("firstCourse item not found");
                return false;
            }
        }
        //firstCourse condiment check
        if (order.firstCourse) {
            if (!order.firstCourse.item) {
                console.error("invalid condiment, missing firstCourse item");
                return false;
            }
            if (!menu.firstCourse) {
                console.error("menu firstCourse missing");
                return false;
            }
            const menuCondiments = menu.firstCourse.items.filter(fc => fc.value == order.firstCourse.item.toLowerCase())[0].condiments;
            if (menuCondiments.length && !order.firstCourse.condiment) {
                console.error("order firstCourse condiment missing");
                return false;
            }
            if (order.firstCourse.condiment && menuCondiments.indexOf(order.firstCourse.condiment.toLowerCase()) < 0) {
                console.error("order firstCourse condiment not found");
                return false;
            }
        }

        //secondCourse item check
        if (order.secondCourse) {
            if (!order.secondCourse.item) {
                console.error("order missing secondCourse item");
                return false;
            } else {
                if (!menu.secondCourse || menu.secondCourse.items.indexOf(order.secondCourse.item.toLowerCase()) < 0) {
                    console.error("order secondCourse not found");
                    return false;
                }
            }
        }
        //secondCourse sideDishes check
        if (order.secondCourse && order.secondCourse.sideDishes) {
            if (!order.secondCourse.item) {
                console.error("invalid sideDishes, missing secondCourse item");
                return false;
            }
            if (Array.isArray(order.secondCourse.sideDishes)) {
                for (let i = 0; i < order.secondCourse.sideDishes.length; i++) {
                    if (!menu.secondCourse || menu.secondCourse.sideDishes.indexOf(order.secondCourse.sideDishes[i].toLowerCase()) < 0) {
                        console.error("secondCourse sidedish not found");
                        return false;
                    }
                }
            } else {
                console.error("secondCourse invalid sidedishes");
                return false;
            }
        }

    } catch (ex) {
        console.error(ex);
        return false;
    }
    return true;
}
exports.orderIsValid = orderIsValid;

function _addOrder(req, res) {
    let data = req.body;

    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.rating;
        delete data.updatedAt;
    }
    data.createdAt = moment().format();

    //check owner
    if (!data.owner)
        data.owner = req.user._id;
    if (!checkUserAccessLevel(req.user.role, accessLevels.admin)) {
        //normal user can save only its own order
        data.owner = req.user._id;
    }

    data.createdBy = req.user._id;
    data.updatedBy = req.user._id;

    const ordersLock = require('./telegram/scenes/order').getOrdersLock();
    ordersLock.writeLock('order', function (release) {

        DB.getDailyMenu(null, (err, menu) => {
            if (err || !menu) {
                console.error(err || "daily menu not found");
                res.sendStatus(400);
                return release();
            } else {
                //force adding orders only for the dailyMenu
                data.menu = menu._id;

                //check deadline for non admin users
                if (!checkUserAccessLevel(req.user.role, accessLevels.admin) && moment().isAfter(moment(menu.deadline))) {
                    console.error("cannot add order: deadline reached")
                    res.sendStatus(400);
                    return release();
                }

                //order validation against daily menu
                if (!orderIsValid(data, menu)) {
                    res.sendStatus(400);
                    return release();
                }

                DB.getTablesStatus(null, (err, tables) => {
                    if (err) {
                        res.sendStatus(400);
                        return release();
                    } else if (tables[data.table].used >= tables[data.table].total) {
                        console.error("cannot add order: table is full")
                        res.sendStatus(400);
                        return release();
                    } else {
                        const newOrder = new DB.Order(data);
                        newOrder.save((err, order) => {
                            if (err) {
                                console.error(err);
                                res.sendStatus(400);
                                return release();
                            }
                            res.status(201).send(order);
                            release();
                            order.populate('owner').populate('createdBy').execPopulate().then((_order) => {
                                console.log("New web order: " + _order.owner.email + " [" + _order.createdBy.email + "]");
                                let message = "Your *order* has been successfully added" + (_order.createdBy.email == _order.owner.email ? "!" : (" by " + bot.getUserLink(_order.createdBy) + "!"));
                                telegramBot.telegram.sendMessage(_order.owner.telegram.id, message, {
                                    parse_mode: "markdown"
                                });
                            });

                        });

                    }
                });
            }
        });

    });
}

function _updateOrder(req, res) {
    const query = {
            _id: req.params.id,
            deleted: false
        },
        data = req.body,
        options = {
            new: true
        };
    if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
        //non root user limitations
        delete data._id;
        delete data.deleted;
        delete data.rating;
        delete data.createdAt;
        delete data.menu; //avoid to switch the menu
        delete data.owner; //avoid to switch the owner
        delete data.createdBy; //avoid to switch the creator
    }

    if (!checkUserAccessLevel(req.user.role, accessLevels.admin)) {
        //normal user can update only its own order
        query.owner = req.user._id;
    }

    data.updatedBy = req.user._id;
    data.updatedAt = moment().format();

    //only one dish is allowed, lets unset the other one
    data.$unset = data.firstCourse ? ({
        secondCourse: ""
    }) : ({
        firstCourse: ""
    });

    const ordersLock = require('./telegram/scenes/order').getOrdersLock();
    ordersLock.writeLock('order', function (release) {

        DB.getDailyMenu(null, (err, menu) => {
            if (err || !menu) {
                console.error(err || "daily menu not found");
                res.sendStatus(400);
                return release();
            } else {
                //force updating orders only for the dailyMenu
                query.menu = menu._id;

                //check deadline for non admin users
                if (!checkUserAccessLevel(req.user.role, accessLevels.admin) && moment().isAfter(moment(menu.deadline))) {
                    console.error("cannot update order: deadline reached")
                    res.sendStatus(400);
                    return release();
                }

                //order validation against daily menu
                if (!orderIsValid(data, menu)) {
                    res.sendStatus(400);
                    return release();
                }

                DB.Order.findOne(query, (err, order) => {
                    if (err) {
                        console.error(err);
                        res.sendStatus(500);
                        return release();
                    } else if (!order) {
                        res.sendStatus(404);
                        return release();
                    }

                    DB.getTablesStatus(null, (err, tables) => {
                        if (err) {
                            res.sendStatus(400);
                            return release();
                        } else if (order.table && order.table != data.table && tables[data.table].used >= tables[data.table].total) {
                            console.error("cannot update order: table is full")
                            res.sendStatus(400);
                            return release();
                        } else {
                            //table checking done, lets update the order
                            DB.Order.findByIdAndUpdate(order._id, data, options, (err, updatedOrder) => {
                                if (err) {
                                    console.error(err);
                                    res.sendStatus(500);
                                    return release();
                                }

                                res.status(200).send(updatedOrder);
                                release();

                                //TODO check and remove one point if the user previously got one point as first daily order winner

                                //User notification
                                updatedOrder.populate('owner').populate('updatedBy').execPopulate().then((_order) => {
                                    console.log("Web order updated: " + _order.owner.email + " [" + _order.updatedBy.email + "]");
                                    let message = "Your *order* has been updated" + (_order.updatedBy.email == _order.owner.email ? "!" : (" by " + bot.getUserLink(_order.updatedBy) + "!"));
                                    telegramBot.telegram.sendMessage(_order.owner.telegram.id, message, {
                                        parse_mode: "markdown"
                                    });
                                });

                            });
                        }
                    });

                });
            }
        });
    });

}

function _deleteOrder(req, res) {
    const query = {
        _id: req.params.id,
        deleted: false
    };
    if (!checkUserAccessLevel(req.user.role, accessLevels.admin)) {
        //normal user can delete only its own order
        query.owner = req.user._id;
    }

    const ordersLock = require('./telegram/scenes/order').getOrdersLock();
    ordersLock.writeLock('order', function (release) {

        if (!checkUserAccessLevel(req.user.role, accessLevels.root)) {
            //non root users SHALL update ONLY the deleted flag
            const data = {
                    deleted: true,
                    updatedAt: moment().format(),
                    updatedBy: req.user._id
                },
                options = {
                    new: true
                };
            DB.Order.findOne(query, (err, order) => {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                    return release();
                } else if (!order) {
                    res.sendStatus(404);
                    return release();
                }

                order.populate('owner').populate('menu').execPopulate().then((_order) => {

                    // normal users check for menu deadline
                    if (!checkUserAccessLevel(req.user.role, accessLevels.admin) && moment(_order.menu.deadline).isBefore(moment())) {
                        res.sendStatus(400);
                        return release();
                    }
                    if (!checkUserAccessLevel(req.user.role, accessLevels.root) && !moment.utc(_order.menu.day).isSame(moment(), 'day')) {
                        //for non root users, avoid to delete old orders
                        res.sendStatus(400);
                        return release();
                    }

                    DB.Order.findByIdAndUpdate(order._id, data, options, (err, deletedOrder) => {
                        if (err) {
                            console.error(err);
                            res.sendStatus(500);
                            return release();
                        }
                        res.sendStatus(200);
                        release();
                        console.log("Web order deleted: " + _order.owner.email + " [" + req.user.email + "]");

                        //remove one point if the user is deleting its own order
                        if (req.user.email == _order.owner.email) {
                            levels.removePoints(_order.owner._id, 1, false, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                        }

                        let message = "Your *order* has been deleted" + (req.user.email == _order.owner.email ? "!" : (" by " + bot.getUserLink(req.user) + "!"));
                        telegramBot.telegram.sendMessage(_order.owner.telegram.id, message, {
                            parse_mode: "markdown"
                        });
                    });
                });
            });
        } else {
            delete query.deleted;
            //Root user full remove
            DB.Order.findOneAndRemove(query, (err, order) => {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                    return release();
                } else if (!order) {
                    res.sendStatus(404);
                    return release();
                }
                res.sendStatus(200);
                release();
                order.populate('owner').execPopulate().then((_order) => {
                    console.log("Web order deleted: " + _order.owner.email + " [" + req.user.email + "]");
                    let message = "Your *order* has been deleted" + (req.user.email == _order.owner.email ? "!" : (" by " + bot.getUserLink(req.user) + "!"));
                    telegramBot.telegram.sendMessage(_order.owner.telegram.id, message, {
                        parse_mode: "markdown"
                    });
                });
            });
        }
    });
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
            limit: req.query.limit || 100,
            sort: {
                updatedAt: -1
            }
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

exports.getStats = function (req, res) {
    let stats = {
        users: 1,
        dailyOrders: 2,
        orders: 3,
        menus: 4,
        dailyMenuStatus: false
    }

    async.parallel({
        users: (callback) => {
            DB.User.countDocuments({
                deleted: false,
                "telegram.enabled": true
            }, callback)
        },
        usersPending: (callback) => {
            DB.User.countDocuments({
                deleted: false,
                "telegram.enabled": false
            }, callback)
        },
        menus: (callback) => {
            DB.Menu.countDocuments({
                deleted: false
            }, callback)
        },
        orders: (callback) => {
            DB.Order.countDocuments({
                deleted: false
            }, callback)
        },
        usersWithoutOrder: (callback) => {
            DB.getNotOrderUsers(null, (err, users) => {
                if (err) {
                    return callback(null, []);
                }
                callback(null, users);
            });
        },
        tablesStats: (callback) => {
            DB.getTablesStatus(null, (err, tablesStats) => {
                if (err) {
                    return callback(null, {});
                }
                callback(null, tablesStats);
            })
        },
        ordersStats: (callback) => {
            DB.getDailyOrderStats(null, (err, stats) => {
                if (err) {
                    return callback(null, null);
                }
                //console.log(stats)
                callback(null, {
                    stats: stats,
                    text: bot.formatOrderComplete(stats)
                });
            })
        },
        dailyOrders: (callback) => {
            DB.getDailyOrdersCount(null, (err, dailyOrders) => {
                if (err) {
                    callback(null, 0)
                } else {
                    callback(null, dailyOrders);
                }
            });
        },
        dailyMenu: (callback) => {
            const today = moment().startOf("day"),
                tomorrow = moment(today).add(1, "days"),
                query = {
                    deleted: false,
                    day: {
                        $gte: today.toDate(),
                        $lt: tomorrow.toDate()
                    }
                };
            DB.Menu.findOne(query).populate('tables').populate({
                path: 'owner',
                select: 'username email _id'
            }).exec((err, results) => {
                if (err) {
                    callback(null)
                } else {
                    callback(null, results);
                }
            });
        }
    }, (err, results) => {
        if (err)
            console.error(err);
        stats.users = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.users : undefined;
        stats.usersPending = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.usersPending : undefined;
        stats.usersWithoutOrder = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.usersWithoutOrder : undefined;
        stats.menus = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.menus : undefined;
        stats.orders = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.orders : undefined;
        stats.ordersStats = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.ordersStats : undefined;
        stats.dailyOrders = checkUserAccessLevel(req.user.role, accessLevels.admin) ? results.dailyOrders : undefined;
        stats.dailyMenu = results.dailyMenu;
        stats.tablesStats = results.tablesStats;
        res.send(stats);
    });
}

exports.getSuggestions = (req, res) => {
    DB.getMenuSuggestions((err, suggestions) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            res.json(suggestions);
        }
    });
}

function sendMessage(user, message, options) {
    console.log("Broadcasting message to: " + user.telegram.id + "-" + user.telegram.first_name + " message: '" + message.substring(0, 50) + "...'");
    telegramBot.telegram.sendMessage(user.telegram.id, message, options).then(() => {
        console.log("Message sent to: " + user.telegram.id + "-" + user.telegram.first_name);
    });
}

exports.broadcastMessage = (req, res) => {
    const data = req.body,
        options = {
            parse_mode: "markdown",
            disable_notification: data.silent ? true : undefined
        };
    if (!data.message && data.message.trim() == "") {
        console.error("Broadcast message error: required field 'message'");
        return res.sendStatus(400);
    }
    if (data.hasOrdered == true) {
        //Broadcast message to users who already placed an order today
        DB.getDailyOrders(null, (err, orders) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            for (let i = 0; i < orders.length; i++) {
                sendMessage(orders[i].owner, data.message, options);
            }
            res.sendStatus(200);
        });
    } else {
        //Broadcast message
        let query = {
            "telegram.enabled": true,
            "telegram.banned": false,
            "deleted": false
        };
        if (data.email != null) {
            query.email = data.email;
        }
        if (data.role && userRoles[data.role]) {
            query["role.bitMask"] = userRoles[data.role].bitMask
        }
        DB.User.find(query, (err, users) => {
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            } else if (users.length == 0) {
                res.sendStatus(404);
            } else {
                for (let i = 0; i < users.length; i++) {
                    sendMessage(users[i], data.message, options);
                }
                res.sendStatus(200);
            }
        });
    }
}

exports.sendMail = function (req, res) {
    const data = req.body,
        message = {
            to: data.to,
            subject: data.title,
            text: data.text
        };
    mail.sendMail(message, (err, info) => {
        if (err) {
            console.error(err);
            res.status(500).send(err);
        } else {
            if (info.accepted.length > 0) {
                res.status(200).send(info);
            } else {
                res.status(400).send(info);
            }
        }
    });
}