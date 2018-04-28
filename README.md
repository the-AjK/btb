<p align="center"><img src="logo.png" align="center" /></p>

# BiteTheBot
Copyright © 2018, [Alberto Garbui (aka JK)](mailto:alberto.garbui@gmail.com)

Find me on:
[![alt text][1.1]][1]
[![alt text][2.1]][2]
[![alt text][6.1]][6]

[1.1]: http://i.imgur.com/tXSoThF.png (twitter)
[2.1]: http://i.imgur.com/P3YfQoD.png (facebook)
[6.1]: http://i.imgur.com/0o48UoR.png (github)

[1]: https://twitter.com/albertoajk
[2]: https://www.facebook.com/ajk.alberto
[6]: https://github.com/the-AjK

> BiteTheBot (aka BTB) is an innovative tool that will revolutionize your way of ordering lunch.

## Main features

* *Mobile ready*: Telegram bot user experience with a fully mobile responsive web application for admins users.
* *Coolest bot ever*: based on Futurama© Bender© robot. Beers are always accepted!
* *Easy to use*: each user can easily register itself searching the the bot name "*BiteTheBot*" in the Telegram search bar and following the bot instructions. Once enabled, the user will be able to deeply interact with the bot.
* *Passwordless experience*: each user can use BTB with Telegram. Enabled users can order food and indicate other preferences as: table, take away ecc.
* *Realtime notifications and reminders*: each user can receive notifications regarding the new daily menu and the daily order reminder based on personal settings.
* *Admin dashboard*: admin users can manage in detail menus (tables, final time ecc.), orders and users with a powerful fully mobile responsive webapp.

## Whistlist/TODO

* Deep user editing
* Tables selection on menu create/update
* Menu suggestions on menu create/update
* Cool statistics/graphs
* Dashboard tables pagination
* Basic user dashboard section to place orders through web interface
* ...and more...

## Getting Started with BTB

### Requirements

* [NodeJS](https://nodejs.org) >= 8.11.0
* [Yarn](https://yarnpkg.com) >= 1.5.1
* A valid [Telegram bot token](https://telegram.org/blog/bot-revolution)
* [Mongo DB database](https://www.mongodb.com)

### Enviroment variables

The following enviroments variable are required to run BTB, you can save them in a .env file in the root dir:

* NODE_ENV: production/development flag
* BOT_WEBHOOK: telegram bot webhook URL for production enviroment
* BOT_TOKEN: telegram bot token
* PORT: NodeJS binding port
* MONGODB_URI: MongoDB connection URI
* JWT_SECRET: JWT secret
* MAIL_SERVICE: mail service (Gmail)
* MAIL_USERNAME: email account username
* MAIL_PASSWORD: email account password
* ROOT_TELEGRAM_ID: Telegram ID of the choosen one ;D 

Example:

``` env
NODE_ENV=production
BOT_TOKEN=123456789:nhnms9u7mjg58bs1ong78bjrr5
PORT=3001
MONGODB_URI=mongodb://user:password@database:port/db_name
JWT_SECRET=supersecretjwt!
MAIL_SERVICE=Gmail
MAIL_USERNAME=username@gmail.com
MAIL_PASSWORD=password
ROOT_TELEGRAM_ID=123456789
```

### Build the dashboard GUI

Run *yarn install* to install the dashboard dependencies and *yarn run build* to create an optimized production build:

``` bash
cd btb/dashboard
yarn install
yarn run build
```

### Install server dependencies

Run *yarn install* to install the server dependencies in the root folder:

``` bash
cd btb/
yarn install
```

### Run

To run BTB, run:

``` bash
node index.js
```

## License

BTB - BiteTheBot
(BSD-3 license)

Copyright © 2018 Alberto Garbui <alberto.garbui@gmail.com>

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, 
are permitted provided that the following conditions are met:

-Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
-Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
-Neither the name of BTB - BiteTheBot nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.