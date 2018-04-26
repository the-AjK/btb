/**
 * API.js
 * API Manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import Request from "./Request";

export default class API {
  constructor() {
    let settings = {};
    settings.host = process.env.NODE_ENV === 'development' ? "localhost" : undefined;
    settings.port = 3001;
    settings.ssl = false;
    this.base_path = "/api";
    this.server = new Request(settings);
  }

  login(email, password, cb) {
    const data = {
      email: email,
      password: password
    };
    this.server.http({
        method: "POST",
        endpoint: this.base_path + "/login"
      },
      data,
      cb
    );
  }

  logout(cb) {
    this.server.http({
        method: "GET",
        endpoint: this.base_path + "/logout"
      },
      null,
      cb
    );
  }

  updateProfile(username, email, password, settings, cb) {
    const data = {
      username: username,
      email: email,
      password: password,
      settings: settings
    };
    this.server.http({
        method: "POST",
        endpoint: this.base_path + "/profile"
      },
      data,
      cb
    );
  }

  broadcastMessage(data, cb) {
    this.server.http({
        method: "POST",
        endpoint: this.base_path + "/broadcast"
      },
      data,
      cb
    );
  }

  //generi resource functions
  _getResources(path, resourceID, cb) {
    this.server.http({
        method: "GET",
        endpoint: this.base_path + "/" + path + (resourceID ? ("/" + resourceID) : "")
      },
      null,
      cb
    );
  }

  _addResource(path, data, cb) {
    this.server.http({
        method: "POST",
        endpoint: this.base_path + "/" + path
      },
      data,
      cb
    );
  }

  _updateResource(path, resourceID, data, cb) {
    this.server.http({
        method: "PUT",
        endpoint: this.base_path + "/" + path + "/" + resourceID
      },
      data,
      cb
    );
  }

  _deleteResource(path, resourceID, cb) {
    this.server.http({
        method: "DELETE",
        endpoint: this.base_path + "/" + path + "/" + resourceID
      },
      null,
      cb
    );
  }

  _generateResourceAPI(resourcePath) {
    return {
      get: (resourceID, cb) => {
        this._getResources(resourcePath, resourceID, cb);
      },
      add: (data, cb) => {
        this._addResource(resourcePath, data, cb);
      },
      update: (resourceID, data, cb) => {
        this._updateResource(resourcePath, resourceID, data, cb);
      },
      delete: (resourceID, cb) => {
        this._deleteResource(resourcePath, resourceID, cb);
      }
    }
  }

  orders = this._generateResourceAPI('orders');
  menus = this._generateResourceAPI('menus');
  users = this._generateResourceAPI('users');
  tables = this._generateResourceAPI('tables');

  stats = {
    get: (cb) => {
      this.server.http({
          method: "GET",
          endpoint: this.base_path + "/stats" 
        },
        null,
        cb
      );
    }
  }

  suggestions = {
    get: (cb) => {
      this.server.http({
          method: "GET",
          endpoint: this.base_path + "/suggestions" 
        },
        null,
        cb
      );
    }
  }

}