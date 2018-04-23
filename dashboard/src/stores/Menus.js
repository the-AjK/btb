/**
 * Menus.js
 * Menus store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import {
    extendObservable,
    action
} from "mobx";
import API from "./../utils/API";

export default class Menus {
    constructor() {
        this.api = new API();
        extendObservable(this, {
            menus: null,
            suggestions: {
                fc: [],
                condiments: [],
                sc: [],
                sideDishes: []
            },
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

    getSuggestions(cb) {
        this.api.suggestions.get((err, res) => {
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                this.suggestions = res.body;
            } else {
                err = "Data not available!";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err, this.suggestions);
        });
    }

    add(data, cb) {
        this.api.menus.add(data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                if (cb)
                    return cb(null, res.body)
            } else {
                err = "Unable to add menu";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err)
        });
    }

    update(menuID, data, cb) {
        this.api.menus.update(menuID, data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                //this.fetch();
            } else {
                err = "Unable to add menu";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err)
        });
    }

    delete(menuID, cb) {
        this.api.menus.delete(menuID, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                //delete success
            } else {
                err = "Unable to delete menu";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err)
        });
    }

    get(id, cb) {
        if (!this.isLoading) {
            this.setLoading(true);
            this.api.menus.get(id, (err, res) => {
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
            this.api.menus.get(null, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                    this.setField("menus", []);
                } else if (res && res.ok) {
                    this.setField("menus", res.body);
                } else {
                    this.setField("menus", []);
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