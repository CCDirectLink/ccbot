import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import CCBotEmoteRegistry from './emote-registry';
import DynamicDataManager from './dynamic-data';
import {Entity, EntityRegistry} from './entity-registry';

/**
 * The modified CommandoClient used by this bot.
 * This contains all of the fields and methods for the extension,
 *  but not the full constructor, and must not be constructed.
 * See ccbot-impl.ts for why this is.
 */
export abstract class CCBot extends commando.CommandoClient {
    sideBySideSafety: boolean;

    dynamicData: DynamicDataManager;
    entities: EntityRegistry<CCBot, CCBotEntity>;
    emoteRegistry: CCBotEmoteRegistry;
    
    constructor(co: commando.CommandoClientOptions, safety: boolean) {
        super(co);
        this.sideBySideSafety = safety;
        this.emoteRegistry = new CCBotEmoteRegistry(this);
        this.dynamicData = new DynamicDataManager();
        this.entities = new EntityRegistry<CCBot, CCBotEntity>(this, this.dynamicData.entities);
        // This implicitly occurs after entity registration in ccbot-impl.
        this.once('ready', () => {
            this.entities.start();
            this.emoteRegistry.updateGlobalEmoteRegistry();
        });
        this.on('raw', (event: any): void => {
            this.handleRawEvent(event);
        });
        const callbackUpdateGER = () => {
            this.emoteRegistry.updateGlobalEmoteRegistry();
        };
        this.on('emojiCreate', callbackUpdateGER);
        this.on('emojiDelete', callbackUpdateGER);
        this.on('emojiUpdate', callbackUpdateGER);
    }
    
    /**
     * Overrides destroy to ensure all data is saved.
     */
    async destroy(): Promise<void> {
        await super.destroy();
        await this.dynamicData.destroy();
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
                emoji = this.emoteRegistry.emojiResolverNina(emojiDetails.name);
            }
            entity.emoteReactionTouched(emoji, user, event.t == 'MESSAGE_REACTION_ADD');
        }
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
