/**
 * getMenu_test.js
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
    should = chai.should(),
    assertArrays = require('chai-arrays'),
    moment = require("moment"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    manager = require('../src/manager'),
    DB = require('../src/db'),
    testDB = require('./db'),
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

chai.use(sinonChai);
chai.use(assertArrays);

describe('getMenu()', function () {

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

    it('000 root user should be able get the menu list', function () {

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
            role: userRoles.root //root user
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: requser,
            deleted: true,
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

            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).to.be.array();
                expect(m).to.be.ofSize(3); //every menu
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('001a admin user should be able get the menu list without the deleted one', function () {

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
            role: userRoles.admin //admin user
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: requser,
            deleted: true,
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

            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).to.be.array();
                expect(m).to.be.ofSize(2); //do not contain deleted menu
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('001b admin user should be able get the specified menu disabled', function () {

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
            role: userRoles.admin //admin user
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: requser,
            deleted: true,
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
                id: menu._id
            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).not.be.array();
                expect(m.label).to.be.equal("testdisabledmenu");
                should.not.exist(m.deleted);
                should.exist(m.owner); 
                should.exist(m.enabled);
                should.exist(m.tables);
                should.exist(m.day);
                should.exist(m.deadline);
                should.exist(m.createdAt);
                should.exist(m.updatedAt);     
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('001c admin user should be able get the specified menu enabled', function () {

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
            role: userRoles.admin //admin user
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: requser,
            deleted: true,
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
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).not.be.array();
                expect(m.label).to.be.equal("testmenu");
                should.not.exist(m.deleted);
                should.exist(m.owner); 
                should.exist(m.enabled);
                should.exist(m.tables);
                should.exist(m.day);
                should.exist(m.deadline);
                should.exist(m.createdAt);
                should.exist(m.updatedAt);     
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('001d admin user should not be able get the specified menu deleted', function () {

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
            role: userRoles.admin //admin user
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: requser,
            deleted: true,
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
                id: deletedMenu._id
            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(404);
                resolve();
            });
            manager.menus.get(req, {
                sendStatus: sendStatus
            });
        }));
    });

    it('002a normal user should be able get the menu list without the deleted/disabled ones', function () {

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
        const admin = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email22@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: admin,
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
            owner: admin,
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: admin,
            deleted: true,
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

            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).to.be.array();
                expect(m).to.be.ofSize(1); //do not contain deleted/disabled menus
                expect(m[0].label).to.be.equal("testmenu")
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('002b normal user should be able get the specified menu enabled', function () {

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
        const admin = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email22@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: admin,
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
            owner: admin,
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: admin,
            deleted: true,
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
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const send = sinon.stub();
            send.callsFake((m) => {
                expect(m).not.be.array();
                expect(m.label).to.be.equal("testmenu");
                should.not.exist(m.deleted);
                should.not.exist(m.owner); 
                should.not.exist(m.enabled);
                should.not.exist(m.tables);
                should.exist(m.day);
                should.exist(m.deadline);
                should.exist(m.createdAt);
                should.exist(m.updatedAt);     
                resolve();
            });
            manager.menus.get(req, {
                send: send
            });
        }));
    });

    it('002c normal user should not be able get the specified menu deleted', function () {

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
        const admin = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email22@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: admin,
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
        const menu = testDB.add(DB.Menu, {
            enabled: false,
            label: "testdisabledmenu",
            day: moment().subtract(1, 'd'),
            deadline: moment().subtract(1, 'd'),
            owner: admin,
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
        const deletedMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "testdeletedmenu",
            day: moment().subtract(2, 'd'),
            deadline: moment().subtract(2, 'd'),
            owner: admin,
            deleted: true,
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
                id: deletedMenu._id
            },
            query: {

            }
        };

        return (new Promise((resolve, reject) => {
            const sendStatus = sinon.stub();
            sendStatus.callsFake((s) => {
                expect(s).to.be.equal(404);
                resolve();
            });
            manager.menus.get(req, {
                sendStatus: sendStatus
            });
        }));
    });


});