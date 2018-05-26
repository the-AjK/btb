/**
 * session.js
 * Telegram bot session manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

class Session {

    constructor(opts) {
        this.opts = Object.assign({
            property: 'session'
        }, opts);
        this.ttl = opts.ttl;
        this.store = new Map();
    }

    _setSession(key, session) {
        const now = new Date().getTime();
        this.store.set(key, {
            session,
            expires: this.ttl ? now + this.ttl : null
        });
    }

    _getStore(key) {
        return this.store.get(key) || {
            session: {}
        };
    }

    _getSessionKey(ctx) {
        return ctx.from && ctx.from.id;
    }

    getSessions() {
        const now = new Date().getTime();
        let sessions = [];
        this.store.forEach((val, key) => {
            if (key.expires && key.expires < now) {
                //expired session
            } else {
                sessions.push(val.session)
            }
        });
        return sessions;
    }

    deleteSession(userID) {
        return this.store.delete(userID);
    }

    setSessionParam(userID, param, value) {
        const store = this.store.get(userID);
        if (!store) {
            console.warning("setSessionParam user not found. Skipping")
            return;
        }
        store.session[param] = value;
        this._setSession(userID, store.session);
    }

    middleware() {
        return (ctx, next) => {
            const key = this._getSessionKey(ctx);
            if (!key) {
                return next(ctx);
            }
            const now = new Date().getTime();
            let {
                session,
                expires
            } = this._getStore(key);
            if (expires && expires < now) {
                session = {}
            }
            Object.defineProperty(ctx, this.opts.property, {
                get: function () {
                    return session
                },
                set: function (newValue) {
                    session = Object.assign({}, newValue)
                }
            })
            return next(ctx).then(() => this._setSession(key, session));
        }
    }
}

module.exports = Session;