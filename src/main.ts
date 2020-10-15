// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot} from './ccbot';
import CCBotImpl from './ccbot-impl';
import {Secrets} from './data/structures'
import * as fs from 'fs';
import * as net from 'net';

/// The one and only main class, that initializes everything.
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
        }, this.secrets.twitchClientId, this.secrets.youtubeData3Key);
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
    startDataCollector(): void {
        // The data collector is "outside the system".
        if (this.secrets.dataCollectionPort) {
            // Data tallys
            let tallyRaw = 0;
            let tallyCreatedMessages = 0;
            let tallyCommandsExecuted = 0;
            const tallyCommandsBreakdown = new Map<string, number>();
            const entitiesBreakdown = new Map<string, number>();
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
                tallyCommandsBreakdown.set(command.name, (tallyCommandsBreakdown.get(command.name) || 0) + 1);
            });
            // commandsExecuted
            // Main collector
            this.dataCollector = new net.Server();
            this.dataCollector.on('connection', (socket: net.Socket): void => {
                socket.on('error', (): void => {});
                entitiesBreakdown.clear();
                for (const { type } of this.client.entities.entities.values()) {
                    entitiesBreakdown.set(type, (entitiesBreakdown.get(type) || 0) + 1);
                }
                const guildsBreakdownYes = this.client.guilds.filter((_guild) => {
                    return true;
                }).size;
                const guildsBreakdownSBS = this.client.guilds.filter((_guild) => {
                    return false;
                }).size;
                const guildsBreakdownNo = this.client.guilds.size - (guildsBreakdownYes + guildsBreakdownSBS);
                socket.end(JSON.stringify({
                    // ltp
                    guildsBreakdown: {
                        yes: guildsBreakdownYes,
                        sbs: guildsBreakdownSBS,
                        no: guildsBreakdownNo
                    },
                    commandsExecutedBreakdown: Object.fromEntries(tallyCommandsBreakdown),
                    // esd
                    emotesGlobalRegistry: this.client.emoteRegistry.globalEmoteRegistry.size,
                    emoteConflicts: this.client.emoteRegistry.globalConflicts,
                    // hdd
                    entities: this.client.entities.entities.size,
                    entitiesBreakdown: Object.fromEntries(entitiesBreakdown),
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
                tallyCommandsBreakdown.clear();
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

async function shutdown(): Promise<void> {
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
