import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localAdminCheck, nsfw, nsfwGuild} from '../utils';
import {PageSwitcherData} from '../entities/page-switcher';

/**
 * A command to list the accessible emotes.
 */
export class ListEmotesCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general lsemotes',
            description: 'Displays all emotes.',
            group: 'general',
            memberName: 'lsemotes'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        
        const refs: string[] = this.client.emoteRegistry.getEmoteRefs(message.guild || null);
        refs.sort();
        const pages: discord.RichEmbedOptions[] = [{description: ''}];
        let pageContent = 0;
        
        for (const eref of refs) {
            const emote = this.client.emoteRegistry.getEmote(message.guild || null, eref);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(message.channel))
                continue;
            if (pageContent == 20) {
                pages.push({description: ''});
                pageContent = 0;
            }
            pages[pages.length - 1].description += eref + ' ' + emote.toString() + '\n';
            pageContent++;
        }
        
        const psd: PageSwitcherData = {
            type: 'page-switcher',
            channel: message.channel.id,
            user: message.author.id,
            page: 0,
            pages: pages,
            killTimeout: 60000
        };
        this.client.entities.newEntity(psd);
        return [];
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
            const emote = this.client.emoteRegistry.getEmote(message.guild || null, args.emotes[i]);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(message.channel))
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
            const emote = this.client.emoteRegistry.getEmote(message.guild || null, args.emotes[i]);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(targetChannel))
                continue;
            await targetMessage.react(this.client.emoteRegistry.getEmote(message.guild || null, args.emotes[i]));
        }
        return [];
    }
}
