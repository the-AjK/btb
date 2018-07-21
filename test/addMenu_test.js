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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('008 should fail if firstCourse contain a duplicated value', function () {

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
                        value: "spaghetti",
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
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
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
            const status = sinon.stub();
            status.callsFake((s) => {
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('011 should fail if firstCourse contain a duplicated condiment', function () {

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
                        condiments: ["Pomodoro", "pomodoro", "Pesto"]
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
                expect(s).to.be.equal(400);
                return {
                    send: (message) => {
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('012 should fail if secondCourse contain an invalid item', function () {

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
                        condiments: ["Pomodoro", "Pesto"]
                    }, {
                        value: "Insalatona",
                        condiments: []
                    }]
                },
                secondCourse: {
                    items: [
                        "Carne",
                        ""
                    ],
                    sideDishes: ["Patate al forno", "Cavolfiore"]
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
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('013 should fail if secondCourse contain a duplicated item', function () {

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
                        condiments: ["Pomodoro", "Pesto"]
                    }, {
                        value: "Insalatona",
                        condiments: []
                    }]
                },
                secondCourse: {
                    items: [
                        "Carne",
                        "carne"
                    ],
                    sideDishes: ["Patate al forno", "Cavolfiore"]
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
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('014 should fail if secondCourse contain an invalid sidedish', function () {

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
                    sideDishes: ["", "Cavolfiore"]
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
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('015 should fail if secondCourse contain a duplicated sidedish', function () {

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
                    sideDishes: ["CavolfiorE", "Cavolfiore"]
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
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('016 admin user should be able to add a dailyMenu', function () {

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
                        expect(m.owner).to.be.equal(undefined);
                        DB.Menu.find({}, (err, menus) => {
                            expect(err).to.be.equal(null);
                            expect(menus.length).to.be.equal(1);
                            let m = menus[0];
                            expect(m.deleted).to.be.equal(false);
                            expect(m.enabled).to.be.equal(true);
                            expect(String(m.owner)).to.be.equal(String(requser._id));
                            resolve();
                        });
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('017 admin user shouldnt be able to set private fields', function () {

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
        const user2 = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const req = {
            user: requser,
            body: {
                _id: "fakeID", //private fields here
                deleted: true,
                updatedAt: "aaaa",
                createdAt: "bbbb",
                owner: user2._id, // till here
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
                        expect(m._id).to.be.not.equal("fakeID");
                        expect(m.owner).to.be.equal(undefined);
                        expect(m.deleted).to.be.equal(undefined);
                        expect(m.createdAt).to.be.not.equal("bbbb");
                        DB.Menu.find({}, (err, menus) => {
                            expect(err).to.be.equal(null);
                            expect(menus.length).to.be.equal(1);
                            let m = menus[0];
                            expect(m.deleted).to.be.equal(false);
                            expect(m.enabled).to.be.equal(true);
                            expect(String(m._id)).to.be.not.equal("fakeID");
                            expect(String(m.owner)).to.be.equal(String(requser._id));
                            expect(m.createdAt).to.be.not.equal("bbbb");
                            resolve();
                        });
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('018 admin user should be able to add a disabled dailyMenu', function () {

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
                enabled: false,
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
                        expect(m.enabled).to.be.equal(false);
                        expect(m.owner).to.be.equal(undefined);
                        DB.Menu.find({}, (err, menus) => {
                            expect(err).to.be.equal(null);
                            expect(menus.length).to.be.equal(1);
                            let m = menus[0];
                            expect(m.deleted).to.be.equal(false);
                            expect(m.enabled).to.be.equal(false);
                            expect(String(m.owner)).to.be.equal(String(requser._id));
                            resolve();
                        });
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('019 should fail if daily menu is already present', function () {

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
            body: {
                enabled: true,
                label: "testmenu",
                day: moment(),
                deadline: moment().add(2, 'h'),
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
                        resolve();
                    }
                }
            });
            manager.menus.add(req, {
                status: status
            });
        }));
    });

    it('020 should fail if future menu is already present', function () {

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
            day: moment().add(24, 'h'),
            deadline: moment().add(25, 'h'),
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
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().add(25, 'h'),
                deadline: moment().add(27, 'h'),
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