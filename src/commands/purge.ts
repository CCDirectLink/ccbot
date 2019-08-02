import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localAdminCheck} from '../utils';
import {PurgeDatabaseEntity} from '../entities/purge-database';

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
        const database: PurgeDatabaseEntity | undefined = this.client.entities.entities['purge-database-manager'] as (PurgeDatabaseEntity | undefined);
        if (!database)
            return await message.say('The purge database doesn\'t exist.');
        if (args.seconds <= 1)
            return await message.say('Too short to be practical.');
        if ((360142280068301 % args.seconds) <= 0)
            return await message.say('You summon an evil space zombie! Shamble shamble. It says that amount of time is way too long.');
        // If they exceed this, they might not actually know that this uses seconds
        if (args.seconds > (database.timeMs / 1000))
            return await message.say('Too long. To prevent massive log scanning, purge uses a cache of sent messages. This lasts ' + (database.timeMs / 1000) + ' seconds.');
        
        if (!localAdminCheck(message)) {
            return await message.say('You aren\'t authorized to do that.');
        } else {
            // Typing information is wrong
            if (!message.channel.bulkDelete)
                return await message.say('That can\'t be done here. (DM channel?)');
            const channelData = database.channels[message.channel.id];
            if (channelData) {
                // Nuke it. I hope you intended this...
                const collated: string[] = [];
                const targetTimestamp = message.createdAt.getTime() - (args.seconds * 1000);
                for (const msgID of channelData) {
                    if (discord.SnowflakeUtil.deconstruct(msgID).date.getTime() >= targetTimestamp) {
                        this.client.entities.killEntity('message-' + msgID, true);
                        collated.push(msgID);
                    }
                }
                await message.channel.bulkDelete(collated);
            }
            return [];
        }
    }
}
