/**
 * telegram.js
 * Telegram Bot manager
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const Telegraf = require("telegraf"),
  Session = require('./session'),
  Scene = require('telegraf/scenes/base'),
  Stage = require('telegraf/stage'),
  rateLimit = require("telegraf-ratelimit"),
  uuidv1 = require('uuid/v1'),
  googleTTS = require('google-tts-api'),
  request = require('request'),
  moment = require("moment"),
  async = require("async"),
  bender = require("./bender"),
  keyboards = require('./keyboards'),
  DB = require("../db"),
  utils = require("../utils"),
  levels = require("../levels"),
  roles = require("../roles"),
  userRoles = roles.userRoles,
  accessLevels = roles.accessLevels,
  Wit = require('node-wit').Wit,
  client = new Wit({
    accessToken: process.env.WIT_TOKEN
  });

moment.locale("en");

// Set limit to 5 message per seconds
const limitConfig = {
  window: 1000,
  limit: 5,
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
  console.error("Ooops", err);
});

//Main bot scene
const mainScene = new Scene('main');
mainScene.enter((ctx) => {
  //console.log("enter main")
  textManager(ctx);
});
/*mainScene.leave((ctx) => {
  console.log("exit main")
});*/

//Utility function to enter a scene with the backTo sceneID
function enterScene(ctx, sceneID, silent) {
  //console.log("enter wrapper " + sceneID)
  ctx.scene.enter(sceneID, {
    backTo: ctx.scene.current.id
  }, silent);
}
exports.enterScene = enterScene;

//Utility function to leave a scene to the backTo sceneID
function leaveScene(ctx, silent) {
  if (this.ctx.scene.state.backTo)
    ctx.scene.enter(ctx.scene.state.backTo, {}, silent);
}
exports.leaveScene = leaveScene;

// Scene manager
const stage = new Stage()
stage.register(mainScene);
stage.register(require('./scenes/trade').trade)
stage.register(require('./scenes/order').scene)
stage.register(require('./scenes/order').firstCourse)
stage.register(require('./scenes/order').secondCourse)
stage.register(require('./scenes/settings').scene)
stage.register(require('./scenes/extra').scene)
stage.register(require('./scenes/register').scene)
stage.register(require('./scenes/orderRating').scene)
stage.register(require('./scenes/slot').scene)
stage.register(require('./scenes/shop').scene)
stage.register(require('./scenes/hp').scene)
stage.register(require('./scenes/nim').scene)

const session = new Session({
  ttl: 24 * 60 * 60000 //24h
});
exports.session = session;

bot.use(session.middleware());
bot.use(stage.middleware());

// Authorization middleware
bot.use((ctx, next) => {

  ctx.session.counter = ctx.session.counter || 0;
  ctx.session.counter++;

  if (ctx.session && ctx.session.user) {
    //there is a user session, lets skip the auth procedure
    return next();
  }

  //Unknow user, let's authenticate the request
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
          return ctx.reply("Hey! my name is *BiteTheBot*!\nI do things.\nType \"register\" to register yourself.", keyboards.register(ctx).opts);
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
      //Sync telegram profile info
      if (dbuser.telegram.username != newUser.username ||
        dbuser.telegram.first_name != newUser.first_name ||
        dbuser.telegram.last_name != newUser.last_name) {
        dbuser.telegram.username = newUser.username;
        dbuser.telegram.first_name = newUser.first_name;
        dbuser.telegram.last_name = newUser.last_name;
        //dbuser.updatedAt = moment().format();
        dbuser.save((err) => {
          if (err) {
            console.error(err);
          } else {
            console.log("Telegram user " + dbuser.email + " (" + newUser.id + ") profile has been updated and syncronized");
          }
        });
      }
      ctx.session.user = dbuser;
      return next();
    });
  }
});

//After auth middleware, enter the main scene
bot.use((ctx, next) => {
  ctx.scene.enter('main');
});

//Utility function to get the markdown user link
function getUserLink(u) {
  return "[" + (u.telegram.first_name + (u.telegram.last_name ? (" " + u.telegram.last_name) : "")) + "](tg://user?id=" + u.telegram.id + ")";
}
exports.getUserLink = getUserLink;

// sequentialReplies wrapper with constant interval
function replies(ctx, messages, opts, callback) {
  const interval = 2500;
  sequentialReplies(ctx, interval, messages, opts, callback);
}

