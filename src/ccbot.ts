import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import CCBotEmoteRegistry from './emote-registry';
import DynamicDataManager from './dynamic-data';
import {Entity, EntityData, EntityRegistry} from './entity-registry';

/**
 * The modified CommandoClient used by this bot.
 * This contains all of the fields and methods for the extension,
 *  but not the full constructor, and must not be constructed.
 * See ccbot-impl.ts for why this is.
 */
export abstract class CCBot extends commando.CommandoClient {
    public dynamicData: DynamicDataManager;
    public entities: EntityRegistry<CCBot, CCBotEntity>;
    public emoteRegistry: CCBotEmoteRegistry;

    // THE FOLLOWING EVENTS ARE EXTENSIONS:
    // 'ccbotMessageDeletes', discord.Channel & discord.TextBasedChannelFields, string[]
    // 'ccbotMessageUpdateUnchecked', discord.Channel & discord.TextBasedChannelFields, string
    // 'ccbotBanAddRemove', discord.Guild, <structures.DiscordUserObject>, boolean

    protected constructor(co: commando.CommandoClientOptions) {
        super(co);
        this.emoteRegistry = new CCBotEmoteRegistry(this);
        this.dynamicData = new DynamicDataManager();
        this.entities = new EntityRegistry<CCBot, CCBotEntity>(this, 'entities.json');
        // This implicitly occurs after entity registration in ccbot-impl.
        this.once('ready', (): void => {
            this.entities.start();
            this.emoteRegistry.updateGlobalEmoteRegistry();
        });
        this.on('raw', (event: unknown): void => {
            this.handleRawEvent(event as {t: string; d: any});
        });
        const callbackUpdateGER = (): void => {
            this.emoteRegistry.updateGlobalEmoteRegistry();
        };
        this.on('emojiCreate', callbackUpdateGER);
        this.on('emojiDelete', callbackUpdateGER);
        this.on('emojiUpdate', callbackUpdateGER);
        this.on('guildCreate', callbackUpdateGER);
        this.on('guildDelete', callbackUpdateGER);
    }
    
    /**
     * Ensures data is loaded before anything is done. Important to prevent any potential corruption.
     */
    public async loadData(): Promise<void> {
        await Promise.all([
            this.dynamicData.commands.initialLoad,
            this.dynamicData.settings.initialLoad,
            this.entities.initialLoad
        ]);
    }
    
    /**
     * Overrides destroy to ensure all data is saved.
     */
    public async destroy(): Promise<void> {
        await super.destroy();
        await this.dynamicData.destroy();
        await this.entities.destroy();
    }
    
    /**
     * You really, really shouldn't have to add something here.
     * As far as I know the only kinds of events that need this kind of thing are reaction events,
     *  and I have already solved those... well enough.
     */
    private handleRawEvent(event: {t: string; d: any}): void {
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
            const emojiDetails: {id?: string; name: string} = event.d.emoji;
            let emoji: discord.Emoji;
            if (emojiDetails.id) {
                const emojiX = this.emojis.get(emojiDetails.id);
                if (!emojiX)
                    return;
                emoji = emojiX;
            } else {
                emoji = this.emoteRegistry.emojiResolverNina(emojiDetails.name);
            }
            entity.emoteReactionTouched(emoji, user, event.t == 'MESSAGE_REACTION_ADD');
        } else if ((event.t == 'MESSAGE_UPDATE') || (event.t == 'MESSAGE_DELETE') || (event.t == 'MESSAGE_DELETE_BULK')) {
            const channel = this.channels.get(event.d.channel_id);
            // No channel means no guild, so nowhere to route
            if (!channel)
                return;
            if (event.t == 'MESSAGE_UPDATE') {
                this.emit('ccbotMessageUpdateUnchecked', channel, event.d.id);
            } else if (event.t == 'MESSAGE_DELETE') {
                this.emit('ccbotMessageDeletes', channel, [event.d.id]);
            } else if (event.t == 'MESSAGE_DELETE_BULK') {
                this.emit('ccbotMessageDeletes', channel, event.d.ids);
            }
        } else if ((event.t == 'GUILD_BAN_ADD') || (event.t == 'GUILD_BAN_REMOVE')) {
            const guild = this.guilds.get(event.d.guild_id);
            // No guild, no idea who to inform
            if (!guild)
                return;
            this.emit('ccbotBanAddRemove', guild, event.d.user, event.t == 'GUILD_BAN_ADD');
        }
    }
}

/**
 * *All commands in the project should be based off of this class, directly or indirectly.*
 * A version of commando.Command with CCBot taking the place of the client field.
 */
export class CCBotCommand extends commando.Command {
    public client!: CCBot;
    public constructor(client: CCBot, options: commando.CommandInfo) {
        super(client, options);
        // Add default throttling options. The source of these might need to be put elsewhere.
        // Note though that a live-updatable mechanism would need to rely on a by-reference scheme,
        //  to avoid having to keep track of which commands have explicit throttles.
        if (!this.throttling) {
            this.throttling = {
                usages: 8,
                duration: 45
            };
        }
    }
}

/**
 * *All entities in the project should be based off of this class, directly or indirectly.*
 * A version of Entity with fixed generics and the relevant callbacks.
 */
export class CCBotEntity extends Entity<CCBot> {    
    public constructor(c: CCBot, id: string, data: EntityData) {
        super(c, id, data);
    }

    public kill(transferOwnership: boolean): void {
        if (!this.killed)
            this.client.entities.killEntity(this.id, transferOwnership);
    }
    
    public updated(): void {
        super.updated();
        if (!this.killed)
            this.client.entities.updated();
    }
    
    /**
     * For those entities with ID 'message-{id}' (such as 'message-597047171090743308'),
     *  this callback receives emote add/remove events.
     * This thus basically turns entities with those IDs into 'message managers'.
     */
    public emoteReactionTouched(emote: discord.Emoji, user: discord.User, add: boolean): void {
        // All 3 arguments are not used on purpose.
    }
}
