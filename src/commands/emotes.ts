import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {naturalComparison, localAdminCheck, emoteSafe} from '../utils';
import {outputElements} from '../entities/page-switcher';
import {userAwareGetEmote} from '../entities/user-datablock';

/**
 * A command to list the accessible emotes.
 */
export class ListEmotesCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general lsemotes',
            description: 'Displays all emotes.',
            group: 'general',
            memberName: 'lsemotes',
            args: [
                {
                    key: 'search',
                    prompt: 'Search terms?',
                    type: 'string',
                    default: ''
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {search: string}): Promise<discord.Message|discord.Message[]> {
        // User aliases don't apply here, it's the *actual* emote list.
        const refs: string[] = this.client.emoteRegistry.getEmoteRefs(message.guild || null);
        refs.sort(naturalComparison);
        const elements: string[] = [];
        
        for (const eref of refs) {
            if (eref.indexOf(args.search) == -1)
                continue;
            const emote = this.client.emoteRegistry.getEmote(message.guild || null, eref);
            if (!emoteSafe(emote, message.channel))
                continue;
            elements.push(eref + ' ' + emote.toString());
        }
        
        return outputElements(this.client, message, elements, 20, 2000);
    }
}

/**
 * A command to say a set of emotes.
 */
export class EmoteCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general emote',
            description: 'Writes out a series of emotes.',
            group: 'general',
            memberName: 'emote',
            args: [
                {
                    key: 'emotes',
                    prompt: 'Emotes',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {emotes: string[]}): Promise<discord.Message|discord.Message[]> {
        if ((args.emotes.length > 0) && (args.emotes[0] == 'emote_reset')) {
            if (localAdminCheck(message)) {
                this.client.emoteRegistry.updateGlobalEmoteRegistry();
                return message.say('It is done.');
            } else {
                return message.say('Not allowed...');
            }
        }
        const texts = [];
        for (let i = 0; i < args.emotes.length; i++) {
            const emote = await userAwareGetEmote(this.client, message.author, message.guild || null, args.emotes[i]);
            if (!emoteSafe(emote, message.channel))
                continue;
            texts.push(emote.toString());
        }
        return message.say(texts.join(' '));
    }
}

/**
 * A command to react with a set of emotes.
 */
export class ReactCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general react',
            description: 'Provides the specified reactions.',
            group: 'general',
            memberName: 'react',
            args: [
                {
                    key: 'emotes',
                    prompt: 'Emote names. Can start with "chan=<channel id> id=<message id>" to target a specific message. In this case, "chan=<channel id>" can be omitted if the message is in the current channel.',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {emotes: string[]}): Promise<discord.Message|discord.Message[]> {
        if (args.emotes.length > 8)
            return await message.say('Why?');
        // NOTE: To prevent NSFW emote leakage, that check is done based on the target channel.
        // However, the *emote lookup* is based on the source channel (otherwise things don't make sense)
        let targetChannel: discord.Channel & discord.TextBasedChannelFields = message.channel;
        let targetMessage: discord.Message = message.message;
        let start = 0;
        if (args.emotes[start].startsWith('chan=')) {
            let place = args.emotes[start].substring(5);
            if (place.startsWith('<#') && place.endsWith('>'))
                place = place.substring(2, place.length - 1);
            const part = this.client.channels.get(place);
            if ((!part) || (part.type !== 'text'))
                return await message.say('The channel doesn\'t seem to exist or isn\'t valid for reaction.');
            targetChannel = part as discord.TextChannel;
            start++;
        }
        if (args.emotes[start].startsWith('id=')) {
            try {
                targetMessage = await targetChannel.fetchMessage(args.emotes[start].substring(3));
            } catch (e) {
                return await message.say('The message doesn\'t seem to exist.');
            }
            start++;
        }
        if (targetMessage.channel !== targetChannel)
            return await message.say('Lea bye.');
        for (let i = start; i < args.emotes.length; i++) {
            const emote = await userAwareGetEmote(this.client, message.author, message.guild || null, args.emotes[i]);
            if (!emoteSafe(emote, targetChannel))
                continue;
            await targetMessage.react(emote);
        }
        return [];
    }
}