// Sequential replies
function sequentialReplies(ctx, interval, messages, opts, callback) {
  messages = JSON.parse(JSON.stringify(messages));
  const firstMessage = messages.splice(0, 1).toString();
  if (!firstMessage.length)
    return callback();
  const funList = [(cb) => {
    ctx.reply(firstMessage, opts).then((m) => {
      cb(null, m);
    }, (err) => {
      cb(err);
    });
  }];
  for (let i = 0; i < messages.length; i++) {
    funList.push(function (text) {
      return (m, cb) => {
        if (!text.length)
          //skip
          return cb(null, m);
        setTimeout(() => {
          ctx.reply(text, opts).then((m) => {
            cb(null, m);
          }, (err) => {
            cb(err);
          });
        }, interval);
        if (interval >= 1000)
          ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);
      }
    }(messages[i]));
  }
  async.waterfall(funList, (err, result) => {
    if (err) {
      console.error(err);
    }
    if (callback)
      callback(err, result);
  });
}

// Sequential message editing
function animation(ctx, interval, animations, opts, callback) {
  animations = JSON.parse(JSON.stringify(animations));
  const firstAnim = animations.splice(0, 1).toString();
  if (!firstAnim.length)
    return callback();
  const funList = [(cb) => {
    ctx.reply(firstAnim, opts).then((m) => {
      cb(null, m);
    }, (err) => {
      cb(err);
    });
  }];
  for (let i = 0; i < animations.length; i++) {
    funList.push(function (text) {
      return (m, cb) => {
        if (!text.length || text.trim() == m.text.trim())
          //skip
          return cb(null, m);
        setTimeout(() => {
          ctx.telegram.editMessageText(m.chat.id, m.message_id, null, text, opts).then((m) => {
            cb(null, m);
          }, (err) => {
            cb(err);
          });
        }, interval);
      }
    }(animations[i]));
  }
  async.waterfall(funList, (err, result) => {
    if (err) {
      console.error(err);
    }
    if (callback)
      callback(err, result);
  });
}
exports.animation = animation;

// Sequential message editing with typing effect
function typingEffect(ctx, text, callback) {
  let animations = [];
  for (let i = 1; i < text.length + 1; i++) {
    animations.push(text.substring(0, i))
  }
  animation(ctx, 100, animations, null, callback);
}
exports.typingEffect = typingEffect;

function textManager(ctx) {

  if (!ctx.message.text) {
    //media stuff handler
    return mediaHandler(ctx);
  }

  if (parseMention(ctx).length > 0)
    return mentionHandler(ctx);

  ctx.replyWithChatAction(ACTIONS.TEXT_MESSAGE);

  ctx.session.mainCounter = ctx.session.mainCounter || 0;

  if (ctx.message.text.toLowerCase().indexOf("menu") == 0) {
    ctx.session.mainCounter = 0;
    _getDailyMenu((err, text, menu) => {
      ctx.reply(text || err, keyboards.btb(ctx).opts);
    });
  } else if (ctx.message.text == keyboards.btb(ctx).cmd.order) {
    ctx.session.mainCounter = 0;
    enterScene(ctx, 'order');
  } else if (ctx.message.text == keyboards.settings(ctx).cmd.unsubscribe) {
    ctx.session.mainCounter = 0;
    keyboards.settings(ctx)[ctx.message.text]();
  } else if (keyboards.btb(ctx)[ctx.message.text]) {
    keyboards.btb(ctx)[ctx.message.text]();
  } else if (ctx.message.text == keyboards.btb(ctx).cmd.settings) {
    ctx.session.mainCounter = 0;
    enterScene(ctx, 'settings');
  } else if (ctx.message.text == keyboards.btb(ctx).cmd.extra) {
    ctx.session.mainCounter = 0;
    enterScene(ctx, 'extra');
  } else {
    ctx.session.mainCounter++;
    client.message(ctx.message.text).then((response) => {
      //console.log(JSON.stringify(response))
      if (response.entities && response.entities.number && response.entities.number.length >= 0) {
        const number = response.entities.number[0].value;
        console.log("From: " + ctx.session.user.email + " Message: " + ctx.message.text + " [-number-]");
        if (response.entities.intent && response.entities.intent.length >= 0 && response.entities.intent[0].value == 'insertcoins') {
          if (roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
            return levels.addPoints(ctx.session.user._id, number, true, (err) => {
              if (err) {
                console.error(err);
              } else {
                ctx.reply(number + " beercoins added!", keyboards.btb(ctx).opts);
              }
            });
          } else {
            return ctx.reply("401 - Unauthorized", keyboards.btb(ctx).opts);
          }
        } else if (!response.entities.intent || (response.entities.intent && response.entities.intent.length >= 0 && response.entities.intent[0].value != 'toptenuser')) {
          return request('http://numbersapi.com/' + number, {
            json: true
          }, (err, res, body) => {
            if (err) {
              return console.error(err);
            } else if (res && res.statusCode == 200) {
              replies(ctx, ["About number *" + number + "*...", body], keyboards.btb(ctx).opts);
            } else {
              replies(ctx, ["I've got some problems!", "Try again later"], keyboards.btb(ctx).opts);
            }
          });
        }
      }
      if (response.entities && response.entities.intent && response.entities.intent.length >= 0) {
        ctx.session.mainCounter = 0;
        console.log("From: " + ctx.session.user.email + " Message: " + ctx.message.text + " [" + response.entities.intent[0].value + "]");
        decodeWit(ctx, response);
      } else {
        //unrecognized by wit.ai
        console.log("From: " + ctx.session.user.email + " Message: " + ctx.message.text + " [Unknow]");
        defaultAnswer(ctx);
      }
    }, (err) => {
      console.error(err);
      defaultAnswer(ctx);
    });
  }
};
exports.textManager = textManager;

