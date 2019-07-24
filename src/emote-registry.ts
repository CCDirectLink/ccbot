import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';

/**
 * A registry of emotes.
 * Not enough of a separatable process to qualify for Entity status,
 *  but it would be messy for this to remain in the main CCBot class.
 */
export default class CCBotEmoteRegistry {
    client: commando.CommandoClient;
    
    // NOTE: This does *not* include per-guild settings or global settings.
    globalEmoteRegistry: Map<string, discord.Emoji> = new Map();
    
    constructor(c: commando.CommandoClient) {
        this.client = c;
    }
    
    /**
     * Updates the global emote registry.
     * This is where all the emotes go.
     * In case of conflict... er, don't get into conflict.
     */
    updateGlobalEmoteRegistry(): void {
        const localRegistry: Map<string, discord.Emoji> = new Map();
        const refsThatExist: Set<string> = new Set();
        for (const emote of this.client.emojis.values()) {
            if (!refsThatExist.has(emote.name)) {
                localRegistry.set(emote.name, emote);
                refsThatExist.add(emote.name);
            } else {
                const conflict = localRegistry.get(emote.name);
                if (conflict) {
                    localRegistry.set(conflict.name + '#' + (conflict.guild || {id: 'discord'}).id, conflict);
                    localRegistry.delete(emote.name);
                }
                localRegistry.set(emote.name + '#' + (emote.guild || {id: 'discord'}).id, emote);
            }
        }
        this.globalEmoteRegistry = localRegistry;
    }
    
    /**
     * Gets an emote as a discord.Emoji
     * This is a bit weird because the stable discord.js API is messy regarding non-custom emoji.
     * It both does and does not support it.
     */
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
        // Emote IDs
        const le = this.client.emojis.get(name);
        if (le)
            return le;
        return this.emojiResolverNina('⁉');
    }
    
    /**
     * Don't ask about the name.
     * This defines the syntax of the "emote-".
     * It is very horrifying.
     */
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
            name: text,
            requiresColons: false,
            managed: true,
            animated: false,
            roles: []
        });
        transmuted.guild = null as any;
        return transmuted;
    }

    /**
     * Lists all emote refs.
     */
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
}