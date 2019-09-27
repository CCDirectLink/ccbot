import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';

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
