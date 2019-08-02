import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot} from './ccbot';
import CCBotImpl from './ccbot-impl';
import {Secrets} from './data/structures'
import {getRolesState} from './utils'
import fs from 'fs';
import net from 'net';

/**
 * The one and only main class, that initializes everything.
 */
class CCBotMain {
    client: CCBot;
    dataCollector: net.Server | null;
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
        
        // The data collector is "outside the system".
        if (secrets.dataCollectionPort) {
            // Data tallys
            let tallyRaw = 0;
            let tallyCreatedMessages = 0;
            let tallyCommandsExecuted = 0;
            let tallyNewLseExecuted = 0;
            let tallyNewSayExecuted = 0;
            // Data incoming
            this.client.on('raw', (): void => {
                tallyRaw++;
            });
            this.client.on('message', (msg: discord.Message): void => {
                if (msg.author == this.client.user)
                    tallyCreatedMessages++;
            });
            this.client.on('commandRun', (command: commando.Command): void => {
                tallyCommandsExecuted++;
                if (command.name === 'lsemotes')
                    tallyNewLseExecuted++;
                if (command.name === 'say')
                    tallyNewSayExecuted++;
            });
            // commandsExecuted
            // Main collector
            this.dataCollector = new net.Server();
            this.dataCollector.on('connection', (socket: net.Socket): void => {
                socket.end(JSON.stringify({
                    // ltp
                    guildsRoleYes: this.client.guilds.filter((g: discord.Guild): boolean => {
                        return getRolesState(this.client, g) === 'yes';
                    }).size,
                    guildsRoleSBS: this.client.guilds.filter((g: discord.Guild): boolean => {
                        return getRolesState(this.client, g) !== 'no';
                    }).size,
                    newLsemotesExecuted: tallyNewLseExecuted,
                    newSayExecuted: tallyNewSayExecuted,
                    // esd
                    emotesGlobalRegistry: this.client.emoteRegistry.globalEmoteRegistry.size,
                    emoteConflicts: this.client.emoteRegistry.globalConflicts,
                    // hdd
                    entities: Object.keys(this.client.entities.entities).length,
                    settingsLenChars: Buffer.byteLength(JSON.stringify(this.client.dynamicData.settings.data)),
                    // old stuff
                    guilds: this.client.guilds.size,
                    channels: this.client.channels.size,
                    emotes: this.client.emojis.size,
                    rawEvents: tallyRaw,
                    // Not necessarily accurate for side-by-side.
                    messagesCreated: tallyCreatedMessages,
                    commandsExecuted: tallyCommandsExecuted
                }).replace(/\n/g, '') + '\n');
                // Reset tallys
                tallyRaw = 0;
                tallyCreatedMessages = 0;
                tallyCommandsExecuted = 0;
                tallyNewLseExecuted = 0;
                tallyNewSayExecuted = 0;
            });
            this.dataCollector.listen(secrets.dataCollectionPort, secrets.dataCollectionHost);
        } else {
            this.dataCollector = null;
        }
    }
    destroy(): Promise<void> {
        if (this.dataCollector)
            this.dataCollector.close();
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
