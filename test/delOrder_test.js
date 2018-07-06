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
    roles = require("../src/roles"),
    checkUserAccessLevel = roles.checkUserAccessLevel,
    checkUser = roles.checkUser,
    userRoles = roles.userRoles,
    accessLevels = roles.accessLevels;

chai.use(sinonChai);

describe('delOrder()', function () {

    

});