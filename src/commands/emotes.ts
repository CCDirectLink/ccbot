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
        
        const refs: string[] = this.client.getEmoteRefs(message.guild || null);
        refs.sort();
        const pages: discord.RichEmbedOptions[] = [{description: ''}];
        let pageContent = 0;
        
        for (const eref of refs) {
            const emote = this.client.getEmote(message.guild || null, eref);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(message.channel))
                continue;
            if (pageContent == 5) {
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
            pages: pages
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
                this.client.updateGlobalEmoteRegistry();
                return message.say('It is done.');
            } else {
                return message.say('Not allowed...');
            }
        }
        const texts = [];
        for (let i = 0; i < args.emotes.length; i++) {
            const emote = this.client.getEmote(message.guild || null, args.emotes[i]);
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
                    prompt: 'Emotes',
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
        for (let i = 0; i < args.emotes.length; i++) {
            const emote = this.client.getEmote(message.guild || null, args.emotes[i]);
            if (emote.guild && nsfwGuild(this.client, emote.guild) && !nsfw(message.channel))
                continue;
            await message.react(this.client.getEmote(message.guild || null, args.emotes[i]));
        }
        return [];
    }
}
