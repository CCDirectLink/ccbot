import * as discord from 'discord.js';
import {EntityData} from '../entity-registry';
import {CCBotEntity, CCBot} from '../ccbot';
import {channelAsTBF} from '../utils';

export interface PageSwitcherInit {
    // Channel ID.
    channel: string;
    // User ID.
    user: string;
    pages: discord.RichEmbedOptions[];
    // Kill timeout (relative to when the message appears, or the last interaction)
    killTimeout: number;
}

export interface PageSwitcherData extends EntityData {
    type: 'page-switcher';
    // Channel ID.
    channel: string;
    // Message ID.
    message: string;
    // User ID.
    user: string;
    page: number;
    pages: discord.RichEmbedOptions[];
    // Kill timeout (relative to when the message appears, or the last interaction)
    killTimeout: number;
}

function formatHeader(a: number, b: number): string {
    return 'Page ' + (a + 1) + ' of ' + b;
}

/**
 * Creates a page switcher.
 */
export function newPageSwitcher(bot: CCBot, psi: PageSwitcherInit): void {
    if (psi.pages.length == 0)
        psi.pages.push({
            title: 'No results.'
        });
    const channel = channelAsTBF(bot.channels.get(psi.channel));
    if (channel) {
        (async (): Promise<void> => {
            const message: discord.Message = await channel.send(formatHeader(0, psi.pages.length), new discord.RichEmbed(psi.pages[0])) as discord.Message;
            await message.react('⬅');
            await message.react('➡');
            const psd: PageSwitcherData = {
                id: 'message-' + message.id,
                type: 'page-switcher',
                channel: psi.channel,
                message: message.id,
                user: psi.user,
                page: 0,
                pages: psi.pages,
                killTimeout: psi.killTimeout
            };
            psd.killTime = new Date().getTime() + psi.killTimeout;
            bot.entities.newEntity(psd);
        })();
    }
}

/**
 * Used for a paged interactive UI.
 * Additional fields: See PageSwitcherInit, but:
 * 'channel' is replaced with 'message' after activation.
 */
export class PageSwitcherEntity extends CCBotEntity {
    private channel: string;
    private message: string;
    private user: string;
    private page: number;
    private pages: discord.RichEmbedOptions[];
    private killTimeout: number;
    
    public constructor(c: CCBot, data: PageSwitcherData) {
        super(c, data);
        this.channel = data.channel;
        this.message = data.message;
        this.user = data.user;
        this.page = data.page;
        this.pages = data.pages;
        this.killTimeout = data.killTimeout;
    }
    
    public toSaveData(): PageSwitcherData {
        const data: PageSwitcherData = super.toSaveData() as PageSwitcherData;
        data.channel = this.channel;
        data.message = this.message;
        data.user = this.user;
        data.page = this.page;
        data.pages = this.pages;
        data.killTimeout = this.killTimeout;
        return data;
    }
    
    public onKill(): void {
        super.onKill();
        const channel = channelAsTBF(this.client.channels.get(this.channel));
        if (channel) {
            (async (): Promise<void> => {
                const msg = await channel.fetchMessage(this.message);
                msg.delete();
            })();
        }
    }
    
    public emoteReactionTouched(target: discord.Emoji, user: discord.User, add: boolean): void {
        super.emoteReactionTouched(target, user, add);
        if (user.id != this.user)
            return;
        if (target.name == '⬅') {
            this.page--;
            if (this.page < 0)
                this.page = this.pages.length - 1;
        } else if (target.name == '➡') {
            this.page++;
            this.page %= this.pages.length;
        }
        const channel = channelAsTBF(this.client.channels.get(this.channel));
        if (channel) {
            (async (): Promise<void> => {
                const msg = await channel.fetchMessage(this.message);
                msg.edit(formatHeader(this.page, this.pages.length), new discord.RichEmbed(this.pages[this.page]));
            })();
            this.killTime = new Date().getTime() + this.killTimeout;
            this.updated();
        }
    }
}
