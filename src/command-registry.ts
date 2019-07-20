import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import DynamicDataManager from './dynamic-data';
import JSONCommand from './commands/json';
import HelpCommand from './commands/help';
import {CCBot} from './ccbot';

// Not nice.
(commando as any).CommandRegistry = require('discord.js-commando/src/registry');

/**
 * A modified version of the CommandRegistry.
 * 
 * JSON commands are read from the 'commands.json' dynamicData file.
 * Their structure is defined in: data/structures.js
 */
export default class CCBotCommandRegistry extends commando.CommandRegistry {
    client!: CCBot;
    private allJSONCommands: commando.Command[];
    
    constructor(c: CCBot) {
        super(c);
        this.allJSONCommands = [];
        c.dynamicData.commands.onModify(() => {
            this.unloadJSONCommands();
            this.loadJSONCommands();
        });
    }
    registerDefaults(): commando.CommandRegistry {
        super.registerDefaults();
        this.loadJSONCommands();
        return this;
    }
    loadJSONCommands(): void {
        // If running side-by-side, do NOT install JSON commands!
        // These will tend to overlap with the original bot.
        if (this.client.sideBySideProductionSafety)
            return;
        
        // Register JSON commands & groups
        const commands = this.client.dynamicData.commands.data;
        for (const g in commands) {
            if (!this.groups.has(g))
                this.registerGroup(g);
            
            const gcmd: commando.Command = new HelpCommand(this.client, g);
            this.allJSONCommands.push(gcmd);
            this.registerCommand(gcmd);
            
            for (const k in commands[g]) {
                const cmd: commando.Command = new JSONCommand(this.client, g, k, commands[g][k]);
                this.allJSONCommands.push(cmd);
                this.registerCommand(cmd);
            }
        }
    }
    unloadJSONCommands(): void {
        const njc = this.allJSONCommands;
        this.allJSONCommands = [];
        for (const cmd of njc)
            this.unregisterCommand(cmd);
    }
}