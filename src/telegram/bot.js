/**
 * telegram.js
 * Telegram Bot manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
  session = require("telegraf/session"),
  Stage = require('telegraf/stage'),
  rateLimit = require("telegraf-ratelimit"),
  googleTTS = require('google-tts-api'),
  moment = require("moment"),
  delay = require("delay"),
  ReadWriteLock = require("rwlock"),
  bender = require("./bender"),
  keyboards = require('./keyboards'),
  DB = require("../db"),
  auth = require("../auth"),
  mail = require("../mail"),
  roles = require("../roles"),
  userRoles = roles.userRoles,
  accessLevels = roles.accessLevels;

moment.locale("en");

// Set limit to 1 message per half seconds
const limitConfig = {
  window: 500,
  limit: 1,
  onLimitExceeded: (ctx, next) => ctx.reply("Hey bro, calm down...")
};

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(rateLimit(limitConfig));

const ACTIONS = {
  TEXT_MESSAGE: "typing",
  UPLOAD_PHOTO: "upload_photo",
  RECORD_VIDEO: "record_video",
  UPLOAD_VIDEO: "upload_video",
  RECORD_AUDIO: "record_audio",
  UPLOAD_AUDIO: "upload_audio",
  GENERAL_FILES: "upload_document",
  LOCATION_DATA: "find_location"
};
exports.ACTIONS = ACTIONS;

bot.catch(err => {
  console.log("Ooops", err);
});

// Scene manager
const stage = new Stage()
stage.register(require('./scenes/order').scene)
stage.register(require('./scenes/order').firstCourse)
stage.register(require('./scenes/order').secondCourse)
stage.register(require('./scenes/settings').scene)
stage.register(require('./scenes/register').scene)

bot.use(session());
bot.use(stage.middleware());

// Authorization middleware
bot.use((ctx, next) => {

  ctx.session.counter = ctx.session.counter || 0;
  ctx.session.counter++;
  ctx.session.user = null;

  if (ctx.session.lastMessage) {
    ctx.deleteMessage(ctx.session.lastMessage.message_id);
    delete ctx.session.lastMessage;
  }

  const newUser = ctx.from;
  if (newUser && !newUser.is_bot) {
    DB.User.findOne({
      "telegram.id": newUser.id,
      "deleted": false
    }, (err, dbuser) => {
      if (err) {
        console.error(err);
        ctx.reply("500 - Internal server error :/");
        return;
      } else if (!dbuser) {
        //console.log("user not found: " + newUser.id);
        if (ctx.message && ctx.message.text && ctx.message.text.toLowerCase().indexOf('register') == 0) {
          if (ctx.session.user) {
            ctx.reply("You are already registered!");
          } else {
            ctx.scene.enter('register');
          }
          return;
        } else if (ctx.message && ctx.message.text && ctx.message.text.toLowerCase().indexOf('/start') == 0) {
          showWelcomeMessage(ctx);
          return;
        } else {
          //for other messages lets discard the request
          ctx.reply(keyboards.register(ctx).text, keyboards.register(ctx).opts);
          return;
        }
      }
      if (dbuser.telegram.banned) {
        console.warn("banned user...");
        return;
      }
      if (!dbuser.telegram.enabled) {
        ctx.reply("The admin should enable your account soon. Please wait.");
        return;
      }
      //Registered and enabled User found!
      ctx.session.user = dbuser;
      return next();
    });
  }
});

function showWelcomeMessage(ctx) {
  const msg = "Hey! my name is *BiteTheBot*!\nI do things.\nType \"register\" to register yourself."
  ctx.reply(msg, keyboards.register(ctx).opts);
}

bot.on("callback_query", ctx => {
  if (ctx.session.lastMessage) {
    ctx.deleteMessage(ctx.session.lastMessage.message_id);
    delete ctx.session.lastMessage;
  }
  if (ctx.update.callback_query.data == 'statusorders') {
    if (ctx.session.user.level == 0 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
      ctx.reply("Admin stuff. Keep out.");
      return;
    } else {
      DB.getDailyOrderStats(null, (err, stats) => {
        if (err) {
          ctx.reply(err);
        } else {
          ctx.reply("*Orders status*:" + formatOrderComplete(stats), {
            parse_mode: "markdown"
          });
        }
      });
    }
  } else if (ctx.update.callback_query.data == 'statustables') {
    if (ctx.session.user.level == 0 && !roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.admin)) {
      ctx.reply("Admin stuff. Keep out.");
      return;
    } else {
      DB.Table.find({
        enabled: true,
        deleted: false
      }).sort({
        'name': 1
      }).exec((err, tables) => {
        if (err) {
          console.error(err);
          ctx.reply("DB error");
        } else {
          ctx.reply(formatTables(tables, ctx.session.user), {
            parse_mode: "markdown"
          });
        }
      });
    }
  } else {
    ctx.answerCbQuery("Hmm, this options is not available anymore!");
  }
});

function replyWithDelay(ctx, interval, messages, opts) {
  delay(interval, messages)
    .then(_messages => {
      if (_messages.length > 0) {
        ctx.reply(_messages.splice(0, 1).toString(), opts)
      }
      if (_messages.length > 0) {
        ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
        replyWithDelay(ctx, interval, _messages, opts);
      }
    });
}

function replyDiscussion(ctx, messages, opts) {
  const interval = 2500;
  if (messages.length > 0) {
    ctx.reply(messages.splice(0, 1).toString(), opts)
  }
  if (messages.length > 0) {
    replyWithDelay(ctx, interval, messages);
  }
}

function textManager(ctx) {
  ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

  ctx.session.mainCounter = ctx.session.mainCounter || 0;

  if (ctx.message.text == 'ACK') {
    //user is coming back from a scene
    return;
  } else if (ctx.message.text.toLowerCase().indexOf("menu") == 0) {
    ctx.session.mainCounter = 0;
    _getDailyMenu((err, text, menu) => {
      ctx.reply(text || err, {
        parse_mode: "markdown"
      });
    });
  } else if (ctx.message.text == keyboards.btb(ctx).cmd.order) {
    ctx.session.mainCounter = 0;
    ctx.scene.enter('order');
  } else if (keyboards.btb(ctx)[ctx.message.text]) {
    keyboards.btb(ctx)[ctx.message.text]();
  } else if (ctx.message.text == keyboards.btb(ctx).cmd.settings) {
    ctx.session.mainCounter = 0;
    ctx.scene.enter('settings');
  } else if (ctx.message.text.indexOf("coffee") >= 0 || ctx.message.text.indexOf("☕️") >= 0) {
    //418 I'M A TEAPOT
    console.log("Got a coffee from: " + ctx.session.user.email);
    ctx.replyWithSticker({
      source: require('fs').createReadStream(__dirname + "/img/coffee.gif")
    }).then(() => {
      replyDiscussion(ctx, ["Status code: 418", "I'm a teapot"], keyboards.btb(ctx).opts);
    });
  } else {
    //Unknow message handler
    ctx.session.mainCounter++;

    console.log("From: " + ctx.session.user.email + " Message: " + ctx.message.text);

    // answer politely
    let msg = ["Hey *" + ctx.from.first_name + "*, how can I help you?"];

    if (ctx.session.mainCounter > 2) {
      //random answer when the user continue writing 
      msg = bender.getRandomTagQuote(["hi", "fuck", "ass"]);
      //reset session counter to start answer politely again
      ctx.session.mainCounter = 0;
      ctx.replyWithSticker({
        source: require('fs').createReadStream(__dirname + "/img/11.webp")
      }).then(() => {
        replyDiscussion(ctx, msg);
      });
    } else {
      ctx.replyWithSticker({
        source: require('fs').createReadStream(__dirname + "/img/0" + getRandomInt(1, 10) + ".webp")
      }).then(() => {
        replyDiscussion(ctx, msg, keyboards.btb(ctx).opts);
      });
    }
  }
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //Il max è escluso e il min è incluso
}

function parseMention(ctx) {
  //ctx.message.entities = [ { offset: 0, length: 7, type: 'mention' } ]
  let mentions = [];
  for (let idx in ctx.message.entities) {
    const entity = ctx.message.entities[idx];
    if (entity.type === 'mention') {
      mentions.push(ctx.message.text.substring(entity.offset + 1, entity.offset + entity.length));
    }
  }
  return mentions;
}

//Mention handler to broadcast by table
bot.mention(['@tables', '@table'], (ctx) => {
  console.log("From: " + ctx.session.user.email + " Mention: " + ctx.message.text);
  const mentions = parseMention(ctx);
  for (let idx in mentions) {
    const mention = mentions[idx];
    DB.getDailyOrders(null, (err, orders) => {
      if (err) {
        ctx.reply(err);
      } else {
        let message = "[" + (ctx.session.user.telegram.first_name || ctx.session.user.email) + "](tg://user?id=" + ctx.session.user.telegram.id + "): " + ctx.message.text,
          userMessage = "Broadcast service",
          userHasOrdered = false,
          counter = 0;
        if (mention == 'table') {
          //find user table and broadcast the message
          for (let i = 0; i < orders.length; i++) {
            if (orders[i].owner._id.equals(ctx.session.user._id)) {
              userHasOrdered = true;
              const userTableName = orders[i].table.name;
              for (let j = 0; j < orders.length; j++) {
                if (!orders[j].owner._id.equals(ctx.session.user._id) &&
                  orders[j].table.name == userTableName) {
                  bot.telegram.sendMessage(orders[j].owner.telegram.id, message, {
                    parse_mode: "markdown"
                  }).then(() => {
                    console.log("Mention table sent to " + orders[j].owner.telegram.id + "-" + orders[j].owner.telegram.first_name + " message: '" + message.substring(0, 50) + "...'");
                  });
                  counter += 1;
                }
              }
              break;
            }
          }
          if (!userHasOrdered) {
            userMessage = "You should place an order and choose your table!"
          } else if (counter == 0) {
            userMessage = "Ehm, you are the only one in your table...\nForever alone? 🐒"
          }
        } else if (mention == 'tables') {
          for (let i = 0; i < orders.length; i++) {
            if (!orders[i].owner._id.equals(ctx.session.user._id)) {
              bot.telegram.sendMessage(orders[i].owner.telegram.id, message, {
                parse_mode: "markdown"
              }).then(() => {
                console.log("Mention tables sent to " + orders[j].owner.telegram.id + "-" + orders[j].owner.telegram.first_name + " message: '" + message.substring(0, 50) + "...'");
              });
              counter += 1;
            } else {
              userHasOrdered = true;
            }
          }
          if (counter == 0) {
            userMessage = "Seems like people are not hungry anymore!"
          }
        }
        if (counter > 0) {
          userMessage = "Message broadcasted to " + counter + " users."
        }
        ctx.reply(userMessage);
      }
    });
  }
})

bot.on("text", textManager);

// Handle unsupported types
bot.on(['document', 'video', 'sticker', 'photo'], (ctx) => {
  //bad answer
  console.log("Unsupported message type from: " + ctx.session.user.email);
  ctx.replyWithSticker({
    source: require('fs').createReadStream(__dirname + "/img/0" + getRandomInt(1, 10) + ".webp")
  }).then(() => {
    replyDiscussion(ctx, bender.getRandomTagQuote(["ass"]));
  });
});

function sendTTSVoice(ctx, text, options) {
  googleTTS(text, 'en-US', 1.5)
    .then(function (url) {
      bot.telegram.sendVoice(ctx.chat.id, {
        url: url,
        filename: "BTB voice"
      });
    }).catch(function (err) {
      console.error(err.stack);
    });
}

bot.on(['audio', 'voice'], (ctx) => {
  ctx.replyWithChatAction(ACTIONS.RECORD_AUDIO);
  sendTTSVoice(ctx, "Hey " + ctx.session.user.telegram.first_name + ", bite my metal shiny ass!");
});

function formatMenu(menu) {
  let text =
    "\n__Daily menu__: *" + moment(menu.day).format("MMMM Do YYYY") + "*" +
    "\n\n__First courses__:";
  menu.firstCourse.items.map((fc) => {
    text = text + "\n\n- *" + fc.value + "*" + (fc.condiments.length > 0 ? ":" : "");
    fc.condiments.map((c) => {
      text = text + "\n  -- *" + c + "*"
    });
  });
  text = text + "\n\n__Second courses__:\n"
  menu.secondCourse.items.map((sc) => {
    text = text + "\n - *" + sc + "*"
  });
  text = text + "\n\n__Side dishes__:\n"
  menu.secondCourse.sideDishes.map((sd) => {
    text = text + "\n - *" + sd + "*"
  });
  if (menu.additionalInfos && menu.additionalInfos != "") {
    text = text + "\n\n__Additional informations__:\n*" + menu.additionalInfos + "*"
  }
  if (moment().isAfter(menu.deadline)) {
    text = text + "\n\nThe deadline was at *" + moment(menu.deadline).format("HH:mm") + "*.\nNo more orders will be accepted.";
  } else {
    text = text + "\n\nHurry up, the deadline is at *" + moment(menu.deadline).format("HH:mm") + "*" +
      "\n\n(🍻 Beers are sold separately 😬)";
  }

  return text;
}
exports.formatMenu = formatMenu;

function formatOrder(order, user) {
  let text =
    "\n__Your daily order__:\n*" + moment(order.menu.day).format("MMMM Do YYYY") + "* at *" +
    moment(order.createdAt).format("HH:mm") + "*";

  if (order.firstCourse && order.firstCourse.item && order.firstCourse.item != "") {
    text = text + "\n\n__First course__:" +
      "\n - *" + order.firstCourse.item + "*" + (order.firstCourse.condiment ? (" - *" + order.firstCourse.condiment + "*") : "");
  } else if (order.secondCourse && order.secondCourse.item && order.secondCourse.item != "") {
    text = text + "\n\n__Second course__:" +
      "\n - *" + order.secondCourse.item + "*";
    for (let i = 0; i < order.secondCourse.sideDishes.length; i++) {
      if (i == 0)
        text = text + "\n\nSide dishes:\n - ";
      if (i > 0)
        text = text + "\n - ";
      text = text + "*" + order.secondCourse.sideDishes[i] + "*";
    }
  }
  text = text + "\n\n__List of people at__ *" + order.table.name + "*:";
  let tableUsers = false;
  DB.getTableParticipants(null, order.table._id, (err, orders) => {
    if (err) {
      console.error(err);
      tableUsers = null;
    } else {
      tableUsers = orders.map(o => o.owner);
    }
  });
  require('deasync').loopWhile(function () {
    return tableUsers === false;
  });
  if (tableUsers && tableUsers.length) {
    for (let i = 0; i < tableUsers.length; i++) {
      let tableUser = tableUsers[i];
      text = text + "\n - [" + (tableUser.telegram.first_name || tableUser.email) + "](tg://user?id=" + tableUser.telegram.id + ")";
      if (tableUser._id.equals(user._id)) {
        text = text + " (*You*)";
      }
    }
  } else {
    text = text + "\n* - No participants";
  }
  text = text + "\n\nare you hungry? 🤤";
  return text;
}
exports.formatOrder = formatOrder;


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatTables(tables, user) {
  let text = "*Tables status:*";

  for (let t = 0; t < tables.length; t++) {
    let table = tables[t];
    if (!table.enabled) {
      continue;
    }
    let tableOrders = false,
      error = "";
    DB.getTableParticipants(null, table._id, (err, orders) => {
      if (err) {
        error = err;
        tableOrders = null;
      } else {
        tableOrders = orders;
      }
    });
    require('deasync').loopWhile(function () {
      return tableOrders === false;
    });
    if (tableOrders === null)
      return error;
    text = text + "\n\n*" + capitalizeFirstLetter(table.name) + "*";
    if (tableOrders && tableOrders.length) {
      text = text + " (" + tableOrders.length + "/" + table.seats + "):";
      for (let i = 0; i < tableOrders.length; i++) {
        let tableUser = tableOrders[i].owner,
          userOrder = tableOrders[i],
          username = (tableUser.telegram.first_name || tableUser.email); //.replace(/[^a-zA-Z ]/g, "");
        text = text + "\n - [" + username + "](tg://user?id=" + tableUser.telegram.id + ")";
        //text = text + "\n - " + username + "";
        if (tableUser._id.equals(user._id)) {
          text = text + " (*You*)";
        }
        //add order detail
        let fc = userOrder.firstCourse,
          sc = userOrder.secondCourse;
        if (fc && fc.item) {
          text = text + " - " + fc.item + " " + (fc.condiment ? (" (_" + fc.condiment + "_)") : "");

        } else if (sc && sc.item) {
          text = text + " - " + sc.item + " ";
          for (let j = 0; j < sc.sideDishes.length; j++) {
            if (j == 0)
              text = text + "(_";
            if (j > 0)
              text = text + ", ";
            text = text + sc.sideDishes[j];
          }
          if (sc.sideDishes.length > 0)
            text = text + "_)";
        }
      }
    } else {
      text = text + ":\n - No participants";
    }
  }
  return text;
}

function formatOrderComplete(stats) {
  let text = "";

  for (let table in stats) {
    text = text + "\n\n*" + capitalizeFirstLetter(table) + "*:";
    if (stats[table].firstCourses) {
      for (let fc in stats[table].firstCourses) {
        const order = stats[table].firstCourses[fc];
        if (order.length) {
          text = text + "\nn°*" + order.length + "*: *" + order[0].item + "*" + (order[0].condiment ? (" (_" + order[0].condiment + "_)") : "");
        }
      }
    }
    if (stats[table].secondCourses) {
      for (let sc in stats[table].secondCourses) {
        const order = stats[table].secondCourses[sc];
        if (order.length) {
          text = text + "\nn°*" + order.length + "*: *" + order[0].item + "* ";
          for (let i = 0; i < order[0].sideDishes.length; i++) {
            if (i == 0)
              text = text + "(_";
            if (i > 0)
              text = text + ", ";
            text = text + order[0].sideDishes[i];
          }
          if (order[0].sideDishes.length > 0)
            text = text + "_)";
        }
      }
    }
  }
  if (text == "") {
    text = "\n\nNo orders received";
  }
  return text;
}
exports.formatOrderComplete = formatOrderComplete;

function _getDailyMenu(cb) {
  DB.getDailyMenu(null, (err, menu) => {
    if (err) {
      console.error(err);
      cb("Error while retrieving the daily menu");
    } else if (!menu) {
      cb("Daily menu not available yet");
    } else {
      cb(null, formatMenu(menu), menu);
    }
  });
}

function broadcastMessage(message, accessLevel, opts, silent) {
  let _options = opts || {
    parse_mode: "markdown"
  };

  if (silent) {
    _options.disable_notification = true;
  }

  const query = {
    "telegram.enabled": true,
    "telegram.banned": false,
    "deleted": false
  }

  let logText,
    _message;

  DB.User.find(query, (err, users) => {
    if (err) {
      console.error(err);
    } else {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (accessLevel && !roles.checkUserAccessLevel(user.role, accessLevel)) {
          continue;
        } else if (accessLevel) {
          logText = "broadcasting to: " + user.telegram.id + "-" + user.telegram.first_name + " [";
          _message = message;
          if (roles.checkUserAccessLevel(accessLevel, roles.accessLevels.root)) {
            _message = "(ROOT) " + _message;
            logText = logText + "ROOT";
          } else if (roles.checkUserAccessLevel(accessLevel, roles.accessLevels.admin)) {
            _message = "(ADMIN) " + _message;
            logText = logText + "ADMIN";
          }
          logText = logText + "] message: '" + _message.substring(0, 50) + "...'";
        }
        if (roles.compareAccessLevel(accessLevel, roles.accessLevels.admin)) {
          // root or admins who set the admin reminder setting off, skip
          if ((roles.checkUser(user.role, roles.userRoles.root) || roles.checkUser(user.role, roles.userRoles.admin)) &&
            user.settings.adminReminders == false) {
            continue;
          }
        }
        // root users who set the root reminders off
        if (roles.compareAccessLevel(accessLevel, roles.accessLevels.root) &&
          roles.checkUser(user.role, roles.userRoles.root) &&
          user.settings.rootReminders == false) {
          continue;
        }
        console.log(logText);
        bot.telegram.sendMessage(user.telegram.id, _message, _options).then(() => {
          console.log("Message sent to: " + user.telegram.id + "-" + user.telegram.first_name);
        });
      }
    }
  });
}
exports.broadcastMessage = broadcastMessage;

exports.broadcastDailyMenu = function () {
  _getDailyMenu((err, text, menu) => {
    if (err) {
      console.error(err);
      broadcastMessage("Unable to broadcast daily menu: " + err, accessLevels.root);
      return;
    }
    broadcastMessage(text);
  });
}

exports.init = function (expressApp) {
  bot.startPolling();
  if (process.env.NODE_ENV === "production") {
    broadcastMessage("BTB has started!", accessLevels.root, null, true);
  }
}

exports.bot = bot;