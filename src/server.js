/**
 * server.js
 * NodeJS server init
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const express = require("express"),
    bodyParser = require("body-parser"),
    Raven = require('raven'),
    path = require("path"),
    cors = require("cors"),
    app = express(),
    requestIp = require('request-ip'),
    apiRouter = require("./api"),
    auth = require("./auth");

exports.init = () => {

    console.log("Starting telegram bot...");
    require("./telegram/bot").init(app);

    auth.init(app);
    apiRouter.init(app);

    if (process.env.SENTRY_DSN) {
        Raven.config(process.env.SENTRY_DSN).install();
        app.use(Raven.requestHandler());
    }

    //app.use(require("morgan")("combined"));

    //cors settings
    const whitelist = ['https://bitethebot.herokuapp.com', 'http://localhost']

    app.use((req, res, next) => {
        let allowedOrigin = false,
            origin = req.headers.origin || req.headers.referer || undefined;
        if (origin) {
            for (let i = 0; i < whitelist.length; i++) {
                if (origin.indexOf(whitelist[i]) == 0) {
                    allowedOrigin = true;
                    break;
                }
            }
        }
        if (allowedOrigin) {
            cors()(req, res, next)
        } else {
            next();
        }
    });

    //HTTPS redirect for heroku production
    app.use((req, res, next) => {
        if (process.env.NODE_ENV === 'production') {
            if (req.headers['x-forwarded-proto'] != 'https') {
                return res.redirect('https://' + req.headers.host + req.url);
            } else {
                return next();
            }
        } else {
            return next();
        }
    });

    if (process.env.SENTRY_DSN) {
        //Raven error handler
        app.use(Raven.errorHandler());
    }

    //body parser error catching middleware
    app.use((req, res, next) => {
        bodyParser.json({
            verify: addRawBody
        })(req, res, err => {
            if (err) {
                console.log(err);
                res.sendStatus(400);
                return;
            }
            next();
        });
    });

    function addRawBody(req, res, buf, encoding) {
        req.rawBody = buf.toString();
    }

    app.use(requestIp.mw());

    app.use("/static", express.static(path.join(__dirname, "dashboard/build/static")));
    app.use("/api", apiRouter.api);
    app.use("/", express.static(path.join(__dirname, "dashboard/build")));
    app.get('*', function (req, res) {
        res.sendFile(path.join(__dirname, "dashboard/build/index.html"));
    });

    require("./reminder").init();

    app.listen(process.env.PORT, () => {
        console.log("App listening on port " + process.env.PORT);
    });

}