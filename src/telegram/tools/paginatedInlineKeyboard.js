/**
 * paginatedInlineKeyboard.js
 * Paginated Inline Keyboard for Telegram Bot
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

class PaginatedInlineKeyboard {

    constructor(data, options) {
        if (!this._dataIsValid(data)) {
            return console.error("Invalid PaginatedInlineKeyboard data");
        }
        if (!this._optionsAreValid(options)) {
            return console.error("Invalid PaginatedInlineKeyboard options");
        }
        this._data = data || [];
        this._page = (options && options.page ? options.page : 0);
        this._columns = (options && options.columns ? options.columns : 2);
        this._pageSize = (options && options.pageSize ? options.pageSize : 4);
        if (data.length < this._pageSize)
            this._pageSize = data.length;
        this._previousCallbackData = 'previous';
        this._nextCallbackData = 'next';
        this._previousButton = {
            text: '<<',
            callback_data: this._previousCallbackData
        };
        this._nextButton = {
            text: '>>',
            callback_data: this._nextCallbackData
        };
    }

    // PRIVATE stuff

    _dataIsValid(data) {
        for (let i = 0; i < data.length; i++) {
            let d = data[i];
            if ((Object.keys(d).length != 2) ||
                (d.text && d.text.trim() == "") ||
                (d.callback_data && d.callback_data.trim() == "")) {
                return false;
            };
        }
        return true;
    }

    _optionsAreValid(options) {
        return !((options.page && options.page < 0) ||
            (options.columns && options.columns <= 0) ||
            (options.pageSize && options.pageSize <= 0) ||
            (options.pageSize < options.columns));
    }

    _getData(page) {
        //returns a deep cloned array
        return JSON.parse(JSON.stringify(this._data.slice(page * this._pageSize, (page + 1) * this._pageSize)));
    }

    _isFirstPage() {
        return this._page == 0;
    }

    _isLastPage() {
        return this._getData(this._page + 1).length == 0;
    }

    // PUBLIC stuff

    previousCallbackData() {
        return this._previousCallbackData;
    }
    nextCallbackData() {
        return this._nextCallbackData;
    }

    page() {
        return this._page;
    }

    render() {
        let inline_keyboard = [],
            data = this._getData(this._page);
        while (data.length) {
            inline_keyboard.push(data.splice(0, this._columns));
        }
        //last row with navigation buttons
        inline_keyboard.push([]);
        if (!(this._isFirstPage() && this._isLastPage())) {
            if (this._isLastPage() || !this._isFirstPage()) {
                inline_keyboard[inline_keyboard.length - 1].push(this._previousButton);
            }
            if (this._isFirstPage() || !this._isLastPage()) {
                inline_keyboard[inline_keyboard.length - 1].push(this._nextButton);
            }
        }
        return inline_keyboard;
    }

    next() {
        if (!this._isLastPage())
            this._page += 1;
    }

    previous() {
        if (!this._isFirstPage())
            this._page -= 1;
    }

}

exports.PaginatedInlineKeyboard = PaginatedInlineKeyboard;