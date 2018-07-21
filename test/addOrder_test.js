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

describe('addOrder()', function () {

    it('should fail if no daily menu available', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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

        getDailyMenu.callsFake((date, cb) => {
            cb();
        });

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        }));

    });

    it('should fail if no daily menu available because db error', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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

        getDailyMenu.callsFake((date, cb) => {
            cb("db error")
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail if the order table is not one of the daily menu tables', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                    table: t3._id,
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });

    });

    it('should disallow normal user to edit important fields', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                expect(data._id).to.be.not.equal("testforceid");
                expect(data.deleted).to.be.not.equal(true);
                expect(data.rating).to.be.not.equal(10);
                expect(data.updatedAt).to.be.not.equal(null);
                expect(data.owner).to.be.equal(requser._id);
                DB.Order.count((err, count) => {
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

    it('should disallow admin user to edit important fields', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                DB.Order.count((err, count) => {
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

    it('should disallow normal user to force a different owner', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                expect(data.owner).to.be.equal(requser._id);
                expect(data.owner).to.be.not.equal(owner._id);
                DB.Order.count((err, count) => {
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

    it('should allow admin user to force a different owner', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                DB.Order.count((err, count) => {
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

    it('should allow normal user add an order', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                expect(data.secondCourse.item).to.be.equal(undefined);
                expect(data.secondCourse.sideDishes.length).to.be.equal(0);
                DB.Order.count((err, count) => {
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

    it('should allow admin user to add an order', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                expect(data.firstCourse.item).to.be.equal(undefined);
                expect(data.firstCourse.condiment).to.be.equal(undefined);
                expect(data.secondCourse.item).to.be.equal("carne");
                expect(data.secondCourse.sideDishes.length).to.be.equal(1);
                expect(data.secondCourse.sideDishes[0]).to.be.equal("patate al forno");
                DB.Order.count((err, count) => {
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

    it('should fail if no dishes are selected', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail if no table is selected', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with unknow firstCourse item', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        item: "Carne",
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with unknow firstCourse condiment', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        condiment: "Sale e pepe"
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with missing required firstCourse condiment', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        item: "Spaghetti"
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with firstCourse condiment and missing firstCourse item', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with unknow secondCouse item', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        item: "Polpette",
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with unknow secondCouser sideDish', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        sideDishes: ["Patate al forno", "Prezzemolo"]
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with secondCouse sideDish but missing secondCourse item', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail with both dishes selected', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
                        condiment: "Pomodoro"
                    },
                    secondCourse: {
                        item: "Carne",
                        sideDishes: ["Patate al forno"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });
        sendMessage.callsFake(() => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                sendMessage.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });


    it('should fail with no dishes selected', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });
        sendMessage.callsFake(() => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                sendMessage.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail if deadline is reached', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });
        sendMessage.callsFake(() => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                sendMessage.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });


    it('should fail if the user already place a daily order', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });
        sendMessage.callsFake(() => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                sendMessage.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });

    it('should fail if the table is full', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Table);
        testDB.reset(DB.Menu);
        testDB.reset(DB.User);
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
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            sendMessage = sinon.stub(telegramBot.telegram, 'sendMessage');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });
        sendMessage.callsFake(() => {
            return new Promise((resolve, reject) => {
                resolve();
            });
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                getDailyMenu.restore();
                sendMessage.restore();
                DB.Order.count((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(1);
                    resolve();
                });
            });
            manager.orders.add(req, {
                sendStatus: sendStatus
            });
        });
    });


});