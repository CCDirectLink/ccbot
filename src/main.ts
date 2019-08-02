//import * as discordJS from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot} from './ccbot';
import CCBotImpl from './ccbot-impl';
import {Secrets} from './data/structures'
import fs from 'fs';

/**
 * The one and only main class, that initializes everything.
 */
class CCBotMain {
    client: CCBot;
    constructor() {
        // This file may not exist in Travis.
        // So apparently the globalThis require thing doesn't work;
        // 1. Webpack *may* be providing the JSON conversion
        // 2. globalThis is >= Node 12.*
        const secrets: Secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
        // See ccbot-impl.ts for more details on what's going on here.
        // Use CCBot to refer to the class.
        this.client = new CCBotImpl({
            owner: secrets.owner,
            commandPrefix: secrets.commandPrefix
        }, secrets.safety);
        this.client.login(secrets.token);
    }
    destroy(): Promise<void> {
        return this.client.destroy();
    }
}

const ccbot = new CCBotMain();
let shuttingDown = false;

async function shutdown() {
    if (shuttingDown)
        return;
    console.log('Goodbye.');
    shuttingDown = true;
    try {
        await ccbot.destroy();
    } catch (e) {
        console.error('During shutdown:', e);
    }
    process.exit(0);
}

process.on('exit', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGUSR1', shutdown);
process.on('SIGUSR2', shutdown);
