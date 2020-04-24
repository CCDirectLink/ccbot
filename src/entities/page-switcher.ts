// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {EntityData} from '../entity-registry';
import {CCBotEntity, CCBot} from '../ccbot';
import {silence, channelAsTBF} from '../utils';

const ui1 = '⏮';
const ui2 = '◀';
const ui3 = '▶';
const ui4 = '⏭';
const uiDelete = '🚫';
const uiEmotes: string[] = [ui1, ui2, ui3, ui4, uiDelete];
const uiOffsets: {[a: string]: number | undefined} = {
    [ui1]: -10,
    [ui2]: -1,
    [ui3]: 1,
    [ui4]: 10
};

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

export interface PageSwitcherOutputElementsAdditionalOptions {
    // Additional text on every page.
    // NOTE: This doesn't count as part of elements per page.
    // It does count as part of page length.
    textFooter?: string;
    footer?: {
        text?: string;
        icon_url?: string;
    };
}

export interface PageSwitcherOutputElementWithCategory {
    category: string;
    text: string;
}
export type PageSwitcherOutputElement = string | PageSwitcherOutputElementWithCategory;

/// Outputs *either* a page switcher or a single post depending on what's appropriate.
/// Very customizable.
export async function outputElements(client: CCBot, msg: commando.CommandMessage, elements: PageSwitcherOutputElement[], elementsPerPage: number, pageLength: number, options?: PageSwitcherOutputElementsAdditionalOptions): Promise<discord.Message | discord.Message[]> {
    options = options || {};

    const footer = options.footer;

    // The text-footer is subtracted from page length, so it's always safe to append.
    const textFooter = options.textFooter || '';
    pageLength -= textFooter.length;

    // The algorithm begins...
    const pages: (discord.RichEmbedOptions & {description: string})[] = [];
    let elementsOnPage = 0;
    const finishPage = (): void => {
        pages[pages.length - 1].description += textFooter;
    };
    const newPage = (): void => {
        // Finish last page, if any
        if (pages.length > 0)
            finishPage();
        // Create the new page & set elements to zero
        pages.push({description: ''});
        if (footer)
            pages[pages.length - 1].footer = footer;
        elementsOnPage = 0;
    };
    // Create first page.
    newPage();
    // Category (managed by the loop rather than the paginator stuff because of all the special conditions)
    let currentCategory = '';
    for (const elementRaw of elements) {
        // Convert element
        let elementFull: PageSwitcherOutputElementWithCategory;
        if (elementRaw.constructor == String) {
            elementFull = {category: '', text: elementRaw as string};
        } else {
            elementFull = elementRaw as PageSwitcherOutputElementWithCategory;
        }
        let element = elementFull.text;
        let elementPrependedCategory = '';
        // Reset category prepended indicator
        const prependCategoryIfNecessary = (): void => {
            if (currentCategory != elementFull.category) {
                element = elementFull.category + '\n' + elementFull.text;
                currentCategory = elementFull.category;
                elementPrependedCategory = elementFull.category;
            }
        };
        if (elementsOnPage == elementsPerPage) {
            newPage();
            currentCategory = elementPrependedCategory;
        }
        prependCategoryIfNecessary();
        // Attempt 1: Move elements to new page
        const nsl = pages[pages.length - 1].description.length + element.length;
        if (nsl >= pageLength) {
            // If there's no elements on the page, making a new page won't work,
            //  so essentially we go straight to attempt 2
            if (elementsOnPage != 0)
                newPage();
            // Either alone on page or, so ensure we prepended category
            currentCategory = elementPrependedCategory;
            prependCategoryIfNecessary();
            // Attempt 2: Split element across pages
            // Category remains the same
            while (element.length >= pageLength) {
                pages[pages.length - 1].description += element.substring(0, pageLength);
                newPage();
                element = element.substring(pageLength);
            }
            // If the element or part of the element starts this page, elementsOnPage is 0,
            //  so we won't get \n prefix (good)
        }
        if (elementsOnPage != 0)
            element = '\n' + element;
        pages[pages.length - 1].description += element;
        elementsOnPage++;
    }
    // Finish last page
    finishPage();
    // Actual output
    if (pages.length == 1)
        return msg.embed(new discord.RichEmbed(pages[0]));
    const output = await msg.say(formatHeader(0, pages.length), {embed: new discord.RichEmbed(pages[0])}) as discord.Message;
    for (const reaction of uiEmotes)
        await output.react(reaction);
    await client.entities.newEntity({
        type: 'page-switcher',
        channel: msg.channel.id,
        message: output.id,
        user: msg.author.id,
        page: 0,
        pages: pages,
        killTimeout: 60000
    });
    return output;
}

/// Used for a paged interactive UI.
/// Additional fields: See PageSwitcherInit, but:
/// 'channel' is replaced with 'message' after activation.
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

    public onKill(transferOwnership: boolean): void {
        super.onKill(transferOwnership);
        if (!transferOwnership)
            silence(this.message.delete());
    }

    public emoteReactionTouched(target: discord.Emoji, user: discord.User, add: boolean): void {
        super.emoteReactionTouched(target, user, add);

        if (user.id != this.user)
            return;

        if (this.ignoreRemovals && !add)
            return;

        const offset = uiOffsets[target.name];
        if (offset !== undefined) {
            this.page += offset;
            if (this.pages.length != 0) {
                if (offset < 0) {
                    while (this.page < 0)
                        this.page = this.pages.length - 1;
                } else {
                    this.page %= this.pages.length;
                }
            }
            // Update display...
            this.message.edit(formatHeader(this.page, this.pages.length), new discord.RichEmbed(this.pages[this.page])).catch((): void => {
                silence(this.message.react('⚠'));
            });
            this.postponeDeathAndUpdate();
        } else if (target.name == uiDelete) {
            // Alwinfy's Plan: Shut down...
            for (const r of this.message.reactions.values())
                if (r.me)
                    silence(r.remove());
            this.kill(true);
        }

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

/// Creates a page switcher.
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
        for (const reaction of uiEmotes)
            await message.react(reaction);
    } else {
        // Reused
        message = await channel.fetchMessage(data.message);
    }
    return new PageSwitcherEntity(c, channel, message, data);
}
