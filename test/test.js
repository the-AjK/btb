if (process.env.NODE_ENV !== "production") {
    console.log("Loading DEV enviroment...");
    require("dotenv").load();
}

const chai = require("chai"),
    expect = chai.expect,
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

class ResponseMock {
    constructor() {
        this.sendStatus = sinon.spy();
        this.status = sinon.spy();
        this.status.send = sinon.spy();
    }
}

describe('addOrder()', function () {


    it('should fail if no daily menu available', function () {

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {

                }
            },
            res = new ResponseMock(),
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb()
        });

        manager.orders.add(req, res);
        expect(getDailyMenu.called).to.be.equal(true);
        expect(res.sendStatus).to.have.been.calledWith(400);
        getDailyMenu.restore();

    });

    it('should fail if no daily menu available because db error', function () {

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {

                }
            },
            res = new ResponseMock(),
            getDailyMenu = sinon.stub(DB, 'getDailyMenu');

        getDailyMenu.callsFake((date, cb) => {
            cb("db error")
        });

        manager.orders.add(req, res);
        expect(getDailyMenu.called).to.be.equal(true);
        expect(res.sendStatus).to.have.been.calledWith(400);
        getDailyMenu.restore();

    });

    it('should fail if the order table is not one of the daily menu tables', function () {

        const req = {
                user: {
                    _id: "fakeID",
                    role: userRoles.user
                },
                body: {
                    table: "12345"
                }
            },
            res = new ResponseMock(),
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

        manager.orders.add(req, res);
        expect(getDailyMenu.called).to.be.equal(true);
        expect(res.sendStatus).to.have.been.calledWith(400);
        getDailyMenu.restore();

    });

});