import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import {CCBot} from './ccbot';
import {EntityRegistry} from './entity-registry';
import registerAllCommands from './all-commands';
import registerAllEntities from './all-entities';

/**
 * This separate class prevents a dependency loop that would otherwise occur.
 * Theoretically, it's just type definitions, but unfortunately the imports still happen.
 * Only the constructor should be here - the rest is API for the commands and so should be in CCBot.
 */
export default class CCBotImpl extends CCBot {
    constructor(co: commando.CommandoClientOptions) {
        super(co);
        this.registry = new CCBotCommandRegistry(this);
        this.dispatcher.registry = this.registry;
        registerAllCommands(this);
        registerAllEntities(this);
    }
};
