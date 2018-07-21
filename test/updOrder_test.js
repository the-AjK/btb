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

describe('updOrder()', function () {

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
            tables: [t1._id]
        });
        const req = {
                user: requser,
                params: {
                    id: ""
                },
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
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        });

    });

    it('001 should fail if no daily menu is available because db error', function () {

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
                params: {
                    id: ""
                },
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
            cb("db error");
            getDailyMenu.restore();
        });

        return new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(0);
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t3._id, //this table is not an available table for the daily menu
                    firstCourse: {
                        item: "spaghetti",
                        condiment: "pomodoro"
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
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(1);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        });

    });

    it('003 should fail if the order table is full', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 1,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //table2 is full
                    firstCourse: {
                        item: "spaghetti",
                        condiment: "pomodoro"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        }));

    });

    it('004 should allow to change table', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //switch to table2
                    firstCourse: {
                        item: "spaghetti",
                        condiment: "pomodoro"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(2);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('005a should allow normal user to change its own order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //switch to table2
                    firstCourse: {
                        item: "insalatona" //change fc without condiment
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("insalatona");
                expect(data.firstCourse.condiment).to.be.equal(undefined);
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(String(_orders[0].updatedBy)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("insalatona");
                    expect(_orders[0].firstCourse.condiment).to.be.equal(undefined);
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("carbonara");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('005b should allow normal user to change its own order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //switch to table2
                    firstCourse: {
                        item: "spaghetti", //change condiment
                        condiment: "carbonara"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("carbonara");
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(String(_orders[0].updatedBy)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("carbonara");
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("carbonara");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('005c should allow admin user to change its own order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
                    condiments: ["Pomodoro", "Carbonara", "Pesto"]
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pesto"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //switch to table2
                    firstCourse: {
                        item: "spaghetti", //change condiment
                        condiment: "carbonara"
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("carbonara");
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(String(_orders[0].updatedBy)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("carbonara");
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("pesto");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('006 should allow normal user to change its own order with secondCourse', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t1._id,
                    secondCourse: {
                        item: "Melanzane",
                        sideDishes: ["cavolfiore"]
                    },
                    owner: requser._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t1._id));
                expect(data.firstCourse.item).to.be.equal(undefined);
                expect(data.firstCourse.condiment).to.be.equal(undefined);
                expect(data.secondCourse.item).to.be.equal("melanzane");
                expect(data.secondCourse.sideDishes.length).to.be.equal(1);
                expect(data.secondCourse.sideDishes[0]).to.be.equal("cavolfiore");
                DB.Order.countDocuments((err, count) => {
                    expect(err).to.be.equal(null);
                    expect(count).to.be.equal(2);
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('007 should fail if normal user change somebody else order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            seats: 1,
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 1,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
                    condiments: ["Pomodoro", "Carbonara", "Pesto"]
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order2._id
                },
                body: {
                    table: t2._id,
                    firstCourse: {
                        item: "spaghetti", //change condiment
                        condiment: "pesto"
                    },
                    owner: user._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(404);
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("carbonara");
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('007b should fail if normal user change somebody else order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            seats: 1,
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 1,
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
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
                    condiments: ["Pomodoro", "Carbonara", "Pesto"]
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order2._id
                },
                body: {
                    table: t2._id,
                    secondCourse: {
                        item: "Melanzane", //change fc to sc
                        condiment: "Patate al forno"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(404);
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("carbonara");
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('008 should allow admin user to change somebody else order', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
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
            role: userRoles.admin
        });
        const user = testDB.add(DB.User, {
            username: "user12",
            password: "password",
            salt: "salt",
            email: "emai2l@a.com",
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });
        const order2 = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "carbonara"
            },
            menu: dailyMenu._id,
            table: t2._id,
            owner: user._id
        });

        const req = {
                user: requser,
                params: {
                    id: order2._id
                },
                body: {
                    table: t2._id,
                    firstCourse: {
                        item: "spaghetti", //change condiment
                        condiment: "pomodoro"
                    },
                    owner: user._id
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order2._id));
                expect(String(data.owner)).to.be.equal(String(user._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(2);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    expect(String(_orders[1].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[1].owner)).to.be.equal(String(user._id));
                    expect(String(_orders[1].updatedBy)).to.be.equal(String(requser._id));
                    expect(_orders[1].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[1].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('009 should avoid normal user to edit private fields', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
            enabled: true
        })
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id,
                    firstCourse: {
                        item: "spaghetti",
                        condiment: "pomodoro"
                    },
                    //private fields
                    _id: "fakeID",
                    deleted: true,
                    rating: 10,
                    createdAt: null,
                    menu: "fakeMenuID",
                    owner: "fakeOwnerID",
                    createdBy: "fakeUserID"
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(1);
                    expect(String(_orders[0]._id)).to.be.not.equal("fakeID");
                    expect(String(_orders[0].deleted)).to.be.not.equal(true);
                    expect(String(_orders[0].rating)).to.be.not.equal(10);
                    expect(String(_orders[0].createdAt)).to.be.not.equal(null);
                    expect(String(_orders[0].menu)).to.be.not.equal("fakeMenuID");
                    expect(String(_orders[0].owner)).to.be.not.equal("fakeOwnerID");
                    expect(String(_orders[0].createdBy)).to.be.not.equal("fakeUserID");
                    expect(String(_orders[0].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('010 should avoid admin user to edit private fields', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 2,
            enabled: true
        })
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id,
                    firstCourse: {
                        item: "spaghetti",
                        condiment: "pomodoro"
                    },
                    //private fields
                    _id: "fakeID",
                    deleted: true,
                    rating: 10,
                    createdAt: null,
                    menu: "fakeMenuID",
                    owner: "fakeOwnerID",
                    createdBy: "fakeUserID"
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((data) => {
                expect(String(data._id)).to.be.equal(String(order._id));
                expect(String(data.owner)).to.be.equal(String(requser._id));
                expect(String(data.updatedBy)).to.be.equal(String(requser._id));
                expect(String(data.table)).to.be.equal(String(t2._id));
                expect(data.firstCourse.item).to.be.equal("spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("pomodoro");
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(1);
                    expect(String(_orders[0]._id)).to.be.not.equal("fakeID");
                    expect(String(_orders[0].deleted)).to.be.not.equal(true);
                    expect(String(_orders[0].rating)).to.be.not.equal(10);
                    expect(String(_orders[0].createdAt)).to.be.not.equal(null);
                    expect(String(_orders[0].menu)).to.be.not.equal("fakeMenuID");
                    expect(String(_orders[0].owner)).to.be.not.equal("fakeOwnerID");
                    expect(String(_orders[0].createdBy)).to.be.not.equal("fakeUserID");
                    expect(String(_orders[0].table)).to.be.equal(String(t2._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });

            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(200);
                return {
                    send: send
                }
            });

            manager.orders.update(req, {
                status: status
            });
        }));
    });

    it('011 should fail if deadline is reached', function () {

        const t1 = testDB.add(DB.Table, {
            name: "table1",
            seats: 1,
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            seats: 1,
            enabled: true
        })
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
            deadline: moment().subtract(1, 'h'), //deadline in the past
            owner: requser,
            firstCourse: {
                items: [{
                    value: "Spaghetti",
                    condiments: ["Pomodoro", "Carbonara", "Pesto"]
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
        const order = testDB.add(DB.Order, {
            firstCourse: {
                item: "spaghetti",
                condiment: "pomodoro"
            },
            menu: dailyMenu._id,
            table: t1._id,
            owner: requser._id
        });

        const req = {
                user: requser,
                params: {
                    id: order._id
                },
                body: {
                    table: t2._id, //change table
                    firstCourse: {
                        item: "spaghetti", //change condiment
                        condiment: "pesto"
                    }
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb(null, dailyMenu);
            getDailyMenu.restore();
        });

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                DB.Order.find({}, (_err, _orders) => {
                    expect(_err).to.be.equal(null);
                    expect(_orders.length).to.be.equal(1);
                    expect(String(_orders[0].table)).to.be.equal(String(t1._id));
                    expect(String(_orders[0].owner)).to.be.equal(String(requser._id));
                    expect(_orders[0].firstCourse.item).to.be.equal("spaghetti");
                    expect(_orders[0].firstCourse.condiment).to.be.equal("pomodoro");
                    resolve();
                });
            });
            manager.orders.update(req, {
                sendStatus: sendStatus
            });
        }));
    });


});