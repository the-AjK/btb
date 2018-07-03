if (process.env.NODE_ENV !== "production") {
    console.log("Loading DEV enviroment...");
    require("dotenv").load({
        path: require("path").resolve(process.cwd(), '.testenv')
    });
}

const chai = require("chai"),
    expect = chai.expect,
    manager = require('../src/manager'),
    moment = require("moment"),
    DB = require('../src/db'),
    testDB = require('./db'),
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

describe('getOrdersMenuDiff()', function () {
    it('should get no diff', function () {

        testDB.reset(DB.Order);
        testDB.reset(DB.Menu);
        testDB.reset(DB.Table);
        testDB.reset(DB.User);
        const t1 = testDB.add(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = testDB.add(DB.Table, {
            name: "table2",
            enabled: true
        });
        const user1 = testDB.add(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const user2 = testDB.add(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const oldMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "oldmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: user1,
            firstCourse: {
                items: [{
                    condiments: ["Amatriciana", "Pesto", "Pomodoro"],
                    value: "Penne"
                }, {
                    condiments: [],
                    value: "Insalatona Venezia"
                }, {
                    condiments: [],
                    value: "Insalatona Bologna"
                }]
            },
            secondCourse: {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            tables: [t1._id, t2._id]
        });
        const newMenu = testDB.add(DB.Menu, {
            enabled: true,
            label: "newmenu",
            day: moment(),
            deadline: moment().add(1, 'h'),
            owner: user2,
            firstCourse: {
                items: [{
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            secondCourse: {
                items: ["Bistecca", "Frittata"],
                sideDishes: ["Patate", "Fagioli"]
            },
            tables: [t1._id, t2._id]
        });
        const order1 = testDB.add(DB.Order, {
            firstCourse: {
                item: "Insalatona Bologna"
            },
            menu: oldMenu._id,
            table: t1._id,
            owner: user1._id
        });
        const order2 = testDB.add(DB.Order, {
            secondCourse: {
                sideDishes: ["Fagioli"],
                item: "Frittata"
            },
            menu: oldMenu._id,
            table: t1._id,
            owner: user1._id
        });
        console.log(order2.toObject())

        const orders = manager.getOrdersMenuDiff(oldMenu.toObject(), newMenu.toObject(), [order1.toObject(), order2.toObject()]);
        expect(orders.length).to.be.equal(2);
        //no diff
        expect(orders[0].length).to.be.equal(0);
        //both orders are not affected
        expect(orders[1].length).to.be.equal(2);
    });

    it('should get no diff removing table', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Fagioli"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //no diff
        expect(orders[0].length).to.be.equal(0);
        //both orders are not affected
        expect(orders[1].length).to.be.equal(2);
    });

    it('should diff order1 deleting table', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 0 shall be affected because its table has been deleted
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(0);
        //order ID 1 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(1);
    });

    it('should diff order0/1 deleting table', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //both order shall be affected because its table has been deleted
        expect(orders[0].length).to.be.equal(2);
        expect(orders[1].length).to.be.equal(0);
    });

    it('should be no diff order changing firstCourse condiment', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //no orders shall be affected
        expect(orders[0].length).to.be.equal(0);
        expect(orders[1].length).to.be.equal(2);
    });

    it('should be diff order changing firstCourse condiment', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 1 shall be affected because pomodoro has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(1);
        //order ID 0 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(0);
    });

    it('should be no diff order changing firstCourse', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //no orders shall be affected because pomodoro has been removed
        expect(orders[0].length).to.be.equal(0);
        expect(orders[1].length).to.be.equal(2);
    });

    it('should be diff order changing firstCourse', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 1 shall be affected because penne has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(1);
        //order ID 0 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(0);
    });

    it('should be diff both order changing firstCourse', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Ragù alla bolognese", "Melanzane, pesto e burrata", "Pomodoro e bufala", "Carbonara con pancetta e rosmarino"],
                    "value": "fusilli integrali"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Carbonara con pancetta e rosmarino", "Ragù alla bolognese", "Melanzane, pesto e burrata", "Pomodoro e bufala"],
                    "value": "Maltagliati freschi all'uovo"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Venezia"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Melanzane, pesto e burrata",
                "item": "fusilli integrali"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //both orders shall be affected because penne and insalata bologna has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[1].length).to.be.equal(1);
    });

    it('should be no diff adding a new firstCourse', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Penne"
                }, {
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "firstCourse": {
                "item": "Insalatona Bologna"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "firstCourse": {
                "condiment": "Pomodoro",
                "item": "Penne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //no orders shall be affected because pomodoro has been removed
        expect(orders[0].length).to.be.equal(0);
        expect(orders[1].length).to.be.equal(2);
    });

    it('should be diff order changing secondCourse', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Bistecca", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Carne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 1 shall be affected because Carne has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(1);
        //order ID 0 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(0);
    });

    it('should be diff order changing secondCourse sidedish', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Zucchine", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Carne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //both orders shall be affected because Patate has been removed
        expect(orders[0].length).to.be.equal(2);
        expect(orders[1].length).to.be.equal(0);
    });

    it('should be diff order changing secondCourse sidedish', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Zucchine", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Fagioli"],
                "item": "Carne"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 0 shall be affected because Patate has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(0);
        //order ID 1 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(1);
    });

    it('should be diff order changing secondCourse sidedish2', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Zucchine", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };

        const or = [{
            "_id": 0,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Fagioli"],
                "item": "Carne"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 0 shall be affected because Patate has been removed
        expect(orders[0].length).to.be.equal(1);
        expect(orders[0][0]._id).to.be.equal(0);
        //order ID 1 shall not be affected
        expect(orders[1].length).to.be.equal(1);
        expect(orders[1][0]._id).to.be.equal(1);
    });

    it('should be diff order changing secondCourse sidedish2 and table', function () {

        const om = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Patate", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7ff", "5ac23c85a5315a62dc448bb0"]
        };
        const m = {
            "firstCourse": {
                "items": [{
                    "condiments": ["Amatriciana", "Pesto", "Pomodoro"],
                    "value": "Spaghetti"
                }, {
                    "condiments": [],
                    "value": "Insalatona Venezia"
                }, {
                    "condiments": [],
                    "value": "Insalatona Bologna"
                }]
            },
            "secondCourse": {
                "items": ["Carne", "Frittata"],
                "sideDishes": ["Zucchine", "Fagioli"]
            },
            "tables": ["5acbf33449a5605c11bdd7f5"]
        };

        const or = [{
            "_id": 0,
            "secondCourse": {
                "sideDishes": ["Patate"],
                "item": "Frittata"
            },
            "table": {
                "_id": "5ac23c85a5315a62dc448bb0",
                "name": "table1"
            },
            "owner": {
                "username": "AlbertoJK",
                "email": "alberto.garbui@athonet.com"
            }
        }, {
            "_id": 1,
            "secondCourse": {
                "sideDishes": ["Fagioli"],
                "item": "Carne"
            },
            "table": {
                "_id": "5acbf33449a5605c11bdd7ff",
                "name": "table2"
            },
            "owner": {
                "username": "AlbertoJK2",
                "email": "alberto.garbui.2@athonet.com"
            }
        }];

        const orders = manager.getOrdersMenuDiff(om, m, or);
        expect(orders.length).to.be.equal(2);
        //order ID 0 shall be affected because Patate has been removed
        expect(orders[0].length).to.be.equal(2);
        expect(orders[1].length).to.be.equal(0);
    });

});