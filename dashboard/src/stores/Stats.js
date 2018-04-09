/**
 * Stats.js
 * Stats store
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import { extendObservable, action } from "mobx";
import API from "./../utils/API";

export default class Stats {
    constructor() {
        this.api = new API();
        extendObservable(this, {
            autorefresh: false,
            users: 0,
            suggestions: {
                fc: [],
                condiments: [],
                sc: [],
                sideDishes: []
            },
            dailyOrders: 0,
            usersPending: 0,
            orders: 0,
            ordersStats: {},
            menus: 0,
            dailyMenu: {},
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

    setAutoRefresh = action((value) => {
        if (value) {
            this.autorefreshInterval = setInterval(() => this.fetch(), 8000);
        } else {
            clearInterval(this.autorefreshInterval);
        }
        this.autorefresh = value;
    });

    fetch(cb) {
        if (!this.isLoading) {
            this.setLoading(true);
            this.api.stats.get((err, res) => {
                this.setError();
                if (err) {
                    err = err.response ? err.response.text : err
                    console.error(err);
                    this.setError(err);
                    this.setField("users", -1);
                    this.setField("dailyOrders", -1);
                    this.setField("ordersStats", {});
                    this.setField("orders", -1);
                    this.setField("menus", -1);
                    this.setField("usersPending", -1);
                    this.setField("dailyMenu", {});
                    this.setField("suggestions", {
                        fc: [],
                        condiments: [],
                        sc: [],
                        sideDishes: []
                    });
                } else if (res && res.ok) {
                    this.setField("users", res.body.users);
                    this.setField("dailyOrders", res.body.dailyOrders);
                    this.setField("ordersStats", res.body.ordersStats);
                    this.setField("orders", res.body.orders);
                    this.setField("menus", res.body.menus);
                    this.setField("usersPending", res.body.usersPending);
                    this.setField("dailyMenu", res.body.dailyMenu);
                    this.setField("suggestions", res.body.suggestions);
                } else {
                    this.setField("users", -1);
                    this.setField("dailyOrders", -1);
                    this.setField("orders", -1);
                    this.setField("menus", -1);
                    this.setField("usersPending", -1);
                    this.setField("dailyMenu", {});
                    this.setField("ordersStats", {});
                    this.setField("suggestions", {
                        fc: [],
                        condiments: [],
                        sc: [],
                        sideDishes: []
                    });
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
