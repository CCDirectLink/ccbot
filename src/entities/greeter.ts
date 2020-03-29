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
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {getGuildTextChannel, silence} from '../utils';
import {convertRoleGroup, getUserDeniedRoles} from '../role-utils';
import {say} from '../commands/say';

/**
 * Implements greetings and automatic role assignment.
 */
class GreeterEntity extends CCBotEntity {
    private memberListener: (m: discord.GuildMember) => void;
    private memberUpdateListener: (a: discord.GuildMember, b: discord.GuildMember) => void;

    public constructor(c: CCBot, data: EntityData) {
        super(c, 'greeter-manager', data);
        this.memberListener = (m: discord.GuildMember): void => {
            if (this.killed)
                return;
            const channel = getGuildTextChannel(c, m.guild, 'greet');
            if (channel) {
                const greeting = c.provider.get(m.guild, 'greeting');
                if (greeting) {
                    silence((async (): Promise<void> => {
                        const result = await say(greeting, {
                            client: c,
                            channel: channel,
                            cause: m.user,
                            writer: null,
                            protectedContent: false,
                            args: []
                        })
                        if (result)
                            channel.send(result.text, result.opts);
                    })());
                }
            }
            const denied = getUserDeniedRoles(this.client, m);
            const allAutoRoles: string[] = convertRoleGroup(c, m.guild, 'auto-role').concat(convertRoleGroup(c, m.guild, 'auto-user-' + m.id));
            // Check for explicitly denied roles here to avoid infighting
            const addRoles: string[] = allAutoRoles.filter((v: string): boolean => !denied.includes(v));
            if (addRoles.length > 0)
                silence(m.addRoles(addRoles));
        };
        this.memberUpdateListener = (_: discord.GuildMember, m: discord.GuildMember): void => {
            if (this.killed)
                return;
            const denied = getUserDeniedRoles(this.client, m);
            const rmRoles = m.roles.keyArray().filter((v: string): boolean => denied.includes(v));
            if (rmRoles.length > 0)
                silence(m.removeRoles(rmRoles));
        };
        this.client.on('guildMemberAdd', this.memberListener);
        this.client.on('guildMemberUpdate', this.memberUpdateListener);
    }

    public onKill(transferOwnership: boolean): void {
        super.onKill(transferOwnership);
        this.client.removeListener('guildMemberAdd', this.memberListener);
        this.client.removeListener('guildMemberUpdate', this.memberUpdateListener);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new GreeterEntity(c, data);
}
