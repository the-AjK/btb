/**
 * auth.js
 * Authentication/Authorization manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const passport = require("passport"),
  validator = require('validator'),
  jwt = require("jsonwebtoken"),
  moment = require("moment"),
  crypto = require("crypto"),
  JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt,
  roles = require("./roles"),
  checkUserAccessLevel = roles.checkUserAccessLevel,
  accessLevels = roles.accessLevels,
  userRoles = roles.userRoles,
  DB = require("./db");

//test stuff
if (process.env.NODE_ENV !== "production") {
  require("dotenv").load();
}

const JWTOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: "BTB",
  audience: "dashboard"
};

passport.use(
  new JwtStrategy(JWTOptions, function (jwt_payload, done) {
    DB.User.findOne({
      email: jwt_payload.email,
      enabled: true,
      deleted: false
    }, function (
      err,
      user
    ) {
      if (err) {
        console.error(err);
        return done(err, false);
      } else if (user) {
        return done(null, user);
      } else {
        //user not found or banned
        return done(null, false);
      }
    });
  })
);

exports.init = function init(app) {
  app.use(passport.initialize());
  app.passport = passport;
};

function genRandomString(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

function sha512(password, salt) {
  const hash = crypto.createHmac("sha512", salt);
  hash.update(password.trim());
  return {
    salt: salt,
    hash: hash.digest("hex")
  };
}

function saltHashPassword(password) {
  return sha512(password, genRandomString(16));
}
exports.saltHashPassword = saltHashPassword;

function generateToken(payload) {
  const options = {
    algorithm: "HS256",
    audience: JWTOptions.audience,
    issuer: JWTOptions.issuer,
    expiresIn: 60 * 60 * 2 //2h
  };
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

exports.login = function (req, res) {
  const email = req.body.email,
    password = req.body.password;
  DB.User.findOne({
    email: email,
    deleted: false
  }, function (err, user) {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else if (user) {
      if (!user.enabled) {
        //user found but not enabled
        require("./telegram/bot").broadcastMessage("User not dashboard enabled: " + user.email + "\nip: " + req.clientIp, accessLevels.root, null, true);
        return res.sendStatus(401);
      }
      if (sha512(password, user.salt).hash === user.password) {
        const userData = {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          settings: user.settings
        };
        res.send({
          access_token: generateToken(userData),
          token_type: "bearer"
        });
        //Increment Login Counter + update LastLogin date
        DB.User.findByIdAndUpdate(user._id, {
          loginCounter: user.loginCounter + 1,
          lastIp: req.clientIp,
          lastLogin: new Date()
        }, (err) => {
          if (err) {
            console.error(err);
          } else {
            //console.log("User stats udpated!");
          }
        });
        //notify root users
        if (!roles.checkUser(user.role, userRoles.root)) {
          require("./telegram/bot").broadcastMessage("User login: " + user.email + "\nip: " + req.clientIp, accessLevels.root, null, true);
        }
      } else {
        //user found but wrong password
        require("./telegram/bot").broadcastMessage("User wrong login: " + user.email + "\nip: " + req.clientIp, accessLevels.root, null, true);
        res.sendStatus(401);
      }
    } else {
      //user not found!
      require("./telegram/bot").broadcastMessage("Failed login attempt:\n" + email + "\n" + password + "\nip: " + req.clientIp, accessLevels.root, null, true);
      res.sendStatus(401);
    }
  });
};

function isValidPassword(password) {
  if (password.length < 8)
    return false;
  return true;
}

exports.updateProfile = function (req, res) {
  const data = {
    username: req.body.username,
    email: req.body.email,
    updatedAt: moment().format(),
    settings: req.body.settings
  };
  if (req.body.password) {
    let pass = req.body.password.trim();
    if (!isValidPassword(pass))
      return res.sendStatus(400);
    const newPassword = saltHashPassword(pass);
    data.password = newPassword.hash;
    data.salt = newPassword.salt;
  }
  if (!validator.isEmail(data.email))
    return res.sendStatus(400);
  DB.User.findByIdAndUpdate(req.user._id, data, {
    new: true
  }, (err, user) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    const userData = {
      username: user.username,
      email: user.email,
      role: user.role,
      settings: user.settings
    };
    res.send({
      access_token: generateToken(userData),
      token_type: "bearer"
    });
  });
}

exports.logout = function (req, res) {
  req.logout();
  console.log("logout");
  res.sendStatus(200);
};

function authenticateRequest(req, res, next) {
  passport.authenticate("jwt", {
    session: false
  })(req, res, () => {
    next();
  });
}

exports.checkNotAuth = function (req, res, next) {
  passport.authenticate("jwt", (err, user, info) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else if (user) {
      //already auth
      res.sendStatus(400);
    } else {
      //not auth user
      next();
    }
  })(req, res, next);
};

function checkAccessLevel(accessLevel, req, res, next) {
  if (checkUserAccessLevel(req.user.role, accessLevel)) {
    next();
  } else {
    //access level too low -> forbidden
    res.sendStatus(403);
  }
}

exports.checkAuthUser = function (req, res, next) {
  authenticateRequest(req, res, () => {
    checkAccessLevel(accessLevels.user, req, res, next);
  });
};

exports.checkAuthAdmin = function (req, res, next) {
  authenticateRequest(req, res, () => {
    checkAccessLevel(accessLevels.admin, req, res, next);
  });
};

exports.checkAuthRoot = function (req, res, next) {
  authenticateRequest(req, res, () => {
    checkAccessLevel(accessLevels.root, req, res, next);
  });
};