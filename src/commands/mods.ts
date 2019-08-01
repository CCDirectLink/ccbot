import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {ModDatabaseEntity} from '../entities/mod-database';
import {ModPage, Mod, ModsIndex} from '../data/structures';
import {outputElements} from '../entities/page-switcher';

/**
 * Gets a list of mods.
 */
export class ModsGetCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-mods get',
            description: 'Gets a list of the available mods.',
            group: 'mods',
            memberName: 'get'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        if ('mod-database-manager' in this.client.entities.entities) {
            const modDB: ModDatabaseEntity = this.client.entities.entities['mod-database-manager'] as ModDatabaseEntity;
            if (modDB.database === null) {
                let possibleError = '';
                if (modDB.lastError)
                    possibleError += '\n' + modDB.lastError.name + ': ' + modDB.lastError.message + '\n' + (modDB.lastError.stack || 'no stack');
                return await message.embed({
                    'description': 'Mod information isn\'t available (has the bot just started up? is the modlist updater dead?).\nPlease see the CCDirectLink website for more information: https://c2dl.info/cc/mods' + possibleError
                });
            } else {
                const mods: string[] = [];
                const modIndex: ModsIndex = modDB.database;
                for (const id in modIndex.mods) {
                    const mod: Mod = modIndex.mods[id];
                    const components: string[] = [`${mod.name} ${mod.version}`];
                    if (mod.license)
                        components.push('License: ' + mod.license);
                    for (const page of mod.page)
                        components.push(`[View on ${page.name}](${page.url})`);
                    components.push('');
                    mods.push(components.join('\n'));
                }
                return outputElements(this.client, message, mods, 25, 2000, {
                    textFooter: '\nNote: All mods require a mod loader to work. (See `-mods installation` for details.)',
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
