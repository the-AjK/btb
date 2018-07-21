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

    it('002 should fail if user change day and the menu is already present', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment().subtract(1, 'd'),
            updatedAt: moment().subtract(1, 'd'),
            day: moment().add(1, 'd'),
            deadline: moment().add(28, 'h'),
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
        const menu2 = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu2",
            createdAt: moment(),
            updatedAt: moment(),
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
                id: menu2._id //try to edit the menu2 using the date of menu1
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().add(1, 'd'),
                deadline: moment().add(28, 'h'),
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

    it('003 should fail if user try to use a past day', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu",
            createdAt: moment().subtract(1, 'd'),
            updatedAt: moment().subtract(1, 'd'),
            day: moment().add(1, 'd'),
            deadline: moment().add(28, 'h'),
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
                id: menu1._id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().subtract(1, 'd'),
                deadline: moment().subtract(20, 'h'),
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


    it('004 should fail if user try to edit the menu 2h after the deadline', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment(),
            updatedAt: moment(),
            day: moment().subtract(5, 'h'),
            deadline: moment().subtract(3, 'h'),
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
                id: menu1._id
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

    it('004b should allow root user to edit the menu 2h after the deadline', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment(),
            updatedAt: moment(),
            day: moment().subtract(5, 'h'),
            deadline: moment().subtract(3, 'h'),
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
                id: menu1._id
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
                expect(s).to.be.equal(200);
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

    it('005 should fail if user try to edit an old enabled menu', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment().subtract(24, 'h'),
            updatedAt: moment().subtract(24, 'h'),
            day: moment().subtract(24, 'h'),
            deadline: moment().subtract(20, 'h'),
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
                id: menu1._id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().subtract(24, 'h'),
                deadline: moment().subtract(20, 'h'),
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

    it('006 should fail if user try to edit an old disabled menu', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: false,
            label: "testmenu",
            createdAt: moment().subtract(24, 'h'),
            updatedAt: moment().subtract(24, 'h'),
            day: moment().subtract(24, 'h'),
            deadline: moment().subtract(20, 'h'),
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
                id: menu1._id
            },
            body: {
                enabled: true,
                label: "testmenu",
                day: moment().subtract(24, 'h'),
                deadline: moment().subtract(20, 'h'),
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

    it('007 should fail if user try to change date of an enabled menu', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment().subtract(24, 'h'),
            updatedAt: moment().subtract(24, 'h'),
            day: moment().subtract(24, 'h'),
            deadline: moment().subtract(20, 'h'),
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
                id: menu1._id
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

    it('008 should be able to disable the menu', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment(),
            updatedAt: moment(),
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
                id: menu1._id
            },
            body: {
                enabled: false,
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
                expect(s).to.be.equal(200);
                return {
                    send: (newMenu) => {
                        console.log(newMenu);
                        resolve();
                    }
                };
            });
            manager.menus.update(req, {
                status: status
            });
        }));
    });

    it('009 should be able to edit the menu', function () {

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
        const menu1 = testDB.add(DB.Menu, {
            enabled: true,
            label: "testmenu",
            createdAt: moment(),
            updatedAt: moment(),
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
                id: menu1._id
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
                expect(s).to.be.equal(200);
                return {
                    send: (newMenu) => {
                        console.log(newMenu);
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