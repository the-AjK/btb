/**
 * utils.js
 * Generic utils functions
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

exports.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}