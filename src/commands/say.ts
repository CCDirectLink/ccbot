import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {nsfwGuild, nsfw, silence} from '../utils';

/**
 * For ventriloquism.
 */
export default class SayCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general say' + client.originalBotCommandPostfix,
            description: 'Has the bot say something. Emotes are delimited with "/", such as /shizuHUG/.',
            group: 'general',
            memberName: 'say' + client.originalBotCommandPostfix,
            args: [
                {
                    key: 'text',
                    prompt: 'The text to say.',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {text: string[]}): Promise<discord.Message|discord.Message[]> {
        const text = args.text.join(' ').replace(/\/(.*?)\//g, (text: string, p1: string): string => {
            const emote = this.client.getEmote(message.guild || null, p1);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(message.channel))
                return '';
            return emote.toString();
        });
        // It's important that this *does not* use global in place of the setting in the guild if none exists.
        // By per-guild default say should always have a header.
        const headerless = this.client.provider.get(message.guild || 'global', 'headerless-say', false);
        if (message.deletable && !headerless)
            silence(message.delete());
        return await message.say(text);
    }
}
