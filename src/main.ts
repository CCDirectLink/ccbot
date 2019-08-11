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
    secrets: Secrets;
    constructor() {
        // This file may not exist in Travis.
        // So apparently the globalThis require thing doesn't work;
        // 1. Webpack *may* be providing the JSON conversion
        // 2. globalThis is >= Node 12.*
        this.secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
        // See ccbot-impl.ts for more details on what's going on here.
        // Use CCBot to refer to the class.
        this.client = new CCBotImpl({
            owner: this.secrets.owner,
            commandPrefix: this.secrets.commandPrefix
        }, this.secrets.safety, this.secrets.twitchClientId);
        this.dataCollector = null;
        
        const kickstart = async (): Promise<void> => {
            try {
                // Makes sure that data isn't corrupt, makes sure that data is available
                await this.client.loadData();
                // Ok, *now* login
                await this.client.login(this.secrets.token);
                this.startDataCollector();
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        }
        kickstart();
    }
    startDataCollector() {
        // The data collector is "outside the system".
        if (this.secrets.dataCollectionPort) {
            // Data tallys
            let tallyRaw = 0;
            let tallyCreatedMessages = 0;
            let tallyCommandsExecuted = 0;
            let tallyCommandsBreakdown: {[str: string]: number} = {};
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
                tallyCommandsBreakdown[command.name] = (tallyCommandsBreakdown[command.name] || 0) + 1;
            });
            // commandsExecuted
            // Main collector
            this.dataCollector = new net.Server();
            this.dataCollector.on('connection', (socket: net.Socket): void => {
                socket.on('error', (): void => {});
                let entitiesBreakdown: {[str: string]: number} = {};
                for (const entID in this.client.entities.entities) {
                    const type = this.client.entities.entities[entID].type;
                    entitiesBreakdown[type] = (entitiesBreakdown[type] || 0) + 1;
                }
                const guildsBreakdownYes = this.client.guilds.filter((g: discord.Guild): boolean => {
                    return getRolesState(this.client, g) === 'yes';
                }).size;
                const guildsBreakdownSBS = this.client.guilds.filter((g: discord.Guild): boolean => {
                    const state = getRolesState(this.client, g);
                    return (state !== 'no') && (state !== 'yes');
                }).size;
                const guildsBreakdownNo = this.client.guilds.size - (guildsBreakdownYes + guildsBreakdownSBS);
                socket.end(JSON.stringify({
                    // ltp
                    guildsBreakdown: {
                        yes: guildsBreakdownYes,
                        sbs: guildsBreakdownSBS,
                        no: guildsBreakdownNo
                    },
                    commandsExecutedBreakdown: tallyCommandsBreakdown,
                    // esd
                    emotesGlobalRegistry: this.client.emoteRegistry.globalEmoteRegistry.size,
                    emoteConflicts: this.client.emoteRegistry.globalConflicts,
                    // hdd
                    entities: Object.keys(this.client.entities.entities).length,
                    entitiesBreakdown: entitiesBreakdown,
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
                tallyCommandsBreakdown = {};
            });
            this.dataCollector.listen(this.secrets.dataCollectionPort, this.secrets.dataCollectionHost);
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
