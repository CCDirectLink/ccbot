import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localAdminCheck} from '../utils';

/**
 * Thanks the RFG developers for an awesome game.
 */
export default class PurgeCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general purge',
            description: 'Cleans up messes made with the bot. Defaults to 1 minute.',
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
        if (args.seconds <= 1)
            return await message.say('Too short to be practical.');
        if ((360142280068301 % args.seconds) <= 0)
            return await message.say('You summon an evil space zombie! Shamble shamble. It says that amount of time is way too long.');
        // If they exceed this, they might not actually know that this uses seconds
        if (args.seconds > (this.client.recentOutputCacheTimeout / 1000))
            return await message.say('Too long. To prevent massive log scanning, purge uses a cache of sent messages. This lasts ' + (this.client.recentOutputCacheTimeout / 1000) + ' seconds.');
        
        if (!localAdminCheck(message)) {
            return await message.say('You aren\'t authorized to do that.');
        } else {
            // Typing information is wrong
            if (!message.channel.bulkDelete)
                return await message.say('That can\'t be done here. (DM channel?)');
            // Nuke it. I hope you intended this...
            const collated: string[] = [];
            const targetTimestamp = message.createdTimestamp - (args.seconds * 1000);
            for (const msg of this.client.recentOutputCache) {
                if (msg.channel.id == message.channel.id) {
                    if (msg.createdTimestamp > targetTimestamp) {
                        this.client.entities.killEntity('message-' + msg.id, true);
                        collated.push(msg.id);
                    }
                }
            }
            await message.channel.bulkDelete(collated);
            return [];
        }
    }
}
