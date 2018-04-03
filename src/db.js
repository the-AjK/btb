/**
 * db.js
 * Database manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const mongoose = require("mongoose");
const moment = require("moment");
const roles = require("./roles");
const userRoles = roles.userRoles;
const accessLevels = roles.accessLevels;
const db = mongoose.connection;

exports.init = function(cb) {
  mongoose.connect(process.env.MONGODB_URI);
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function() {
    console.log("DB connected!");
    if (cb) cb();
  });
}

/*
console.log(userRoles)
console.log(accessLevels)
{ public: { bitMask: 1, title: 'public' },
  user: { bitMask: 2, title: 'user' },
  admin: { bitMask: 4, title: 'admin' },
  root: { bitMask: 8, title: 'root' } }
{ public: { bitMask: 15 },
  anon: { bitMask: 1 },
  user: { bitMask: 14 },
  admin: { bitMask: 12 },
  root: { bitMask: 8 } }
*/

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: false,
    trim: true,
    lowercase: true
  },
  telegram: {
    id: {
      type: Number,
      unique: false,
      min: 0
    },
    username: String,
    first_name: String,
    last_name: String,
    language_code: String,
    enabled: {
      type: Boolean,
      default: false
    },
    banned: {
      type: Boolean,
      default: false
    }
  },
  enabled: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  role: {
    bitMask: {
      type: Number,
      min: 0,
      default: userRoles.user.bitMask
    },
    title: {
      type: String,
      default: userRoles.user.title
    }
  },
  loginCounter: {
    type: Number,
    min: 0,
    default: 0
  },
  settings: {
    orderReminder: {
      type: Boolean,
      default: true
    },
    adminReminders: {
      type: Boolean,
      default: true
    },
    rootReminders: {
      type: Boolean,
      default: true
    },
    dailyMenu: {
      type: Boolean,
      default: true
    }
  },
  beerCounter: {
    pint: {
      type: Number,
      min: 0,
      default: 0
    },
    halfPint: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  lastLogin: Date,
  lastIp: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const MenuSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    required: true
  },
  firstCourse: {
    items: [{
      value: String,
      condiments: [String]
    }]
  },
  secondCourse: {
    items: [String],
    sideDishes: [String]
  },
  additionalInfos: String,
  day: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  tables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const OrderSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  menu: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  deleted: {
    type: Boolean,
    default: false
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  firstCourse: {
    item: String,
    condiment: String
  },
  secondCourse: {
    item: String,
    sideDishes: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  seats: {
    type: Number,
    min: 1,
    default: 2
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

//Root user utility presave function
UserSchema.pre('save', function(next) {
  if (process.env.ROOT_TELEGRAM_ID && this.telegram.id === parseInt(process.env.ROOT_TELEGRAM_ID)) {
    console.log('Saving ***ROOT*** user.')
    this.role = userRoles.root;
    this.enabled = true;
    this.telegram.enabled = true;
  }
  next();
});

const User = mongoose.model("User", UserSchema),
  Menu = mongoose.model("Menu", MenuSchema),
  Order = mongoose.model("Order", OrderSchema),
  Table = mongoose.model("Table", TableSchema);

exports.User = User;
exports.Menu = Menu;
exports.Order = Order;
exports.Table = Table;

exports.getDailyMenu = (day, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      }
    };
  Menu.findOne(query).populate('tables').populate({
    path: 'owner',
    select: 'username email _id'
  }).exec(cb);
}

exports.getDailyOrders = (day, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },

    };
  Menu.findOne(query, (err, menu) => {
    if (!err && menu) {
      Order.find({
        deleted: false,
        menu: menu._id
      }).exec(cb)
    } else {
      cb(err || "DB error");
    }
  });
}

function sortSideDishesAndJoin(sd) {
  return sd.sort(function(a, b) {
    return a.localeCompare(b);
  }).join(" - ");
}

