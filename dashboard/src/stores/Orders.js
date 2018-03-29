/**
 * Orders.js
 * Orders store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import { extendObservable, action } from "mobx";
import API from "./../utils/API";

export default class Orders {
    constructor() {
        this.api = new API();
        extendObservable(this, {
            orders: null,
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
        this.api.orders.add(data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {
                if (cb)
                    return cb(null, res.body)
            } else {
                err = "Unable to add order";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err)
        });
    }

    update(orderID, data, cb) {
        this.api.orders.update(orderID, data, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {

            } else {
                err = "Unable to update order";
                this.setError(err);
                console.error(err);
            }
            if (cb)
                cb(err);
        });
    }

    delete(orderID, cb) {
        this.api.orders.delete(orderID, (err, res) => {
            this.setError();
            if (err) {
                err = err.response ? err.response.text : err;
                console.error(err);
                this.setError(err);
            } else if (res && res.ok) {

            } else {
                err = "Unable to delete order";
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
            this.api.orders.get(id, (err, res) => {
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
            this.api.orders.get(null, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                    this.setField("orders", []);
                } else if (res && res.ok) {
                    this.setField("orders", res.body);
                    if (cb)
                        cb(null, res.body)
                } else {
                    this.setField("orders", []);
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
