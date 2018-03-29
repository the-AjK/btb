/**
 * Request.js
 * HTTP Requests manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import Superagent from "superagent";

export default class Request {
  constructor(config) {
    this.host = config.host;
    this.ssl = config.ssl || false;
    this.basicAuth = config.basicAuth;
    this.port = config.port || (this.ssl ? 443 : 80);
  }

  http(config, data, cb) {
    let url = config.endpoint;

    if (this.host)
      url =
        "http" +
        (this.ssl ? "s" : "") +
        "://" +
        this.host +
        ":" +
        this.port +
        config.endpoint;

    if (this.basicAuth)
      url +=
        "?user=" + this.basicAuth.user + "&password=" + this.basicAuth.password;

    if (config.pagination)
      url +=
        (this.basicAuth ? "&" : "?") +
        "page=" +
        config.pagination.page +
        "&page_size=" +
        config.pagination.page_size;

    let request = Superagent;

    switch (config.method) {
      case "GET":
        request = request.get(url).set("Accept", "application/json");
        break;
      case "PUT":
        request = request
          .put(url)
          .set("Accept", "application/json")
          .set("Content-Type", "application/json");
        request = request.send(data);
        break;
      case "POST":
        request = request
          .post(url)
          .set("Accept", "application/json")
          .set("Content-Type", "application/json");
        request = request.send(data);
        break;
      case "DELETE":
        request = request.delete(url).set("Accept", "application/json");
        break;
      default:
        throw new Error("Unsupported method");
    }

    const access_token = localStorage.getItem(process.env.REACT_APP_JTW_TOKEN_STORAGE_KEY);

    if (access_token) {
      request.set("Authorization", "Bearer " + access_token);
    }

    request
      .timeout({
        response: 320000, // Wait 5min for the server to start sending,
        deadline: 320000 // but allow 5 minute for the file to finish loading.
      })
      .end(cb);
  }
}