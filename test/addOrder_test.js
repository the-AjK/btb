/**
 * addOrder_test.js
 * unit tests
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

if (process.env.NODE_ENV !== "production") {
    console.log("Loading DEV enviroment...");
    require("dotenv").load({
        path: require("path").resolve(process.cwd(), '.testenv')
    });
}

const chai = require("chai"),
    expect = chai.expect,
    moment = require("moment"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    manager = require('../src/manager'),
    DB = require('../src/db'),
    telegramBot = require('../src/telegram/bot').bot,
    testDB = require('./db'),
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

chai.use(sinonChai);

let sendMessage;

describe('addOrder()', function () {

    before(function () {
        // runs before all tests in this block
        sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');
        sendMessage.callsFake((chatID, message, opts) => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });              
    });

    after(function () {
        // runs after all tests in this block
        sendMessage.restore();
    });

    beforeEach(function () {
        // runs before each test in this block
        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
    });

    afterEach(function () {
        // runs after each test in this block
    });

    it('000 should fail if no daily menu is available', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "pomodoro"
                    },
                    owner: requser._id
                },
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        //getDailymenu stub dont send a daily menu
        getDailyMenu.callsFake((date, cb) => {
            cb();
        });

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        }));

    });

    it('001 should fail if no daily menu available because db error', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "pomodoro"
                    },
                    owner: requser._id
                },
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        //simulate db error
        getDailyMenu.callsFake((date, cb) => {
            cb("db error")
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(500);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('002 should fail if the order table is not one of the daily menu tables', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        })
        const t3 = testDB.add(DB.Table, {
            name: "table3",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t3._id, //this table is not an available table for the daily menu
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "pomodoro"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu)
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });

    });

    it('003 should disallow normal user to edit important fields', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user //normal user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid", // try to set id
                    owner: requser._id,
                    deleted: true, //try to set delete field
                    rating: 10, //rating
                    updatedAt: null,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data._id).to.be.not.equal("testforceid");
                expect(data.deleted).to.be.not.equal(true);
                expect(data.rating).to.be.not.equal(10);
                expect(data.updatedAt).to.be.not.equal(null);
                expect(data.owner).to.be.equal(requser._id);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('004 should disallow admin user to edit important fields', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid",
                    owner: requser._id,
                    deleted: true,
                    rating: 10,
                    updatedAt: null,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data._id).to.be.not.equal("testforceid");
                expect(data.deleted).to.be.not.equal(true);
                expect(data.rating).to.be.not.equal(10);
                expect(data.updatedAt).to.be.not.equal(null);
                expect(data.owner).to.be.equal(requser._id);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('005 should disallow normal user to force a different owner', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user //normal user
        });
        const owner = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid",
                    owner: owner._id, //try to set a different owner
                    deleted: true,
                    rating: 10,
                    updatedAt: null,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.owner).to.be.equal(requser._id);
                expect(data.owner).to.be.not.equal(owner._id);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('006 should allow admin user to force a different owner', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const owner = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid",
                    owner: owner._id,
                    deleted: true,
                    rating: 10,
                    updatedAt: null,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.owner).to.be.equal(owner._id);
                expect(data.owner).to.be.not.equal(requser._id);
                expect(data.createdBy).to.be.equal(requser._id);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('007 should allow normal user add an order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid",
                    owner: requser._id,
                    deleted: true,
                    rating: 10,
                    updatedAt: null,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.owner).to.be.equal(requser._id);
                expect(data.createdBy).to.be.equal(requser._id);
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                expect(data.secondCourse.item).to.be.equal(undefined);
                expect(data.secondCourse.sideDishes.length).to.be.equal(0);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('008 should allow admin user to add an order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "emailjk@at.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    _id: "testforceid",
                    owner: requser._id,
                    deleted: true,
                    rating: 10,
                    updatedAt: null,
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.owner).to.be.equal(requser._id);
                expect(data.createdBy).to.be.equal(requser._id);
                expect(data.firstCourse.item).to.be.equal(undefined);
                expect(data.firstCourse.condiment).to.be.equal(undefined);
                expect(data.secondCourse.item).to.be.equal("carne");
                expect(data.secondCourse.sideDishes.length).to.be.equal(1);
                expect(data.secondCourse.sideDishes[0]).to.be.equal("patate al forno");
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('009 should fail if no dishes are selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    owner: requser._id
                    //no dishes selected
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('010 should fail if no table is selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                    //no table selected
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('011 should fail with unknow firstCourse item', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Carne", //wrong firstCourse
                        condiment: "Pomodoro"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('012 should fail with unknow firstCourse condiment', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Spaghetti",
                        condiment: "Sale e pepe" //wrong condiment
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('013 should fail with missing required firstCourse condiment', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Spaghetti" //spaghetti need a condiment selected
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('014 should success with missing unrequired firstCourse condiment', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }, {
                    value: "Insalatona",
                    condiments: []
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        item: "Insalatona" //Insalatona does not require a condiment
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.firstCourse.item).to.be.equal("insalatona");
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
    });

    it('015 should fail with firstCourse condiment and missing firstCourse item', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {
                        condiment: "Pomodoro" //missing firstCourse item
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('016 should fail with empty firstCourse', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {}, //empty fc
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('017 should fail with unknow secondCourse item', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Polpette", //unknow sc
                        sideDishes: []
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('018 should fail with unknow secondCourse sideDish', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno", "Prezzemolo"] //Prezzemolo is not a valid sd
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('019 should fail with secondCourse sideDish but missing secondCourse item', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        sideDishes: ["Patate al forno"] //Missing sc item
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('020 should fail with empty secondCourse', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {}, //empty sc
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('021 should be ok without sideDishes', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Melanzane",
                        sideDishes: [] //empty sd
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.secondCourse.item).to.be.equal("melanzane");
                expect(data.secondCourse.sideDishes.length).to.be.equal(0);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
        
    });

    it('022 should be ok without sideDishes missing key', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Melanzane" //missing sd key
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {

            const send = sinon.stub();
            send.callsFake((data) => {
                expect(data.secondCourse.item).to.be.equal("melanzane");
                expect(data.secondCourse.sideDishes.length).to.be.equal(0);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });

            manager.orders.add(req, {
                status: status
            });

        });
        
    });

    it('023 should fail with both dishes selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: { //bot dishes selected!
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    },
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('023a should fail with both dishes selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: { //bot dishes selected!
                        item: "Spaghetti",
                        condiment: "Pomodoro"
                    },
                    secondCourse: {},
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('023b should fail with both dishes selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    firstCourse: {},
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });


    it('024a should fail if deadline is reached for normal user', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().subtract(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('024b should be ok if deadline is reached for admin users', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().subtract(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: send
                }
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('025 should fail with no dishes selected', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(0);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });


    it('026 should fail if the user already place a daily order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });

        //requser order already in the db
        const order = testDB.add(DB.Order, {
            secondCourse: {
                item: "Carne",
                sideDishes: ["Cavolfiore"]
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Melanzane",
                        sideDishes: ["Cavolfiore"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(500);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(1);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    it('027 should fail if the table is full', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            seats: 1,
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 1,
            enabled: true
        });
        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const user = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara"]
                }]
            },
            secondCourse: {
                items: [
                    "Carne",
                    "Melanzane"
                ],
                sideDishes: ["Patate al forno", "Cavolfiore"]
            },
            tables: [t1._id, t2._id]
        });
        const order = testDB.add(DB.Order, {
            secondCourse: {
                item: "Melanzane",
                sideDishes: ["Cavolfiore"]
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: user._id
        });

        const req = {
                user: requser,
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Cavolfiore"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message)=>{
                        console.log(message)
                        getDailyMenu.restore();
                        DB.Order.countDocuments((err, count) => {
                            expect(err).to.be.equal(null);
                            expect(count).to.be.equal(1);
                            resolve();
                        });
                    }
                }                
            });
            manager.orders.add(req, {
                status: status
            });
        });
    });

    
});