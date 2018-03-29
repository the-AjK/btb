/**
 * Users.js
 * Users store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import { extendObservable, action } from "mobx";
import API from "./../utils/API";

export default class Users {
    constructor() {
        this.api = new API();
        extendObservable(this, { 
            users: null, 
            isLoading: false, 
            error: null
        });
    }

    setField = action((field, value) => {
        this[field] = value;
    });

    setLoading = value => {
        this.setField('isLoading', value);
    }

    setError = value => {
        this.setField('error', value);
    }

    add(data, cb) {
        this.api.users.add(data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                if (cb)
                    return cb(null, res.body)
            } else {
                err = "Unable to add user";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err)
        });
    }

    update(userID, data, cb) {
        this.api.users.update(userID, data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                //update success
            } else {
                err = "Unable to update user";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    delete(userID, cb) {
        this.api.users.delete(userID, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                
            } else {
                err = "Unable to delete user";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    get(id, cb) {
        if (!this.isLoading) {
            this.setLoading(true);
            this.api.users.get(id, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                } else if (res && res.ok) {
                    this.setLoading(false);
                    if (cb) 
                        return cb(null, res.body);
                } else {
                    err = "Data not available!";
                    this.setError(err);
                    console.error(err);
                }
                this.setLoading(false);
                if (cb)
                    cb(err)
            });
        }
    }

    fetch(cb) {
        if (!this.isLoading) {
            this.setLoading(true);
            this.api.users.get(null, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                    this.setField("users", []);
                } else if (res && res.ok) {
                    this.setField("users", res.body);
                } else {
                    this.setField("users", []);
                    err = "Data not available!";
                    this.setError(err);
                    console.error(err);
                }
                this.setLoading(false);
                if (cb)
                    cb(err)
            });
        }
    }
}
