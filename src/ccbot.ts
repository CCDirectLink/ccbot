import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import DynamicDataManager from './dynamic-data';
import {Entity, EntityRegistry} from './entity-registry';

/**
 * The modified CommandoClient used by this bot.
 * This contains all of the fields and methods for the extension,
 *  but not the constructor, and must not be constructed.
 * See ccbot-impl.ts for why this is.
 */
export abstract class CCBot extends commando.CommandoClient {
    dynamicData: DynamicDataManager = new DynamicDataManager();
    entities: EntityRegistry<CCBot, CCBotEntity> = new EntityRegistry<CCBot, CCBotEntity>(this);
    constructor(co: commando.CommandoClientOptions) {
        super(co);
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
    public constructor(c: CCBot, data: any) {
        super(c, data);
    }
}
