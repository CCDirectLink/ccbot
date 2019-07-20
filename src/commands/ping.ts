import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Thanks the RFG developers for an awesome game.
 */
export default class PingCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general ping' + client.originalBotCommandPostfix,
            description: 'tests bot response time',
            group: 'general',
            memberName: 'ping' + client.originalBotCommandPostfix
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        // This is semi-ported from the old bot's code! Credit to whoever wrote that.
        // Please don't sue me.
        // this measures the time it took to get here
        const themUs = Date.now() - message.createdTimestamp;
        const message1 = await message.reply(`>:) pew pew. Got here in ${themUs} ms, and...`) as discord.Message;
        // this measures the return trip time
        const newDuration = Date.now() - message1.createdTimestamp;
        const message2 = await message.say(`sent back in ${newDuration} ms`) as discord.Message;
        return [message1, message2];
    }
}
