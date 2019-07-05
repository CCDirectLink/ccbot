//import * as discordJS from 'discord.js';
import * as commando from 'discord.js-commando';
import secrets from './data/secrets';
import CCBotImpl from './ccbot-impl';

class CCBotMain {
    async init(): Promise<void> {
        const client = new CCBotImpl({
            owner: secrets.owner,
            commandPrefix: secrets.commandPrefix
        });
        client.login(secrets.token);
    }
}

new CCBotMain().init();