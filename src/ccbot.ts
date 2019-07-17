import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import DynamicDataManager from './dynamic-data';
import {Entity, EntityRegistry} from './entity-registry';

/**
 * The modified CommandoClient used by this bot.
 * This contains all of the fields and methods for the extension,
 *  but not the full constructor, and must not be constructed.
 * See ccbot-impl.ts for why this is.
 */
export abstract class CCBot extends commando.CommandoClient {
    dynamicData: DynamicDataManager;
    entities: EntityRegistry<CCBot, CCBotEntity>;
    // NOTE: This does *not* include per-guild settings or global settings.
    globalEmoteRegistry: Map<string, discord.Emoji> = new Map();
    
    constructor(co: commando.CommandoClientOptions) {
        super(co);
        this.dynamicData = new DynamicDataManager();
        this.entities = new EntityRegistry<CCBot, CCBotEntity>(this, this.dynamicData.entities);
        // This implicitly occurs after entity registration in ccbot-impl.
        this.once('ready', () => {
            this.entities.start();
            this.updateGlobalEmoteRegistry();
        });
        this.on('raw', (event: any): void => {
            this.handleRawEvent(event);
        });
    }
    
    /**
     * You really, really shouldn't have to add something here.
     * As far as I know the only kinds of events that need this kind of thing are reaction events,
     *  and I have already solved those... well enough.
     */
    handleRawEvent(event: any): void {
        if (event.t == 'MESSAGE_REACTION_ADD' || event.t == 'MESSAGE_REACTION_REMOVE') {
            // Ew ew ew WHY IS THIS NECESSARY TO MAKE REACTIONS WORK
            // https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
            // WTF
            const user = this.users.get(event.d.user_id);
            if (!user)
                return;
            const entity = this.entities.entities['message-' + event.d.message_id];
            if (!entity)
                return;
            const emojiDetails: {id?: string, name: string} = event.d.emoji;
            let emoji: discord.Emoji;
            if (emojiDetails.id) {
                const emojiX = this.emojis.get(emojiDetails.id);
                if (!emojiX)
                    return;
                emoji = emojiX;
            } else {
                emoji = this.emojiResolverNina(emojiDetails.name);
            }
            entity.emoteReactionTouched(emoji, user, event.t == 'MESSAGE_REACTION_ADD');
        }
    }
    
    /**
     * Updates the global emote registry.
     * This is where all the emotes go.
     * In case of conflict... er, don't get into conflict.
     */
    updateGlobalEmoteRegistry(): void {
        const localRegistry: Map<string, discord.Emoji> = new Map();
        const refsThatExist: Set<string> = new Set();
        for (const emote of this.emojis.values()) {
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
        if (guild) {
            const value = this.provider.get(guild, 'emote-' + name);
            if (value)
                return this.emojiResolverNina(value.toString());
        }
        const value = this.provider.get('global', 'emote-' + name);
        if (value)
            return this.emojiResolverNina(value.toString());
        const gResult = this.globalEmoteRegistry.get(name);
        if (gResult)
            return gResult;
        return this.emojiResolverNina('⁉');
    }
    
    /**
     * Don't ask about the name.
     * This defines the syntax of the "emote-".
     * It is very horrifying.
     */
    private emojiResolverNina(text: string): discord.Emoji {
        // Is it just an emote ID?
        const direct = this.emojis.get(text);
        if (direct)
            return direct;
        // Is it a written custom emote?
        if (text.startsWith('<') && text.includes(':')) {
            let text2 = text.substring(1);
            text2 = text2.substring(0, text2.indexOf(':'));
            const direct = this.emojis.get(text2);
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
        for (const k in this.globalEmoteRegistry)
            a.push(k);
        for (const v of this.provider.get(guild || 'global', 'emotes', []))
            if (!a.includes(v))
                a.push(v.toString());
        if (guild)
            for (const v of this.provider.get(guild || 'global', 'emotes', []))
                if (!a.includes(v))
                    a.push(v.toString());
        return a;
    }
};

/**
 * *All commands in the project should be based off of this class, directly or indirectly.*
 * A version of commando.Command with CCBot taking the place of the client field.
 */
export class CCBotCommand extends commando.Command {
    client!: CCBot;
    constructor(client: CCBot, options: commando.CommandInfo) {
        super(client, options);
    }
}

/**
 * *All entities in the project should be based off of this class, directly or indirectly.*
 * A version of Entity with fixed generics and the relevant callbacks.
 */
export class CCBotEntity extends Entity<CCBot> {
    public constructor(c: CCBot, id: string, data: any) {
        super(c, id, data);
    }

    public kill(): void {
        if (!this.killed)
            this.client.entities.killEntity(this.id);
    }
    
    public updated(): void {
        if (!this.killed)
            this.client.entities.markPendingFlush();
    }
    
    /**
     * For those entities with ID 'message-{id}' (such as 'message-597047171090743308'),
     *  this callback receives emote add/remove events.
     * This thus basically turns entities with those IDs into 'message managers'.
     */
    public emoteReactionTouched(emote: discord.Emoji, user: discord.User, add: boolean): void {
        
    }
}
