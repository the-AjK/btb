/**
 * utils.js
 * Generic utils functions
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const si = require('systeminformation');

exports.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}

exports.shuffle = function (a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

exports.bytesToSize = function (bytes, blockSize) {
    if (bytes == undefined)
        return "-";
    if (blockSize && blockSize > 0)
        bytes = bytes * blockSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    if (bytes == 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

exports.systemInfo = async function (cb) {
    try {
        cb({
            cpu: await si.cpu(),
            time: si.time(),
            memory: await si.mem(),
            system: await si.osInfo(),
            versions: await si.versions(),
            fs: await si.fsSize(),
            load: await si.currentLoad(),
            processes: await si.processes(),
            network: {
                interfaces: await si.networkInterfaces(),
                stats: await si.networkStats(),
                connections: await si.networkConnections()
            },
            process: {
                uptime: process.uptime(),
                version: process.version,
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        });
    } catch (e) {
        console.error(e);
    }
}