function defaultAnswer(ctx) {
  // answer politely
  let msg = ["Hey *" + ctx.from.first_name + "*, how can I help you?"];

  if (ctx.session.mainCounter > 3) {
    //random answer when the user continue writing 
    msg = bender.getRandomTagQuote(["hi", "fuck", "ass"]);
    //reset session counter to start answer politely again
    ctx.session.mainCounter = 0;
    ctx.replyWithSticker({
      source: require('fs').createReadStream(__dirname + "/img/11.webp")
    }).then(() => {
      replies(ctx, msg, keyboards.btb(ctx).opts);
    });
  } else {
    ctx.replyWithSticker({
      source: require('fs').createReadStream(__dirname + "/img/0" + utils.getRandomInt(1, 10) + ".webp")
    }).then(() => {
      replies(ctx, msg, keyboards.btb(ctx).opts);
    });
  }
}

function decodeWit(ctx, witResponse) {
  let value = witResponse.entities.intent[0].value,
    msg = bender.mind[value];

  if (!msg) {
    //console.log("Mind not found [" + value + "]");
    switch (value) {
      case "menu":
        _getDailyMenu((err, text, menu) => {
          ctx.reply(text || err, keyboards.btb(ctx).opts);
        });
        break;
      case "wiki":
        return ctx.reply(formatWiki(), keyboards.btb(ctx).opts);
      case "activesessions":
        if (!roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          msg = "401 - Unauthorized";
        } else {
          const activeSessions = session.getTopSessions();
          msg = "Active sessions: *" + activeSessions.length + "*\nUsers:";
          for (let i = 0; i < activeSessions.length; i++) {
            const s = activeSessions[i];
            if (s.user) {
              let userLink = getUserLink(s.user) + " (" + s.counter + ")";
              msg += "\n- " + userLink;
            } else {
              msg += "\n - Unregistered user";
            }
          }
        }
        return ctx.reply(msg, keyboards.btb(ctx).opts);
      case "resetsessions":
        if (!roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          msg = "401 - Unauthorized";
        } else {
          session.reset();
          msg = "Sessions reset complete!";
        }
        return ctx.reply(msg, keyboards.btb(ctx).opts);
      case "order":
        enterScene(ctx, 'order');
        break;
      case "areyoudrunk":
        if (require('./beers').botIsDrunk()) {
          msg = ["Yeah!", "a little bit 😅"];
        } else {
          msg = ["Naaa", "I feel super! 😎"];
        }
        break;
      case "toptenuser":
        msg = ["401 - Unauthorized", "This feature is reserved for level >= 1 users"];
        if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          DB.getTopTenUsers((err, topUsers) => {
            if (err) {
              console.error(err);
            } else {
              typingEffect(ctx, "Top ten users:", () => {
                msg = []
                for (let i = 0; i < topUsers.length; i++) {
                  let user = topUsers[i],
                    userLink = getUserLink(user) + " (" + user.points + ")";
                  switch (i) {
                    case 0:
                      msg.push("🥇 " + userLink);
                      break;
                    case 1:
                      msg.push("🥈 " + userLink);
                      break;
                    case 2:
                      msg.push("🥉 " + userLink);
                      break;
                    case 3:
                      msg.push((i + 1) + " - " + userLink);
                      break;
                    default:
                      msg[msg.length - 1] += "\n" + (i + 1) + " - " + userLink;
                  }
                }
                replies(ctx, msg, keyboards.btb(ctx).opts);
              });
            }
          });
          return;
        } else {
          break;
        }
      case "coffee":
        //418 I'M A TEAPOT
        ctx.replyWithChatAction(ACTIONS.LOCATION_DATA);
        console.log("Got a coffee from: " + ctx.session.user.email);
        if (!roles.checkUser(ctx.session.user.role, userRoles.root)) {
          broadcastMessage("Got a coffee from: " + ctx.session.user.email, accessLevels.root, null, true);
        }
        ctx.replyWithSticker({
          source: require('fs').createReadStream(__dirname + "/img/coffee.gif")
        }).then(() => {
          replies(ctx, ["Status code: *418*", "I'm a teapot", "BTB refuses to brew coffee"], keyboards.btb(ctx).opts);
        });
        return;
      case "points":
        msg = ["Well, you got " + ctx.session.user.points + " points in total.", "This means that you are a level " + levels.getLevel(ctx.session.user.points) + " user!"];
        break;
      case "beerscount":
        msg = ["401 - Unauthorized", "This feature is reserved for level >= 1 users"];
        if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          let done = false,
            userBeers = -1;
          DB.getUserBeers(ctx.session.user._id, null, (err, beers) => {
            if (err) {
              console.error(err);
            } else {
              userBeers = beers.length;
            }
            done = true;
          });
          require('deasync').loopWhile(function () {
            return !done;
          });
          msg = ["Let's see if I remember...", "Oh yes", "You gave me " + userBeers + " beers in total."];
        }
        break;
      case "sendnudes":
        msg = ["7777", "33", "66", "3", "66", "88", "3", "33"];
        break;
      case "joke":
        msg = ["401 - Unauthorized", "This feature is reserved for level >= 1 users"];
        if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          request('https://08ad1pao69.execute-api.us-east-1.amazonaws.com/dev/random_joke', {
            json: true
          }, (err, res, body) => {
            if (err) {
              return console.error(err);
            } else if (res && res.statusCode == 200) {
              replies(ctx, [body.setup, body.punchline], keyboards.btb(ctx).opts);
            } else {
              replies(ctx, ["I've got some problems!", "Try again later"], keyboards.btb(ctx).opts);
            }
          });
          return;
        } else {
          break;
        }
      case "today":
        msg = ["401 - Unauthorized", "This feature is reserved for level >= 1 users"];
        if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          const today = moment(),
            day = today.date(),
            month = today.month() + 1;
          request('http://numbersapi.com/' + month + '/' + day + '/date', {
            json: true
          }, (err, res, body) => {
            if (err) {
              return console.error(err);
            } else if (res && res.statusCode == 200) {
              msg = "Today is *" + moment().format("dddd, MMMM Do YYYY") + "*";
              replies(ctx, [msg, "Interesting facts about today:", body], keyboards.btb(ctx).opts);
            } else {
              replies(ctx, ["I've got some problems!", "Try again later"], keyboards.btb(ctx).opts);
            }
          });
          return;
        } else {
          break;
        }
      case "autostop":
        msg = "If I remember...";
        ctx.reply(msg, keyboards.btb(ctx).opts).then(() => {
          const autostop = ["45.586607", "11.623588"]; //LAT LON
          ctx.replyWithLocation(autostop[0], autostop[1], keyboards.btb(ctx).opts).then(() => {
            msg = "*L'Autostop*\naddress: 36050 Bolzano Vicentino VI, Italy\nmobile: +393397067253";
            ctx.reply(msg, keyboards.btb(ctx).opts);
          });
        });
        return;
      case "botlocation":
        msg = ["401 - Unauthorized", "This feature is reserved for level >= 1 users"];
        if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
          msg = "Let me check...";
          ctx.reply(msg, keyboards.btb(ctx).opts).then(() => {
            const irelandServer = ["53.3244431", "-6.3857854"]; //LAT LON
            ctx.replyWithLocation(irelandServer[0], irelandServer[1], keyboards.btb(ctx).opts).then(() => {
              msg = "I'm based in *Europe*\nstate: *Ireland*\ncity: *Dublin*\ndatacenter: *AWS*\nstack: *heroku-16*";
              ctx.reply(msg, keyboards.btb(ctx).opts);
            });
          });
          return;
        } else {
          break;
        }
      case "angry":
        msg = bender.getRandomTagQuote(["hi", "fuck", "ass"]);
        ctx.replyWithSticker({
          source: require('fs').createReadStream(__dirname + "/img/11.webp")
        }).then(() => {
          replies(ctx, msg, keyboards.btb(ctx).opts);
        });
        return;
      default:
        console.warn("Unknow wit.ai intent: " + value);
        msg = ["Ehm", "I don't know"]
    }
  }
  replies(ctx, msg, keyboards.btb(ctx).opts);
}

