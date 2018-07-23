/**
 * backup.js
 * Database backup utility
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

require("dotenv").load();

const moment = require('moment'),
    exec = require('child_process').exec,
    collections = [
        "events",
        "menus",
        "orders",
        "tables",
        "users"
    ];

function parseMongoDBURI() {
    const uri = process.env.MONGODB_URI,
        mongo = {},
        regex = /^(mongodb:(?:\/{2})?)((\w+?):(\w+?)@|:?@?)(.+?):(\d+)\/(\w+?)$/gm;

    let m;
    while ((m = regex.exec(uri)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        mongo.user = m[3]
        mongo.password = m[4]
        mongo.host = m[5]
        mongo.port = m[6]
        mongo.db = m[7]
    }

    return mongo;
}

function getImportCmd(mongo, collection, input) {
    return "mongoimport -h " + mongo.host + ":" + mongo.port + " -d " + mongo.db + " -c " + collection + " -u " + mongo.user + " -p " + mongo.password + " --file " + input;
}

function getExportCmd(mongo, collection, output) {
    return "mongoexport -h " + mongo.host + ":" + mongo.port + " -d " + mongo.db + " -c " + collection + " -u " + mongo.user + " -p " + mongo.password + " -o " + output;
}

function exportCollection(collection) {
    const now = moment(),
        mongo = parseMongoDBURI(),
        filename = __dirname + "/backups/" + mongo.db + "_" + now.format("YYYY_MM_DD_HH_mm") + "/" + collection + ".json",
        cmd = getExportCmd(mongo, collection, filename);
    exec(cmd, (error, stdout, stderr) => {
        console.log(`${stdout}`);
        console.log(`${stderr}`);
        if (error !== null) {
            console.log(`exec error: ${error}`);
        }
    });
}

for (let i in collections) {
    exportCollection(collections[i]);
}