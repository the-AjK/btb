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
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

chai.use(sinonChai);

//connecting to test DB
DB.init();

describe('getOrdersMenuDiff()', function () {
    it('should get no diff', function () {

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

function DBreset(model) {
    let done = false;
    model.deleteMany((err) => {
        if (err) {
            console.error(err);
        }
        done = true;
    });
    while (!done) {
        require('deasync').sleep(100);
    }
}

function DBadd(model, data) {
    let result, done = false;
    (new model(data)).save((err, t) => {
        if (err) {
            console.error(err);
        }
        result = t;
        done = true;
    });
    while (!done) require('deasync').sleep(100);
    return result;
}

describe('addOrder()', function () {


    it('should fail if no daily menu available', function () {

        DBreset(DB.Order);
        DBreset(DB.Table);

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {

                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb();
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

    it('should fail if no daily menu available because db error', function () {

        DBreset(DB.Order);
        DBreset(DB.Table);

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {

                }
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

        DBreset(DB.Order);
        DBreset(DB.Table);

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {
                    table: "12345"
                }
            },
            getDailyMenu = sinon.stub(DB, 'getDailyMenu'),
            dailyMenu = {
                _id: "menuID",
                tables: [{
                    _id: "0000"
                }, {
                    _id: "1111"
                }, {
                    _id: "2222"
                }]
            };

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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = DBadd(DB.Menu, {
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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const dailyMenu = DBadd(DB.Menu, {
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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const owner = DBadd(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = DBadd(DB.Menu, {
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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.admin
        });
        const owner = DBadd(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = DBadd(DB.Menu, {
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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = DBadd(DB.Menu, {
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
                expect(data.firstCourse.item).to.be.equal("Spaghetti");
                expect(data.firstCourse.condiment).to.be.equal("Pomodoro");
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

        DBreset(DB.Order);
        DBreset(DB.Table);
        DBreset(DB.Menu);
        DBreset(DB.User);
        const t1 = DBadd(DB.Table, {
            name: "table1",
            enabled: true
        });
        const t2 = DBadd(DB.Table, {
            name: "table2",
            enabled: true
        });
        const requser = DBadd(DB.User, {
            username: "user1",
            password: "password",
            salt: "salt",
            email: "email@a.com",
            enabled: true,
            role: userRoles.user
        });
        const owner = DBadd(DB.User, {
            username: "user2",
            password: "password",
            salt: "salt",
            email: "email2@a.com",
            enabled: true,
            role: userRoles.user
        });
        const dailyMenu = DBadd(DB.Menu, {
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
                expect(data.secondCourse.item).to.be.equal("Carne");
                expect(data.secondCourse.sideDishes.length).to.be.equal(1);
                expect(data.secondCourse.sideDishes[0]).to.be.equal("Patate al forno");
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


















});