import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {silence} from '../utils';
import {newVM, runFormat} from '../formatter';

/**
 * For ventriloquism.
 */
export default class SayCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general say',
            description: 'Has the bot say something. Please see the Format Syntax Guide (.cc -formatter help)',
            group: 'general',
            memberName: 'say',
            args: [
                {
                    key: 'text',
                    prompt: 'The text to say.',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {text: string}): Promise<discord.Message|discord.Message[]> {
        const text = await runFormat(args.text, newVM({
            client: this.client,
            channel: message.channel,
            cause: message.author,
            writer: message.author,
            protectedContent: false
        }));
        // It's important that this *does not* use global in place of the setting in the guild if none exists.
        // By per-guild default say should always have a header.
        const headerless = this.client.provider.get(message.guild || 'global', 'headerless-say', false);
        if (!headerless) {
            if (message.deletable)
                silence(message.delete());
            return await message.say('*' + message.author.toString() + ' says:*\n' + text);
        }
        return await message.say(text);
    }
}
