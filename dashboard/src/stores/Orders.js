/**
 * Orders.js
 * Orders store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import { extendObservable, action } from "mobx";
import API from "./../utils/API";
import queryString from "./../utils/queryString/index.js";

export default class Orders {
    constructor() {
        this.api = new API();
        extendObservable(this, {
            orders: null,
            isLoading: false,
            error: null,
            total: 0,
            pageSize: 5,
            page: 0,
            sorted: null,
            filtered: null,
            get pages() {
                return Math.ceil(this.total / this.pageSize);
            }
        });
    }

    setPagination = action((state) => {
        this.pageSize = state.pageSize;
        this.page = state.page;
        this.sorted = state.sorted;
        this.filtered = state.filtered;
    });

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
            let query = {
                pageSize: this.pageSize,
                page: this.page,
                sorted: JSON.stringify(this.sorted),
                filtered: JSON.stringify(this.filtered)
            };
            query = "?" + queryString.stringify(query);
            this.setLoading(true);
            this.api.orders.get(query, (err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err;
                    console.error(err);
                    this.setError(err);
                    this.setField("orders", []);
                    this.setField("total", 0);
                } else if (res && res.ok) {
                    this.setField("orders", res.body.data);
                    this.setField("total", res.body.total);
                    if (cb)
                        cb(null, res.body.data)
                } else {
                    this.setField("orders", []);
                    this.setField("total", 0);
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
