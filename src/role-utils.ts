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
import {localAdminCheck} from './utils';

/**
 * Retrieves and converts a role group to role IDs.
 */
export function convertRoleGroup(client: commando.CommandoClient, guild: discord.Guild, text: string): string[] {
    return convertRoles(client, guild, client.provider.get(guild, 'roles-group-' + text, []), true) as string[];
}

/**
 * Converts role names to role IDs.
 */
export function convertRoles(client: commando.CommandoClient, guild: discord.Guild, src: string[], permissive: boolean): string[] | null {
    const roleIDs: string[] = [];
    for (const v of src) {
        const vr = guild.roles.find((r: discord.Role): boolean => {
            return r.name == v;
        });
        if (vr) {
            roleIDs.push(vr.id);
        } else if (!permissive) {
            return null;
        }
    }
    return roleIDs;
}

/**
 * Gets the list of roles denied to a user.
 * This is ultimate-level authority, even above administrators to an extent (as they can change the settings)
 */
export function getUserDeniedRoles(client: commando.CommandoClient, member: discord.GuildMember): string[] {
    const denial = convertRoleGroup(client, member.guild, 'deny-role');
    for (let s of convertRoleGroup(client, member.guild, 'deny-user-' + member.id))
        denial.push(s);
    for (let s of convertRoleGroup(client, member.guild, 'allow-user-' + member.id)) {
        let idx: number;
        while ((idx = denial.indexOf(s)) != -1)
            denial.splice(idx, 1);
    }
    return denial;
}

/**
 * Performs: localAdminCheck OR (HAS ALL OF enablingPermissions) OR (HAS A ROLE IN enablingRoleGroup)
 */
export function localRPCheck(message: commando.CommandMessage, enablingPermissions: string[], enablingRoleGroup: string): boolean {
    if (localAdminCheck(message))
        return true;
    if (message.member) {
        for (const role of convertRoleGroup(message.client, message.member.guild, enablingRoleGroup))
            if (message.member.roles.has(role))
                return true;
        // Last chance, so return false if this fails
        for (const permission of enablingPermissions)
            if (!message.member.hasPermission(permission as discord.PermissionResolvable))
                return false;
    }
    return false;
}
