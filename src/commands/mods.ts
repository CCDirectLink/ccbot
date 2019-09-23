import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {ModlikeDatabaseEntity} from '../entities/mod-database';
import {Mod, ModsIndex, ToolsIndex} from '../data/structures';
import {outputElements} from '../entities/page-switcher';

/**
 * Gets a list of mods.
 */
export class ModsToolsGetCommand extends CCBotCommand {
    public readonly tools: boolean;
    public constructor(client: CCBot, tools: boolean) {
        const opt = !tools ? {
            name: '-mods get',
            description: 'Gets a list of the available mods.',
            group: 'mods',
            memberName: 'get'
        } : {
            name: '-tools get',
            description: 'Gets a list of the available mods.',
            group: 'tools',
            memberName: 'get'
        };
        super(client, opt);
        this.tools = tools;
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        const entityName = !this.tools ? 'mod-database-manager' : 'tool-database-manager';
        if (entityName in this.client.entities.entities) {
            const modDB: ModlikeDatabaseEntity<{}> = this.client.entities.entities[entityName] as ModlikeDatabaseEntity<{}>;
            if (modDB.database === null) {
                let possibleError = '';
                if (modDB.lastError)
                    possibleError += '\n' + modDB.lastError.name + ': ' + modDB.lastError.message + '\n' + (modDB.lastError.stack || 'no stack');
                return await message.embed({
                    'description': 'Mod information isn\'t available (has the bot just started up? is the modlist updater dead?).\nPlease see the CCDirectLink website for more information: https://c2dl.info/cc/mods' + possibleError
                });
            } else {
                const mods: string[] = [];
                let modIndex: {[name: string]: Mod};
                if (!this.tools) {
                    modIndex = (modDB.database as ModsIndex).mods;
                } else {
                    modIndex = (modDB.database as ToolsIndex).tools;
                }
                for (const id in modIndex) {
                    const mod: Mod = modIndex[id];
                    const components: string[] = [`**${mod.name} (${mod.version})**`];
                    if (mod.license)
                        components.push('License: ' + mod.license);
                    for (const page of mod.page)
                        components.push(`[View on ${page.name}](${page.url})`);
                    components.push('');
                    mods.push(components.join('\n'));
                }
                const footer = !this.tools ? '\nNote: All mods require a mod loader to work. (See `-mods installation` for details.)' : '\nNote: Tools may have their own installation procedures. Check their pages for details.';
                return outputElements(this.client, message, mods, 25, 2000, {
                    textFooter: footer,
                    footer: {
                        text: 'From CCModDB'
                    }
                });
            }
        }
        return await message.embed({
            'description': 'ooo! you haven\'t added the initial entities! (no mod-database-manager)'
        });
    }
}
