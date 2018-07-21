/**
 * addMenu_test.js
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
    testDB = require('./db'),
    telegramBot = require('../src/telegram/bot').bot,
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

chai.use(sinonChai);

let sendMessage;

describe('addMenu()', function () {

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

    it('000a normal user should be able to delete his own order', function () {

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
            tables: [t1._id]
        });
        const req = {
                user: requser,
                params: {
                    id: order._id
                }
            };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(200);
                DB.Order.findById(order._id, (_err, _order) => {
                    expect(_err).to.be.equal(null);
                    expect(_order.deleted).to.be.equal(true);
                    DB.Order.findById(order2._id, (_err, _order) => {
                        expect(_err).to.be.equal(null);
                        expect(_order.deleted).to.be.equal(false);
                        resolve();
                    });
                });
            });
            manager.orders.delete(req, {
                sendStatus: sendStatus
            });
        }));
    });


});