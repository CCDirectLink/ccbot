import * as discord from 'discord.js';
import {EntityData} from '../entity-registry';
import {CCBotEntity, CCBot} from '../ccbot';
import {channelAsTBF} from '../utils';

export interface PageSwitcherData extends EntityData {
    // Channel ID.
    channel: string;
    // Message ID (not present if it must be created)
    message?: string;
    // User ID.
    user: string;
    // Page number (0 to pages.length - 1)
    page: number;
    // Pages, cannot be empty
    pages: discord.RichEmbedOptions[];
    // Used if the bot appears to have remove-reaction permission.
    ignoreRemovals?: boolean;
}

function formatHeader(a: number, b: number): string {
    return 'Page ' + (a + 1) + ' of ' + b;
}

/**
 * Used for a paged interactive UI.
 * Additional fields: See PageSwitcherInit, but:
 * 'channel' is replaced with 'message' after activation.
 */
class PageSwitcherEntity extends CCBotEntity {
    private channel: discord.Channel & discord.TextBasedChannelFields;
    private message: discord.Message;
    private user: string;
    private page: number;
    private pages: discord.RichEmbedOptions[];
    // Starts out true. Changes to false if it can't get rid of the user's reaction.
    private ignoreRemovals: boolean;
    
    public constructor(c: CCBot, channel: discord.Channel & discord.TextBasedChannelFields, message: discord.Message, data: PageSwitcherData) {
        super(c, 'message-' + message.id, data);
        this.channel = channel;
        this.message = message;
        this.user = data.user;
        this.page = data.page;
        this.pages = data.pages;
        if (data.ignoreRemovals === undefined) {
            this.ignoreRemovals = true;
        } else {
            this.ignoreRemovals = data.ignoreRemovals;
        }
    }
    
    public toSaveData(): PageSwitcherData {
        return Object.assign(super.toSaveData(), {
            channel: this.channel.id,
            message: this.message.id,
            user: this.user,
            page: this.page,
            pages: this.pages
        });
    }
    
    public onKill(): void {
        super.onKill();
        this.message.delete();
    }
    
    public emoteReactionTouched(target: discord.Emoji, user: discord.User, add: boolean): void {
        super.emoteReactionTouched(target, user, add);

        if (user.id != this.user)
            return;
        
        if (this.ignoreRemovals && !add)
            return;

        if (target.name == '⬅') {
            this.page--;
            if (this.page < 0)
                this.page = this.pages.length - 1;
        } else if (target.name == '➡') {
            this.page++;
            this.page %= this.pages.length;
        }
        this.postponeDeathAndUpdate();

        // Update display...
        this.message.edit(formatHeader(this.page, this.pages.length), new discord.RichEmbed(this.pages[this.page]));
        // Try to remove reaction (Nnubes256's suggestion)
        const reaction = this.message.reactions.get(target.id || target.name);
        if (this.ignoreRemovals && reaction) {
            reaction.remove(user).catch((): void => {
                this.ignoreRemovals = false;
                this.updated();
            });
        }
    }
}

/**
 * Creates a page switcher.
 */
export default async function load(c: CCBot, data: PageSwitcherData): Promise<CCBotEntity> {
    // This makes a possible DM channel with the user 'important enough' to start existing
    // Blame discord.js
    const yesCacheMe = await c.fetchUser(data.user, true);
    await yesCacheMe.createDM();
    const channel = channelAsTBF(c.channels.get(data.channel));
    if (!channel)
        throw Error('involved channel no longer exists');
    let message: discord.Message;
    if (!data.message) {
        // New
        message = await channel.send(formatHeader(0, data.pages.length), new discord.RichEmbed(data.pages[0])) as discord.Message;
        await message.react('⬅');
        await message.react('➡');
    } else {
        // Reused
        message = await channel.fetchMessage(data.message);
    }
    return new PageSwitcherEntity(c, channel, message, data);
}
