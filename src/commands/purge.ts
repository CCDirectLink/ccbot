import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localRPCheck} from '../role-utils';
import {PurgeDatabaseChannelEntity} from '../entities/purge-database';

/**
 * Purges the bot's messages.
 */
export default class PurgeCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general purge',
            description: 'Deletes messages from the bot. Defaults to 1 minute.',
            group: 'general',
            memberName: 'purge',
            args: [
                {
                    key: 'seconds',
                    prompt: 'The amount of time in seconds?',
                    type: 'integer',
                    default: 60
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {seconds: number}): Promise<discord.Message|discord.Message[]> {
        // Get the database
        const database: PurgeDatabaseChannelEntity | undefined = this.client.entities.entities['purge-channel-' + message.channel.id] as (PurgeDatabaseChannelEntity | undefined);
        if (!database)
            return await message.say('The purge database doesn\'t exist.');
        if (args.seconds <= 1)
            return await message.say('Too short to be practical.');
        
        if (!localRPCheck(message, ['READ_MESSAGES', 'MANAGE_MESSAGES'], 'purgers')) {
            return await message.say('You aren\'t authorized to do that.\nYou need READ\_MESSAGES & MANAGE\_MESSAGES, or you need to be in the `purgers` role group.');
        } else {
            // Typing information is wrong
            if (!message.channel.bulkDelete)
                return await message.say('That can\'t be done here. (DM channel?)');
            // Nuke it. I hope you intended this...
            const collated: string[] = [];
            const targetTimestamp = message.createdAt.getTime() - (args.seconds * 1000);
            for (let i = database.messages.length - 1; i >= 0; i--) {
                const msgID = database.messages[i];
                if (discord.SnowflakeUtil.deconstruct(msgID).date.getTime() >= targetTimestamp) {
                    this.client.entities.killEntity('message-' + msgID, true);
                    collated.push(msgID);
                    if (collated.length >= 200)
                        break;
                } else {
                    break;
                }
            }
            await message.channel.bulkDelete(collated);
            return [];
        }
    }
}
