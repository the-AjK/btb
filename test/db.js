if (process.env.NODE_ENV !== "production") {
    console.log("Loading DEV enviroment...");
    require("dotenv").load({
        path: require("path").resolve(process.cwd(), '.testenv')
    });
}

const DB = require('../src/db');

//connecting to test DB
DB.init();

exports.reset = function (model) {
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

exports.add = function (model, data) {
    let document = new model(data),
        done = false;

    document.save((err, t) => {
        if (err) {
            console.error(err);
            document = null;
        } else {
            document = t;
        }
        done = true;
    });
    while (!done) require('deasync').sleep(100);
    return document;
}