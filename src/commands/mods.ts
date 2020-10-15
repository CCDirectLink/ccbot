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
import {CCBot, CCBotCommand} from '../ccbot';
import {ModlikeDatabaseEntity} from '../entities/mod-database';
import {Modlike, ModlikeIndex} from '../data/structures';
import {outputElements} from '../entities/page-switcher';

/// Gets a list of mods.
export class ModsToolsGetCommand extends CCBotCommand {
    public readonly tools: boolean;
    public constructor(client: CCBot, group: string, name: string, tools: boolean) {
        const opt = {
            name: `-${group} ${name}`,
            description: !tools ? 'Gets a list of the available mods.' : 'Gets a list of the available tools.',
            group: group,
            memberName: name
        };
        super(client, opt);
        this.tools = tools;
    }

    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        const entityName = !this.tools ? 'mod-database-manager' : 'tool-database-manager';
        if (entityName in this.client.entities.entities) {
            const modDB = this.client.entities.entities[entityName] as ModlikeDatabaseEntity<unknown>;
            if (modDB.database === null) {
                let possibleError = '';
                if (modDB.lastError)
                    possibleError += `\n${modDB.lastError.name}: ${modDB.lastError.message}\n${modDB.lastError.stack || 'no stack'}`;
                return await message.embed({
                    'description': `Mod information isn't available (has the bot just started up? is the modlist updater dead?).\nPlease see the CCDirectLink website for more information: https://c2dl.info/cc/mods${  possibleError}`
                });
            } else {
                const mods: string[] = [];
                const modIndex: ModlikeIndex = modDB.database;
                for (const id in modIndex) {
                    const mod: Modlike = modIndex[id];
                    const components: string[] = [`**${mod.name} (${mod.version})**`];
                    if (mod.description) components.push(mod.description);
                    for (const page of mod.page) components.push(`[View on ${page.name}](${page.url})`);
                    components.push('');
                    mods.push(components.join('\n'));
                }
                const footer = !this.tools ? '\nNote: All mods require a mod loader to work. (See `.cc installing-mods` for details.)' : '\nNote: Tools require their own installation procedures. Check their pages for details.';
                return outputElements(this.client, message, mods, 25, 2000, {
                    textFooter: footer,
                    footer: {
                        text: 'From CCModDB'
                    }
                });
            }
        }
        return await message.embed({
            'description': `ooo! you haven't added the initial entities! (no ${entityName})`
        });
    }
}
