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
import * as structures from './data/structures';
import JSONCommand from './commands/json';
import {DynamicData} from './dynamic-data';

/// The setting bindings are *in the provider* for some reason.
/// This fixes SettingProvider to handle this properly.
class SaneSettingProvider extends commando.SettingProvider {
    public client!: commando.CommandoClient;

    private listenerCommandPrefixChange: (guild: discord.Guild | string, value: string) => void;
    private listenerCommandStatusChange: (guild: discord.Guild | string, group: commando.Command, enabled: boolean) => void;
    private listenerGroupStatusChange: (guild: discord.Guild | string, group: commando.CommandGroup, enabled: boolean) => void;
    private listenerReloadSettings: () => void;

    constructor() {
        super();
        this.listenerCommandPrefixChange = (guild: discord.Guild | string, value: string) => {
            this.set(guild, 'prefix', value);
        };
        this.listenerCommandStatusChange = (guild: discord.Guild | string, group: commando.Command, enabled: boolean) => {
            this.set(guild, 'cmd-' + group.groupID + '-' + group.memberName, enabled);
        };
        this.listenerGroupStatusChange = (guild: discord.Guild | string, group: commando.CommandGroup, enabled: boolean) => {
            this.set(guild, 'grp-' + group.id, enabled);
        };
        this.listenerReloadSettings = () => {
            this.reloadSettings();
        };
    }

    /// Pokes the awful internals because setEnabledIn fails for reasons
    private reloadSettings(): void {
        // -- Prefixes
        this.client.commandPrefix = this.get('global', 'prefix', this.client.commandPrefix).toString();
        for (const vb of this.client.guilds.values())
            (vb as any).commandPrefix = this.get(vb, 'prefix', null);
        // -- Groups
        for (const v of this.client.registry.groups.values()) {
            const settingName = 'grp-' + v.id;
            const vd: any = v;
            vd._globalEnabled = this.get('global', settingName, true);
            for (const vb of this.client.guilds.values()) {
                const vc: any = vb;
                // Oh dear goodness.
                vc._groupsEnabled = vc._groupsEnabled || {};
                const int = this.get(vb, settingName, undefined);
                if (int !== undefined)
                    vc._groupsEnabled[v.name] = Boolean(int);
            }
        }
        // -- Commands
        for (const v of this.client.registry.commands.values()) {
            const settingName = 'cmd-' + v.groupID + '-' + v.memberName;
            const vd: any = v;
            vd._globalEnabled = this.get('global', settingName, true);
            for (const vb of this.client.guilds.values()) {
                const vc: any = vb;
                // Oh dear goodness.
                vc._commandsEnabled = vc._commandsEnabled || {};
                const int = this.get(vb, settingName, undefined);
                if (int !== undefined)
                    vc._commandsEnabled[v.name] = Boolean(int);
            }
        }
    }

    async init(client: commando.CommandoClient): Promise<void> {
        this.client = client;
        this.listenerReloadSettings();
        client.on('commandPrefixChange', this.listenerCommandPrefixChange);
        client.on('commandStatusChange', this.listenerCommandStatusChange);
        client.on('groupStatusChange', this.listenerGroupStatusChange);
        client.on('guildCreate', this.listenerReloadSettings);
        client.on('commandRegister', this.listenerReloadSettings);
        client.on('groupRegister', this.listenerReloadSettings);
    }

    async destroy(): Promise<void> {
        this.client.removeListener('commandPrefixChange', this.listenerCommandPrefixChange);
        this.client.removeListener('commandStatusChange', this.listenerCommandStatusChange);
        this.client.removeListener('groupStatusChange', this.listenerGroupStatusChange);
        this.client.removeListener('guildCreate', this.listenerReloadSettings);
        this.client.removeListener('commandRegister', this.listenerReloadSettings);
        this.client.removeListener('groupRegister', this.listenerReloadSettings);
    }
}

/// A modified version of the CommandDispatcher.
class CCBotSettingProvider extends SaneSettingProvider {
    public readonly data: DynamicData<structures.GuildIndex>;

    constructor(d: DynamicData<structures.GuildIndex>) {
        super();
        this.data = d;
    }

    async init(client: commando.CommandoClient): Promise<void> {
        await this.data.initialLoad;
        await super.init(client);
    }

    async destroy(): Promise<void> {
        await super.destroy();
    }

    get(guild: discord.Guild | string, key: string, def: any): any {
        const id: string = commando.SettingProvider.getGuildID(guild);
        const guildObj = this.data.data[id];
        if (!guildObj)
            return def;
        if (!(key in guildObj))
            return def;
        return guildObj[key];
    }

    async set(guild: discord.Guild | string, key: string, val: any): Promise<any> {
        const id: string = commando.SettingProvider.getGuildID(guild);
        await this.data.modify((t: structures.GuildIndex) => {
            t[id] = t[id] || {};
            t[id][key] = val;
        });
        return val;
    }

    async remove(guild: discord.Guild | string, key: string): Promise<any> {
        const value = this.get(guild, key, undefined);
        const id: string = commando.SettingProvider.getGuildID(guild);
        await this.data.modify((t: structures.GuildIndex) => {
            if (t[id])
                delete t[id][key];
        });
        return value;
    }

    clear(guild: discord.Guild | string): Promise<void> {
        const id: string = commando.SettingProvider.getGuildID(guild);
        return this.data.modify((t: structures.GuildIndex) => {
            delete t[id];
        });
    }
}

export default CCBotSettingProvider as any;
