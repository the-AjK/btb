/**
 * db.js
 * Database manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const mongoose = require("mongoose"),
  moment = require("moment"),
  roles = require("./roles"),
  userRoles = roles.userRoles,
  accessLevels = roles.accessLevels,
  db = mongoose.connection;

exports.init = function (cb) {
  console.log("DB connecting...");
  mongoose.connect(process.env.MONGODB_URI);
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
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
  points: {
    type: Number,
    min: 0,
    default: 0
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
    adminOrdersCompleteMail: {
      type: Boolean,
      default: false
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
  lastLogin: Date,
  lastIp: String,
  dailySlot: {
    type: Date
  },
  backpack: {
    guns: {
      type: Number,
      min: 0,
      default: 0
    },
    shields: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}).index({
  email: 1
}, {
  unique: true,
  partialFilterExpression: {
    'deleted': {
      $eq: false
    }
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
    items: {
      type: [{
        value: {
          type: String,
          required: true
        },
        condiments: {
          type: [String],
          default: []
        }
      }],
      default: []
    }
  },
  secondCourse: {
    items: {
      type: [String],
      default: []
    },
    sideDishes: {
      type: [String],
      default: []
    }
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
}).index({
  day: 1
}, {
  unique: true,
  partialFilterExpression: {
    'deleted': {
      $eq: false
    }
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
  rating: {
    type: Number,
    min: 0,
    max: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}).index({
  owner: 1,
  menu: 1
}, {
  unique: true,
  partialFilterExpression: {
    'deleted': {
      $eq: false
    }
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

const eventOptions = {
  discriminatorKey: 'kind'
};

const GenericEventSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, eventOptions);

const BeerEventSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: Number,
    default: 0
  },
  drunk: {
    type: Boolean,
    default: false
  }
}, eventOptions);

const SlotEventSchema = new mongoose.Schema({
  bet: {
    type: Number
  },
  bombedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  shield: {
    type: Boolean,
    default: false
  },
  robbedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  gun: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    required: true
  }
}, eventOptions);

const TradeEventSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  }
}, eventOptions);

const RatingEventSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: 0,
    max: 10,
    required: true
  }
}, eventOptions);

const LevelEventSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true
  }
}, eventOptions);

//Root user utility presave function
UserSchema.pre('save', function (next) {
  if (process.env.ROOT_TELEGRAM_ID && this.telegram.id === parseInt(process.env.ROOT_TELEGRAM_ID)) {
    //console.log('Saving ***ROOT*** user.')
    this.role = userRoles.root;
    this.enabled = true;
    this.telegram.enabled = true;
  }
  next();
});

const User = mongoose.model("User", UserSchema),
  Menu = mongoose.model("Menu", MenuSchema),
  Order = mongoose.model("Order", OrderSchema),
  Table = mongoose.model("Table", TableSchema),
  GenericEvent = mongoose.model("Event", GenericEventSchema),
  LevelEvent = GenericEvent.discriminator('LevelEvent', LevelEventSchema),
  RatingEvent = GenericEvent.discriminator('RatingEvent', RatingEventSchema),
  BeerEvent = GenericEvent.discriminator('BeerEvent', BeerEventSchema),
  SlotEvent = GenericEvent.discriminator('SlotEvent', SlotEventSchema),
  TradeEvent = GenericEvent.discriminator('TradeEvent', TradeEventSchema);

exports.User = User;
exports.Menu = Menu;
exports.Order = Order;
exports.Table = Table;
exports.GenericEvent = GenericEvent;
exports.LevelEvent = LevelEvent;
exports.RatingEvent = RatingEvent;
exports.BeerEvent = BeerEvent;
exports.SlotEvent = SlotEvent;
exports.TradeEvent = TradeEvent;

function getDailyMenu(day, cb) {
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
exports.getDailyMenu = getDailyMenu;

exports.getDailyOrders = (day, cb) => {
  getDailyMenu(null, (err, menu) => {
    if (err) {
      cb("DB error");
    } else if (!menu) {
      cb("Daily menu not available yet")
    } else {
      Order.find({
        deleted: false,
        menu: menu._id
      }, null, {
        sort: {
          createdAt: 1
        }
      }).populate('owner').populate('menu').populate('table').exec(cb)
    }
  });
}

function sortSideDishesAndJoin(sd) {
  return sd.sort(function (a, b) {
    return a.localeCompare(b);
  }).join(" - ");
}

function _decodeOrders(orders) {
  //lets sort the orders by table name
  orders.sort(function (a, b) {
    return a.table.name.localeCompare(b.table.name)
  });
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
  getDailyMenu(null, (err, menu) => {
    if (err) {
      cb(err || "DB menu error");
    } else if (!menu) {
      cb("Daily menu not available yet");
    } else {
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
    }
  });
}

exports.getTablesStatus = (day, cb) => {
  getDailyMenu(null, (err, menu) => {
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
              if (orders[i].table._id.equals(menu.tables[j]._id)) {
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

exports.getTableParticipants = (day, tableID, cb) => {
  getDailyMenu(null, (err, menu) => {
    if (err) {
      console.error(err);
      cb(err);
    } else if (!menu) {
      cb("Daily menu not available yet")
    } else {
      Order.find({
        deleted: false,
        menu: menu._id,
        table: tableID
      }).populate('owner').exec(cb);
    }
  });
}

exports.getDailyUserOrder = (day, userID, cb) => {
  getDailyMenu(null, (err, menu) => {
    if (!err && menu) {
      Order.findOne({
        deleted: false,
        owner: userID,
        menu: menu._id
      }).populate('menu').populate('table').populate('owner').exec(cb)
    } else if (!menu) {
      cb("Daily menu not available yet");
    } else {
      console.error(err);
      cb(err || "DB error");
    }
  });
}

exports.getDailyOrdersCount = (day, cb) => {
  getDailyMenu(null, (err, menu) => {
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

exports.getUserBeers = (userID, type, callback) => {
  let query = {
    owner: userID
  };
  if (type)
    query.type = type;
  BeerEvent.find(query).exec(callback);
};

function removeDuplicates(arr) {
  let unique_array = Array.from(new Set(arr))
  return unique_array
}

exports.getMenuSuggestions = (cb) => {
  Menu.find({
    deleted: false
  }, (err, menus) => {
    if (err) {
      cb(err);
    } else {
      let fcs = [],
        condiments = [],
        scs = [],
        sideDishes = [];
      for (let i = 0; i < menus.length; i++) {
        const m = menus[i];
        for (let j = 0; j < m.firstCourse.items.length; j++) {
          const fc = m.firstCourse.items[j];
          fcs.push(fc.value);
          condiments = condiments.concat(fc.condiments);
        }
        scs = scs.concat(m.secondCourse.items);
        sideDishes = sideDishes.concat(m.secondCourse.sideDishes);
      }
      cb(null, {
        fc: removeDuplicates(fcs),
        condiments: removeDuplicates(condiments),
        sc: removeDuplicates(scs),
        sideDishes: removeDuplicates(sideDishes),
      });
    }
  });
}

exports.getNotOrderUsers = (day, cb) => {
  const query = {
      "telegram.enabled": true,
      "telegram.banned": false,
      "deleted": false
    },
    select = {
      _id: 1,
      username: 1,
      email: 1,
      telegram: 1
    };
  User.find(query, select, (err, users) => {
    if (err) {
      console.error(err);
      cb(err)
    } else {
      getDailyMenu(day, (err, menu) => {
        if (!err && menu) {
          Order.find({
            deleted: false,
            menu: menu._id
          }).exec((err, orders) => {
            if (err) {
              console.error(err);
              cb(err);
            } else {
              const orderUsersID = orders.map(o => o.owner.toString());
              cb(null, users.filter(u => {
                return orderUsersID.indexOf(u._id.toString()) < 0;
              }));
            }
          });
        } else if (!menu) {
          cb("Daily menu not available yet");
        } else {
          console.error(err);
          cb(err || "DB error");
        }
      });
    }
  });
};

exports.getTopTenUsers = (cb) => {
  let query = {
      "telegram.enabled": true,
      "telegram.banned": false,
      "deleted": false,
      /*"telegram.id": {
        "$ne": process.env.ROOT_TELEGRAM_ID
      }*/
    },
    select = {
      username: 1,
      email: 1,
      telegram: 1,
      points: 1
    },
    options = {
      sort: {
        points: -1
      },
      limit: 10
    };
  User.find(query, select, options, cb);
}