/**
 * Auth.js
 * Authentication manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import {
  extendObservable,
  action
} from "mobx";
import JWTDecode from "jwt-decode";
import API from "./../utils/API";
import moment from "moment";

export default class Auth {
  constructor() {
    this.api = new API();
    this.access_token_local_storage_key = process.env.REACT_APP_JTW_TOKEN_STORAGE_KEY;

    //load stored token if available
    let stored_token = localStorage.getItem(this.access_token_local_storage_key);
    if (stored_token) {
      try {
        stored_token = JWTDecode(stored_token);
      } catch (ex) {
        console.error(ex)
      }
    }

    extendObservable(this, {
      jwt: stored_token || null,
      isLoading: false,
      user: JSON.parse(JSON.stringify(stored_token)) || {},
      set token(jwt) {
        this.jwt = JWTDecode(jwt);
        this.user = JSON.parse(JSON.stringify(this.jwt));
        localStorage.setItem(this.access_token_local_storage_key, jwt);
      },
      get token() {
        return this.jwt;
      },
      get isAuth() {
        if (!this.jwt) {
          return false;
        }
        const isExpired = moment().isAfter(moment.unix(this.jwt.exp))
        return this.jwt.iss === "BTB" && !isExpired;
      }
    });
  }

  clearToken = action(value => {
    localStorage.removeItem(this.access_token_local_storage_key);
    this.jwt = null;
  });

  setEmail = action(value => {
    this.user.email = value;
  });

  setUsername = action(value => {
    this.user.username = value;
  });

  setLoading = action(value => {
    this.isLoading = value;
  });

  login(email, password, cb) {
    this.setLoading(true);
    this.api.login(email, password, (err, res) => {
      if (err) {
        if (res && res.status === 401) {
          err = "Email or password is invalid!";
        } else {
          err = err.response ? err.response.text : err;
          console.error(err);
        }
      } else if (res && res.ok) {
        const data = res.body;
        if (data && data.access_token && data.token_type === "bearer") {
          try {
            this.token = data.access_token;
          } catch (ex) {
            err = "Token decode error!";
            console.error(ex);
          }
        } else {
          err = "Missing/Wrong token!";
        }
      } else {
        err = res;
        console.error(err);
      }
      if (cb) {
        if (err) {
          setTimeout(() => {
            this.setLoading(false);
            cb(err);
          }, 2000);
        } else {
          this.setLoading(false);
          cb();
        }
      } else {
        this.setLoading(false);
      }
    });
  }

  logout(cb) {
    this.setLoading(true);
    this.api.logout((err, res) => {
      if (err) {
        err = err.response ? err.response.text : err;
        console.error(err);
      }
      this.clearToken();
      this.setLoading(false);
      if (cb) cb(err);
    });
  }

  updateProfile(username, email, password, cb) {
    this.setLoading(true);
    this.api.updateProfile(username, email, password !== "" ? password : null, (err, res) => {
      if (err) {
        err = err.response ? err.response.text : err;
        console.error(err);
      } else if (res && res.ok) {
        this.setEmail(res.body.email);
        this.setUsername(res.body.username);
        this.clearToken();
      }
      this.setLoading(false);
      if (cb) cb(err);
    });
  }

}