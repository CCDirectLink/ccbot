// To use type in a running Node REPL `.load repl.js`
const discord = require('discord.js');
let bot = new discord.Client();
bot.login(require('./secrets.json').token);
