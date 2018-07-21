/**
 * delMenu_test.js
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

describe('addMenu()', function () {

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

    


});