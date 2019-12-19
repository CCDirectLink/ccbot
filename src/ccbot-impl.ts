import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import CCBotCommandDispatcher from './command-dispatcher';
import CCBotSettingProvider from './setting-provider';
import {CCBot} from './ccbot';
import registerAllCommands from './all-commands';
import registerAllEntities from './all-entities';

/**
 * This separate class prevents a dependency loop that would otherwise occur.
 * Theoretically, it's just type definitions, but unfortunately the imports still happen.
 * Only the constructor should be here - the rest is API for the commands and so should be in CCBot.
 */
export default class CCBotImpl extends CCBot {
    public constructor(co: commando.CommandoClientOptions, twitchClientId: string | undefined, ytClientId: string | undefined) {
        super(co);
        this.registry = new CCBotCommandRegistry(this);
        this.dispatcher = new CCBotCommandDispatcher(this, this.registry);
        registerAllCommands(this);
        registerAllEntities(this, twitchClientId, ytClientId);
        this.setProvider(new CCBotSettingProvider(this.dynamicData.settings));
    }
}
