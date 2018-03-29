/**
 * GlobalStore.js
 * Global store for react app
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import API from "./../utils/API";
import Roles from "./../utils/Roles";
import Auth from "./Auth";
import Users from "./Users";
import Menus from "./Menus";
import Orders from "./Orders";
import Tables from "./Tables";
import Stats from "./Stats";

export default class GlobalStore {
  constructor() {
    this.api = new API();
    this.stats = new Stats();
    this.users = new Users();
    this.menus = new Menus();
    this.orders = new Orders();
    this.tables = new Tables();
    this.auth = new Auth();
    this.roles = Roles;
  }
}