function _decodeOrders(orders) {
  let orderStats = {};
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i],
      table = order.table.name;

    if (!orderStats[table]) {
      orderStats[table] = {}
    }

    if (order.firstCourse && order.firstCourse.item && order.firstCourse.item != "") {
      let firstCourse = {
          item: order.firstCourse.item,
          condiment: order.firstCourse.condiment
        },
        key = order.firstCourse.item + " - " + order.firstCourse.condiment;
      if (!orderStats[table].firstCourses) {
        orderStats[table].firstCourses = {};
      }
      if (!orderStats[table].firstCourses[key]) {
        orderStats[table].firstCourses[key] = [];
      }
      orderStats[table].firstCourses[key].push({
        owner: {
          username: order.owner.username,
          email: order.owner.email
        },
        item: firstCourse.item,
        condiment: firstCourse.condiment
      });

    } else if (order.secondCourse && order.secondCourse.item && order.secondCourse.item != "") {
      let secondCourse = {
          item: order.secondCourse.item,
          sideDishes: order.secondCourse.sideDishes
        },
        key = order.secondCourse.item + " - " + sortSideDishesAndJoin(order.secondCourse.sideDishes);
      if (!orderStats[table].secondCourses) {
        orderStats[table].secondCourses = {};
      }
      if (!orderStats[table].secondCourses[key]) {
        orderStats[table].secondCourses[key] = [];
      }
      orderStats[table].secondCourses[key].push({
        owner: {
          username: order.owner.username,
          email: order.owner.email
        },
        item: secondCourse.item,
        sideDishes: secondCourse.sideDishes
      });
    }
  }

  //sorting by number of suborders
  return orderStats;
}

//calculate the daily order statistics
exports.getDailyOrderStats = (day, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },

    };
  Menu.findOne(query, (err, menu) => {
    if (!err && menu) {
      Order.find({
        deleted: false,
        menu: menu._id
      }).populate('table').populate('menu').populate('owner').exec((err, orders) => {
        if (!err && orders) {
          cb(null, _decodeOrders(orders));
        } else {
          cb(err || "DB order error");
        }
      });
    } else {
      cb(err || "DB menu error");
    }
  });
}

exports.getTablesStatus = (day, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },

    };
  Menu.findOne(query).populate('tables').exec((err, menu) => {
    if (!err && menu) {
      Order.find({
        deleted: false,
        menu: menu._id
      }).populate('table').populate('menu').populate('owner').exec((err, orders) => {
        if (!err) {
          let result = {}
          for (let j = 0; j < menu.tables.length; j++) {
            result[menu.tables[j]._id] = {
              name: menu.tables[j].name,
              total: menu.tables[j].seats,
              used: 0
            }
            for (let i = 0; i < orders.length; i++) {
              if (orders[i].table._id.equals(menu.tables[j]._id)){
                result[menu.tables[j]._id].used += 1;
              }                
            }
          }
          cb(null, result);
        } else {
          cb(err || "DB error");
        }
      });
    } else {
      cb(err || "DB error");
    }
  });
}

exports.getDailyUserOrder = (day, userID, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },

    };
  Menu.findOne(query, (err, menu) => {
    if (!err && menu) {
      Order.findOne({
        deleted: false,
        owner: userID,
        menu: menu._id
      }).populate('menu').populate('table').populate('owner').exec(cb)
    } else if (!menu) {
      cb("Daily menu not available yet.");
    } else {
      console.error(err);
      cb(err || "DB error");
    }
  });
}

exports.getDailyOrdersCount = (day, cb) => {
  const today = moment(day || moment()).startOf("day"),
    tomorrow = moment(today).add(1, "days"),
    query = {
      deleted: false,
      enabled: true,
      day: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },

    };
  Menu.findOne(query, (err, menu) => {
    if (!err && menu) {
      Order.find({
        deleted: false,
        menu: menu._id
      }).count().exec(cb)
    } else {
      cb(err || "DB error");
    }
  });
}