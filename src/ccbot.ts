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
import CCBotEmoteRegistry from './emote-registry';
import DynamicDataManager from './dynamic-data';
import {Entity, EntityData, EntityRegistry} from './entity-registry';
import {DiscordAPIUser} from './data/structures';
import {GuildTextBasedChannel, TextBasedChannel} from './utils';

declare module 'discord.js' {
    interface ClientEvents {
        raw: [RawEvent];
        ccbotMessageDeletes: [TextBasedChannel, discord.Snowflake[]];
        ccbotMessageUpdateUnchecked: [TextBasedChannel, discord.Snowflake];
        ccbotBanAddRemove: [discord.Guild, DiscordAPIUser, boolean]
    }

}

declare module 'discord.js-commando' {
    interface CommandoMessage {
        client: commando.Client;
    }
}

// TODO: is this worth defining properly?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RawEvent { t: string; d: any }

/// The modified CommandoClient used by this bot.
/// This contains all of the fields and methods for the extension,
/// but not the full constructor, and must not be constructed.
/// See ccbot-impl.ts for why this is.
export abstract class CCBot extends commando.CommandoClient {
    public dynamicData: DynamicDataManager;
    public entities: EntityRegistry<CCBot, CCBotEntity>;
    public emoteRegistry: CCBotEmoteRegistry;

    // THE FOLLOWING EVENTS ARE EXTENSIONS:
    // 'ccbotMessageDeletes', TextBasedChannel, string[]
    // 'ccbotMessageUpdateUnchecked', TextBasedChannel, string
    // 'ccbotBanAddRemove', discord.Guild, <structures.DiscordUserObject>, boolean

    protected constructor(co: commando.CommandoClientOptions) {
        // TODO: get rid of this by always fetching guild members explicitly when needed???
        co.fetchAllMembers = true;
        co.ws = {
            intents: [
                'GUILDS', 'GUILD_EMOJIS',   // these should go without saying
                'GUILD_MEMBERS',            // (privileged) required for greeter, react-roles and a few other things
                'GUILD_BANS',               // required for auditor
                // messages and reactions
                 'GUILD_MESSAGES',  'GUILD_MESSAGE_REACTIONS',
                'DIRECT_MESSAGES', 'DIRECT_MESSAGE_REACTIONS'
            ]
        };
        super(co);
        this.emoteRegistry = new CCBotEmoteRegistry(this);
        this.dynamicData = new DynamicDataManager();
        this.entities = new EntityRegistry<CCBot, CCBotEntity>(this, 'entities.json');
        // This implicitly occurs after entity registration in ccbot-impl.
        this.once('ready', (): void => {
            this.entities.start();
            this.emoteRegistry.updateGlobalEmoteRegistry();
        });
        this.on('raw', (event: RawEvent): void => {
            this.handleRawEvent(event);
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

    /// Ensures data is loaded before anything is done. Important to prevent any potential corruption.
    public async loadData(): Promise<void> {
        await Promise.all([
            this.dynamicData.initialLoad,
            this.entities.initialLoad
        ]);
    }

    /// Overrides destroy to ensure all data is saved.
    public async destroy(): Promise<void> {
        await super.destroy();
        await this.dynamicData.destroy();
        await this.entities.destroy();
    }

    /// You really, really shouldn't have to add something here.
    /// As far as I know the only kinds of events that need this kind of thing are reaction events,
    /// and I have already solved those... well enough.
    private handleRawEvent(event: RawEvent): void {
        if (event.t == 'MESSAGE_REACTION_ADD' || event.t == 'MESSAGE_REACTION_REMOVE') {
            // Ew ew ew WHY IS THIS NECESSARY TO MAKE REACTIONS WORK
            // https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
            // WTF
            const user = this.users.cache.get(event.d.user_id);
            if (!user)
                return;
            const entity = this.entities.getEntity(`message-${event.d.message_id}`);
            if (!entity)
                return;
            const emojiDetails: {id?: string; name: string} = event.d.emoji;
            let emoji: discord.Emoji;
            if (emojiDetails.id) {
                const emojiX = this.emojis.cache.get(emojiDetails.id);
                if (!emojiX)
                    return;
                emoji = emojiX;
            } else {
                // TODO: this is a unicode emoji, simply use emojiDetails.name here
                emoji = this.emoteRegistry.emojiResolverNina(emojiDetails.name);
            }
            entity.emoteReactionTouched(emoji, user, event.t == 'MESSAGE_REACTION_ADD');
        } else if ((event.t == 'MESSAGE_UPDATE') || (event.t == 'MESSAGE_DELETE') || (event.t == 'MESSAGE_DELETE_BULK')) {
            const channel = this.channels.cache.get(event.d.channel_id);
            // No channel means no guild, so nowhere to route
            if (!channel)
                return;
            if (event.t == 'MESSAGE_UPDATE') {
                this.emit('ccbotMessageUpdateUnchecked', channel as TextBasedChannel, event.d.id);
            } else if (event.t == 'MESSAGE_DELETE') {
                this.emit('ccbotMessageDeletes', channel as TextBasedChannel, [event.d.id]);
            } else if (event.t == 'MESSAGE_DELETE_BULK') {
                this.emit('ccbotMessageDeletes', channel as GuildTextBasedChannel, event.d.ids);
            }
        } else if ((event.t == 'GUILD_BAN_ADD') || (event.t == 'GUILD_BAN_REMOVE')) {
            const guild = this.guilds.cache.get(event.d.guild_id);
            // No guild, no idea who to inform
            if (!guild)
                return;
            this.emit('ccbotBanAddRemove', guild, event.d.user, event.t == 'GUILD_BAN_ADD');
        }
    }
}

/// *All commands in the project should be based off of this class, directly or indirectly.*
/// A version of commando.Command with CCBot taking the place of the client field.
export abstract class CCBotCommand extends commando.Command {
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

    public async onBlock(
        message: commando.CommandoMessage,
        reason: string,
        // eslint-disable-next-line @typescript-eslint/ban-types
        data?: Object
    ): Promise<discord.Message | discord.Message[]> {
        if (reason === 'throttling')
            return [];
        return super.onBlock(message, reason, data);
    }
}

/// *All entities in the project should be based off of this class, directly or indirectly.*
/// A version of Entity with fixed generics and the relevant callbacks.
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

    /// For those entities with ID 'message-{id}' (such as 'message-597047171090743308'),
    /// this callback receives emote add/remove events.
    /// This thus basically turns entities with those IDs into 'message managers'.
    public emoteReactionTouched(_emote: discord.Emoji, _user: discord.User, _add: boolean): void {
        // All 3 arguments are not used on purpose.
    }
}
