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
import {CCBot} from './ccbot';
import {naturalComparison, nsfwGuild, emoteSafe, silence} from './utils';
import {EmoteRegistryDump} from './data/structures';

/// Determine if a bit of text looks like an emoji.
/// Notably, it doesn't actually have to *be* an emoji,
/// it just has to not look too much like one to stop people complaining over 'bugs' that don't exist.
/// We're not embedding a dictionary of every possible emoji combination just so that
/// emote doesn't accept a few invalid combinations.
function looksLikeAnEmoji(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code < 128)
            return false;
    }
    return true;
}

/// A registry of emotes.
/// Not enough of a separatable process to qualify for Entity status,
/// but it would be messy for this to remain in the main CCBot class.
export default class CCBotEmoteRegistry {
    client: CCBot;

    // NOTE: This does *not* include per-guild settings or global settings.
    globalEmoteRegistry: Map<string, discord.Emoji> = new Map();
    globalConflicts = 0;

    constructor(c: CCBot) {
        this.client = c;
    }

    /// Updates the global emote registry.
    /// This is where all the emotes go.
    /// In case of conflict, it uses 'trust prioritization' to try and avoid any incidents.
    updateGlobalEmoteRegistry(): void {
        const localRegistryCollation: Map<string, discord.Emoji[]> = new Map();
        for (const emote of this.client.emojis.values()) {
            let emotes: discord.Emoji[] | undefined = localRegistryCollation.get(emote.name);
            if (!emotes) {
                emotes = [];
                localRegistryCollation.set(emote.name, emotes);
            }
            emotes.push(emote);
        }
        const localRegistry: Map<string, discord.Emoji> = new Map();
        // NOTE! The type here isn't totally right, but the constructor-checking condition prevents any issues.
        // It is possible for some truly evil JSON to set constructor, but it can't be set to Array legitimately.
        const safetyList: any[] | undefined = this.client.provider.get('global', 'emotePath', []);
        // Start tallying conflicts
        this.globalConflicts = 0;
        for (const pair of localRegistryCollation) {
            // Conflict resolution
            pair[1].sort((a: discord.Emoji, b: discord.Emoji): number => {
                // Firstly, check position in safety list (if available)
                // This code is written with safety margins to prevent crashing in case of user error.
                if (safetyList && (safetyList.constructor === Array)) {
                    let ag = safetyList.indexOf(a.guild.id);
                    if (ag < 0)
                        ag = safetyList.length;
                    let bg = safetyList.indexOf(b.guild.id);
                    if (bg < 0)
                        bg = safetyList.length;

                    if (ag < bg) {
                        return -1;
                    } else if (ag > bg) {
                        return 1;
                    }
                }
                // Secondly, SFW emotes are prioritized over NSFW ones,
                //  so an NSFW emote can't be used to shadow a SFW emote even when both emotes are untrusted,
                //  which should prevent anything mysterious happening (NSFW emotes being hidden)
                const nsfwA = nsfwGuild(this.client, a.guild);
                const nsfwB = nsfwGuild(this.client, b.guild);
                if (nsfwA != nsfwB) {
                    if (nsfwA) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
                // Thirdly, natural comparison of emote snowflakes.
                return naturalComparison(a.id, b.id);
            });
            // Assign IDs: Winner gets the real name, losers get the #-postfixed names
            localRegistry.set(pair[0], pair[1][0]);
            if (pair[1].length != 1)
                this.globalConflicts++;
            for (let i = 1; i < pair[1].length; i++)
                localRegistry.set(pair[0] + '#' + pair[1][i].guild.id, pair[1][i]);
        }
        this.globalEmoteRegistry = localRegistry;

        this.dumpToFile();
    }

    /// Checks if an emote is overridden at guild or global level.
    isOverride(guild: discord.Guild | null, name: string): string | null {
        // Local emote overrides
        if (guild) {
            const value = this.client.provider.get(guild, 'emote-' + name);
            if (value)
                return 'guild';
        }
        // Global emote overrides
        const value = this.client.provider.get('global', 'emote-' + name);
        if (value)
            return 'global';
        return null;
    }

    /// Gets an emote as a discord.Emoji
    /// This is a bit weird because the stable discord.js API is messy regarding non-custom emoji.
    /// It both does and does not support it.
    /// NOTE! Use userAwareGetEmote whenever possible.
    /// Emote grabbing should operate from the Writer's perspective,
    /// which means hug emote can be overridden by user, etc.
    getEmote(guild: discord.Guild | null, name: string): discord.Emoji {
        // Local emote overrides
        if (guild) {
            const value = this.client.provider.get(guild, 'emote-' + name);
            if (value)
                return this.emojiResolverNina(value.toString());
        }
        // Global emote overrides
        const value = this.client.provider.get('global', 'emote-' + name);
        if (value)
            return this.emojiResolverNina(value.toString());
        // Emote registry
        const gResult = this.globalEmoteRegistry.get(name);
        if (gResult)
            return gResult;
        // Emote IDs / Written custom emotes / Unicode emotes
        return this.emojiResolverNina(name);
    }

    /// Don't ask about the name.
    /// This defines the syntax of the "emote-".
    /// It is very horrifying.
    emojiResolverNina(text: string): discord.Emoji {
        // Is it just an emote ID?
        const direct = this.client.emojis.get(text);
        if (direct)
            return direct;
        // Is it a written custom emote?
        if (text.startsWith('<') && text.includes(':')) {
            let text2 = text.substring(1);
            text2 = text2.substring(0, text2.indexOf(':'));
            const direct = this.client.emojis.get(text2);
            if (direct)
                return direct;
        }
        // This next bit needs to burn in some place very warm.
        // It exists because it has to for a nicer API overall.
        const transmuted = new discord.Emoji({client: this} as any as discord.Guild, {
            //id: null,
            name: looksLikeAnEmoji(text) ? text : '❓', // Was this really such a problem?
            requiresColons: false,
            managed: true,
            animated: false,
            roles: []
        });
        transmuted.guild = null as any;
        return transmuted;
    }

    /// Lists all emote refs.
    getEmoteRefs(guild: discord.Guild | null): string[] {
        const a: string[] = [];
        for (const k of this.globalEmoteRegistry.keys())
            a.push(k);
        for (const v of this.client.provider.get('global', 'emotes', []))
            if (!a.includes(v))
                a.push(v.toString());
        if (guild)
            for (const v of this.client.provider.get(guild, 'emotes', []))
                if (!a.includes(v))
                    a.push(v.toString());
        return a;
    }

    dumpToFile(): void {
        const data: EmoteRegistryDump = { version: 1, list: [] };
        for (const ref of this.getEmoteRefs(null)) {
            const emote = this.getEmote(null, ref);
            data.list.push({
                /* eslint-disable @typescript-eslint/camelcase */
                ref,
                id: emote.id,
                name: emote.name,
                requires_colons: emote.requiresColons,
                animated: emote.animated,
                url: emote.url,
                safe: emoteSafe(emote, null, true),
                guild_id: emote.guild.id,
                guild_name: emote.guild.name,
                /* eslint-enable @typescript-eslint/camelcase */
            });
        }
        silence(this.client.dynamicData.emoteRegistryDump.dump(data));
    }
}