function parseMention(ctx) {
  if (!ctx.message.text)
    return [];
  //ctx.message.entities = [ { offset: 0, length: 7, type: 'mention' } ]
  if (ctx.message.text.toLowerCase().indexOf('@all ') >= 0) {
    return ['all'];
  }
  let mentions = [];
  for (let idx in ctx.message.entities) {
    const entity = ctx.message.entities[idx];
    if (entity.type === 'mention') {
      mentions.push(ctx.message.text.substring(entity.offset + 1, entity.offset + entity.length));
    }
  }
  return mentions;
}

function mentionHandler(ctx) {
  console.log("From: " + ctx.session.user.email + " Mention: '" + ctx.message.text + "'");
  const mentions = parseMention(ctx);
  for (let idx in mentions) {
    const mention = mentions[idx];
    if (ctx.message.text.replace("@" + mention, "").trim() == "") {
      ctx.reply("You should write something more!\n(Example: '@" + mention + " ciao!')", keyboards.btb(ctx).opts);
      break;
    }
    if (mention.toLowerCase() == 'all') {
      let message = getUserLink(ctx.session.user) + ": " + ctx.message.text;
      broadcastMessage(message, accessLevels.user, null, false, {
        _id: {
          "$ne": ctx.session.user._id
        }
      }, true);
      return ctx.reply("Message broadcasted!", keyboards.btb(ctx).opts);
    }
    DB.getDailyOrders(null, (err, orders) => {
      if (err) {
        ctx.reply("Cannot broadcast a mention message:\n" + err, keyboards.btb(ctx).opts);
      } else {
        let message = getUserLink(ctx.session.user) + ": " + ctx.message.text,
          userMessage = "Broadcast service",
          userHasOrdered = false,
          counter = 0;
        if (mention.indexOf("ables") >= 0) {
          for (let i = 0; i < orders.length; i++) {
            if (!orders[i].owner._id.equals(ctx.session.user._id)) {
              ctx.telegram.sendMessage(orders[i].owner.telegram.id, message, {
                parse_mode: "markdown"
              }).then(() => {
                console.log("Mention tables sent to " + orders[i].owner.telegram.id + "-" + orders[i].owner.telegram.first_name + " message: '" + message.substring(0, 50) + "...'");
              });
              counter += 1;
            } else {
              userHasOrdered = true;
            }
          }
          if (counter == 0) {
            userMessage = "Seems like people are not hungry anymore!"
          }
        } else if (mention.indexOf("able") >= 0) {
          //find user table and broadcast the message
          for (let i = 0; i < orders.length; i++) {
            if (orders[i].owner._id.equals(ctx.session.user._id)) {
              userHasOrdered = true;
              const userTableName = orders[i].table.name;
              for (let j = 0; j < orders.length; j++) {
                if (!orders[j].owner._id.equals(ctx.session.user._id) &&
                  orders[j].table.name == userTableName) {
                  ctx.telegram.sendMessage(orders[j].owner.telegram.id, message, {
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
        }
        if (counter > 0) {
          userMessage = "Message broadcasted to " + counter + " users."
        }
        ctx.reply(userMessage, keyboards.btb(ctx).opts);
      }
    });
  }
}

//Mention handler to broadcast by table
bot.mention(['@tables', '@table', '@Tables', '@Table', '@all', '@All'], (ctx) => {
  mentionHandler(ctx);
});

mainScene.on("text", textManager);

function callbackQueryManager(ctx) {
  if (ctx.session.lastMessage) {
    ctx.deleteMessage(ctx.session.lastMessage.message_id);
    delete ctx.session.lastMessage;
  }
  if (ctx.update.callback_query.data == 'unsubscribe') {
    require('./scenes/settings').unsubscribe(ctx);
  } else if (ctx.update.callback_query.data == "throwhp") {
    require('./scenes/hp').handleHP(ctx);
  } else {
    ctx.answerCbQuery("Hmm, this options is not available anymore!");
  }
}
exports.callbackQueryManager = callbackQueryManager;
mainScene.on("callback_query", callbackQueryManager);

function mediaHandler(ctx) {
  if (ctx.message.audio || ctx.message.voice) {
    if (!roles.checkUser(ctx.session.user.role, userRoles.root)) {
      broadcastMessage("Got voice from: " + ctx.session.user.email, accessLevels.root, null, true);
    }
    if (levels.getLevel(ctx.session.user.points) > 0 || roles.checkUserAccessLevel(ctx.session.user.role, accessLevels.root)) {
      ctx.replyWithChatAction(ACTIONS.RECORD_AUDIO);
      console.log("Sent voice answer to " + ctx.session.user.email);
      sendTTSVoice(ctx, "Hey " + ctx.session.user.telegram.first_name + ", bite my metal shiny ass!");
    }
  } else if (ctx.message.document || ctx.message.video || ctx.message.sticker || ctx.message.photo) {
    ctx.replyWithChatAction(ACTIONS.GENERAL_FILES);
    ctx.replyWithSticker({
      source: require('fs').createReadStream(__dirname + "/img/0" + utils.getRandomInt(1, 10) + ".webp")
    }, keyboards.btb(ctx).opts).then(() => {
      replies(ctx, bender.getRandomTagQuote(["ass"]));
    });
  } else {
    console.log("Unsupported message type from: " + ctx.session.user.email);
    console.log(ctx.message)
    if (!roles.checkUser(ctx.session.user.role, userRoles.root)) {
      broadcastMessage("Unsupported message type from: " + ctx.session.user.email, accessLevels.root, null, true);
    }
  }
}

function sendTTSVoice(ctx, text, options) {
  googleTTS(text, 'en-US', 1.5)
    .then(function (url) {
      ctx.telegram.sendVoice(ctx.chat.id, {
        url: url,
        filename: "BTB voice"
      }, keyboards.btb(ctx).opts);
    }).catch(function (err) {
      console.error(err.stack);
    });
}

bot.on(['document', 'video', 'sticker', 'photo', 'audio', 'voice'], (ctx) => {
  mediaHandler(ctx);
});

function formatWiki() {
  let text = "_BiteTheBot_ - Wiki" +
    "\n\n*Menu*" +
    "\nEach working day you will receive a daily menu notification as soon as an admin user will upload it.\nEnable/disable settings for your daily menu notifications are available in the reminders section under settings menu." +
    "\n\n*Order*" +
    "\nOnce a daily menu is available you can place a order. Follow the instructions to choose your favourite dish until a green check mark will confirm that the operation was successfull.\nAfter that a daily order summary will be available in the order section.\nLevel 1 users can rate their order after 2pm." +
    "\n\n*Beercoins*" +
    "\nBeercoin is the currency used in BiteTheBot.\nmore beers == more beercoins\nmore beercoins == more BTB features\nSend beers to get more beercoins.\nYou can also try to be the first one to place a daily order to get a beercoin as a gift. Keep in mind that you will loose one beercoin if you will be the last who place a daily order." +
    "\n\n*Slot*" +
    "\nBTB Slot let you win more beercoins or destroy/stole beercoins from your friends.\nEach day you will get a free run! Don't forget it." +
    "\nWinnings examples:" +
    "\n - beers: 5 beercoins" +
    "\n - other items: 2 beercoins" +
    "\n - water: -1 beercoin" +
    "\nCombining more items will increase the winnings." +
    "\n\n*Levels*" +
    "\nGaining beercoins will make you level-up.\nHigher levels means more BTB features.\nAvailable levels:";
  let i = 1;
  for (let p in levels.pointsLevels) {
    text += "\n" + i + " - " + p + " beercoins";
    if (i++ > 3)
      break;
  }
  text += "\n...";
  return text;
}

function formatMenu(menu) {
  let text =
    "\n__Daily menu__: *" + moment(menu.day).format("MMMM Do YYYY") + "*";
  if (menu.firstCourse && menu.firstCourse.items && menu.firstCourse.items.length) {
    text += "\n\n__First courses__:";
    menu.firstCourse.items.map((fc) => {
      text = text + "\n\n- *" + fc.value + "*" + (fc.condiments.length > 0 ? ":" : "");
      fc.condiments.map((c) => {
        text = text + "\n  -- *" + c + "*"
      });
    });
  }
  if (menu.secondCourse && menu.secondCourse.items && menu.secondCourse.items.length) {
    text = text + "\n\n__Second courses__:\n"
    menu.secondCourse.items.map((sc) => {
      text = text + "\n - *" + sc + "*"
    });
  }
  if (menu.secondCourse && menu.secondCourse.sideDishes && menu.secondCourse.sideDishes.length) {
    text = text + "\n\n__Side dishes__:\n"
    menu.secondCourse.sideDishes.map((sd) => {
      text = text + "\n - *" + sd + "*"
    });
  }
  if (menu.additionalInfos && menu.additionalInfos != "") {
    text = text + "\n\n__Additional information__:\n*" + menu.additionalInfos + "*"
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

function formatUsersWithoutOrder(users, user) {
  let text = "Users who didn't place an order:\n";
  for (let i = 0; i < users.length; i++) {
    let u = users[i];
    text = text + "\n - " + getUserLink(u);
    if (u._id.equals(user._id)) {
      text = text + " (*You*)";
    }
  }
  return text;
}
exports.formatUsersWithoutOrder = formatUsersWithoutOrder;

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
      text = text + "\n - " + getUserLink(tableUser);
      if (tableUser._id.equals(user._id)) {
        text = text + " (*You*)";
      }
    }
  } else {
    text = text + "\n* - No participants";
  }
  if (moment().isBefore(moment("13:00", "HH:mm")))
    text = text + "\n\nare you hungry? 🤤";
  if (order.rating)
    text += "\n\nYour rating was: *" + order.rating + "* stars! ⭐️";
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
          userOrder = tableOrders[i];
        text = text + "\n - " + getUserLink(tableUser);
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
exports.formatTables = formatTables;

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

function broadcastMessage(message, accessLevel, opts, silent, additionalQuery, noLogs) {
  let _options = opts || {
    parse_mode: "markdown"
  };

  if (silent) {
    _options.disable_notification = true;
  }

  let query = {
    "telegram.enabled": true,
    "telegram.banned": false,
    "deleted": false
  }

  if (additionalQuery) {
    Object.assign(query, additionalQuery);
  }

  let logText,
    _message;

  //console.log("Broadcasting message: '" + message.substring(0, 100) + "...'");

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
          logText = logText + "] message: '" + _message.substring(0, 100) + "...'";
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
        if (!noLogs)
          console.log(logText);
        bot.telegram.sendMessage(user.telegram.id, _message, _options).then(() => {
          if (!noLogs)
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
  if (process.env.NODE_ENV === "production" && process.env.BOT_WEBHOOK) {
    console.log("Bot webhook mode: ON");
    const webHookPath = "/" + uuidv1(),
      webHookURL = process.env.BOT_WEBHOOK + webHookPath;
    expressApp.use(bot.webhookCallback(webHookPath));
    bot.telegram.setWebhook(webHookURL);
    console.log("Bot webhook set to: " + webHookURL);
  } else {
    //DEV polling mode
    console.log("Bot polling mode: ON");
    bot.telegram.deleteWebhook();
    bot.startPolling();
  }
  if (process.env.NODE_ENV === "production") {
    broadcastMessage("BTB has started!", accessLevels.root, null, true);
  }
  //init beers auto drink
  require('./beers').init();
}

exports.bot = bot;