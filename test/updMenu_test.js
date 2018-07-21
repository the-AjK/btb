/**
 * updMenu_test.js
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

describe('updMenu()', function () {

    before(function () {
        // runs before all tests in this block
    });

    after(function () {
        // runs after all tests in this block
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

    it('000 should fail if user try to update a non existing menu', function () {

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
            tables: [t1._id]
        });
        const req = {
            user: requser,
            params: {
                id: "" //wrong id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Pesto"]
                    }, {
                        value: "Insalatona",
                        condiments: []
                    }]
                },
                secondCourse: {
                    items: [
                        "Carne",
                        "Polenta"
                    ],
                    sideDishes: ["Patate", "Cavolfiore"]
                },
                tables: [t1._id]
            }
        };

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(500);
                return {
                    send: (message) => {
                        resolve();
                    }
                };
            });
            manager.menus.update(req, {
                status: status
            });
        }));
    });

    it('001 should fail if user try to update a non existing menu 2', function () {

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
            tables: [t1._id]
        });
        const req = {
            user: requser,
            params: {
                id: "fakeID" //wrong id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Pesto"]
                    }, {
                        value: "Insalatona",
                        condiments: []
                    }]
                },
                secondCourse: {
                    items: [
                        "Carne",
                        "Polenta"
                    ],
                    sideDishes: ["Patate", "Cavolfiore"]
                },
                tables: [t1._id]
            }
        };

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(500);
                return {
                    send: (message) => {
                        resolve();
                    }
                };
            });
            manager.menus.update(req, {
                status: status
            });
        }));
    });

    it('002 should fail if user try to update old menus', function () {

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
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(23, 'h'),
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
                id: dailyMenu._id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Pesto"]
                    }, {
                        value: "Insalatona",
                        condiments: []
                    }]
                },
                secondCourse: {
                    items: [
                        "Carne",
                        "Polenta"
                    ],
                    sideDishes: ["Patate", "Cavolfiore"]
                },
                tables: [t1._id]
            }
        };

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        console.log(message);
                        resolve();
                    }
                };
            });
            manager.menus.update(req, {
                status: status
            });
        }));
    });




});