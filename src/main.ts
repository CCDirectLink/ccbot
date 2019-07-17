//import * as discordJS from 'discord.js';
import * as commando from 'discord.js-commando';
import CCBotImpl from './ccbot-impl';
import {Secrets} from './data/structures'
import fs from 'fs';

/**
 * The one and only main class, that initializes everything.
 */
class CCBotMain {
    async init(): Promise<void> {
        // This file may not exist in Travis.
        // So apparently the globalThis require thing doesn't work;
        // 1. Webpack *may* be providing the JSON conversion
        // 2. globalThis is >= Node 12.*
        const secrets: Secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
        // See ccbot-impl.ts for more details on what's going on here.
        // Use CCBot to refer to the class.
        const client = new CCBotImpl({
            owner: secrets.owner,
            commandPrefix: secrets.commandPrefix
        }, secrets.safety);
        client.login(secrets.token);
    }
}

new CCBotMain().init();