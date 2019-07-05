//import * as discordJS from 'discord.js';
import * as commando from 'discord.js-commando';
import secrets from './data/secrets';
import CCBotImpl from './ccbot-impl';

/**
 * The one and only main class, that initializes everything.
 */
class CCBotMain {
    async init(): Promise<void> {
        // See ccbot-impl.ts for more details on what's going on here.
        // Use CCBot to refer to the class.
        const client = new CCBotImpl({
            owner: secrets.owner,
            commandPrefix: secrets.commandPrefix
        });
        client.login(secrets.token);
    }
}

new CCBotMain().init();