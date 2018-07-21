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

    it('000 should fail if missing label', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                day: moment(),
                deadline: moment().add(1, 'h'),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('001 should fail if missing day', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                deadline: moment().add(1, 'h'),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('002 should fail if day is in the past', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().subtract(1, 'd'),
                deadline: moment().add(1, 'h'),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('003 should fail if missing deadline', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('004 should fail if day and deadline are not at the same day', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'd'),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('005 should fail if tables list is empty', function () {

        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
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
                tables: []
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('006 should fail if tables list is missing', function () {

        const requser = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
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
                }
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('007 should fail if tables list contain an invalid tableID', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
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
                tables: [t1._id, "fakeTableID"]
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('008 should fail if firstCourse contain an invalid value', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Carbonara", "Pesto"]
                    }, {
                        value: "Spaghetti",
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('009 should fail if firstCourse contain an invalid value', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Carbonara", "Pesto"]
                    }, {
                        value: "",
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('010 should fail if firstCourse contain an invalid value', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
                firstCourse: {
                    items: [{
                        value: "Spaghetti",
                        condiments: ["Pomodoro", "Carbonara", "Pesto"]
                    }, {
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
            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(400);
                resolve();
            });
            manager.menus.add(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('0aa admin user should be able to add a dailyMenu', function () {

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
        const req = {
            user: requser,
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(1, 'h'),
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
            }
        };

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: (m) => {
                        expect(m.enabled).to.be.equal(true);
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });




    it('0bb admin user should be able to add a dailyMenu', function () {

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
            user: requser
        };

        return (new Promise((resolve, reject) => {
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(201);
                return {
                    send: (m) => {
                        expect(m.label)
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });


});