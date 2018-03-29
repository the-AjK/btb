/**
 * Tables.js
 * Tables store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import { extendObservable, action } from "mobx";
import API from "./../utils/API";

export default class Tables {
    constructor() {
        this.api = new API();
        extendObservable(this, {
            tables: null,
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
        this.api.tables.add(data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {

            } else {
                err = "Unable to add table";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    update(id, data, cb) {
        this.api.tables.update(id, data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
    
            } else {
                err = "Unable to update table";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    delete(id, cb) {
        this.api.tables.delete(id, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {

            } else {
                err = "Unable to delete table";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    fetch(cb) {
        if (!this.isLoading) {
            this.setLoading(true);
            this.api.tables.get(null, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                    this.setField("tables", []);
                } else if (res && res.ok) {
                    this.setField("tables", res.body);
                    if (cb)
                        cb(null, res.body)
                } else {
                    this.setField("tables", []);
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
