import * as commando from 'discord.js-commando';
import CCBotCommandRegistry from './command-registry';
import DynamicDataManager from './dynamic-data';

export class CCBot extends commando.CommandoClient {
    dynamicData: DynamicDataManager = new DynamicDataManager();
    constructor(co: commando.CommandoClientOptions) {
        super(co);
    }
};

export class CCBotCommand extends commando.Command {
    client!: CCBot;
    constructor(client: CCBot, options: commando.CommandInfo) {
        super(client, options);
    }
}