import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {convertRoles, convertRoleGroup, getUserDeniedRoles} from '../role-utils';
import {outputElements} from '../entities/page-switcher';

/**
 * Gets inclusivity/exclusivity group involvement given a target and a role ID list.
 */
function getInvolvement(client: commando.CommandoClient, guild: discord.Guild, groupType: string, involvedIDs: string[]): string[] {
    const involvement: string[] = [];
    const groups: string[] = client.provider.get(guild, 'roles-' + groupType, []);
    for (const v of groups) {
        const roles: string[] = convertRoleGroup(client, guild, v);
        for (const r of involvedIDs) {
            if (roles.includes(r)) {
                involvement.push(v);
                break;
            }
        }
    }
    return involvement;
}

function getWhitelist(client: CCBot, guild: discord.Guild): string[] {
    const whitelistGroups: string[] = client.provider.get(guild, 'roles-whitelist', []);
    const whitelist: string[] = [];
    for (const v of whitelistGroups)
        for (const v2 of convertRoleGroup(client, guild, v))
            whitelist.push(v2);
    return whitelist;
}

/**
 * There's a lot of common stuff this combines into one function.
 * Notably, this assumes that whoever causes this to be run, they are authorized to do so.
 * If this may not be the case, add the checks in the calling function; this function focuses on the logic of the effects.
 */
export async function runRoleCommand(client: CCBot, member: discord.GuildMember, roles: string[], add: boolean): Promise<string> {

    const userRoles = member.roles.keyArray();
    const request = convertRoles(client, member.guild, roles, false);
    if (!request)
        return 'The request contained invalid roles.';

    // -- Check that all roles are allowed --

    const whitelist: string[] = getWhitelist(client, member.guild);
    for (const v of request)
        if (!whitelist.includes(v))
            return 'You don\'t have permission for some of these roles.';
    
    // -- Command action filtration --
    
    const addRoles: string[] = [];
    const removeRoles: string[] = [];
    let primaryRoles: string[];
    if (add) {
        for (const v of request)
            if (!userRoles.includes(v))
                addRoles.push(v);
        primaryRoles = addRoles;
    } else {
        for (const v of request)
            if (userRoles.includes(v))
                removeRoles.push(v);
        primaryRoles = removeRoles;
    }
    
    // -- Involvement processing --

    const involvedGroups = getInvolvement(client, member.guild, add ? 'exclusive' : 'inclusive', primaryRoles);
    for (const groupName of involvedGroups) {
        const groupContent: string[] = convertRoleGroup(client, member.guild, groupName);
        if (add) {
            // If any roles are already active in the group, remove them.
            // This leaves only one role (the one that caused the involvement)
            for (const conflict of groupContent)
                if (userRoles.includes(conflict))
                    removeRoles.push(conflict);
        } else {
            // Need to check that at least one other role of the group is present.
            let ok = false;
            for (const potential of groupContent) {
                if (userRoles.includes(potential)) {
                    if (!removeRoles.includes(potential)) {
                        ok = true;
                        break;
                    }
                }
            }
            if (!ok)
                return 'You need at least one ' + groupName + ' role.';
        }
    }

    // -- Denial checks --

    const denial = getUserDeniedRoles(client, member);
    if (addRoles.filter(v => denial.includes(v)).length > 0)
        return 'Some added roles are denied.';

    // -- Action performance & description --
    
    if (removeRoles.length > 0)
        await member.removeRoles(removeRoles);
    if (addRoles.length > 0)
        await member.addRoles(addRoles);
    
    return 'Done!';
}

async function genericARRunner(message: commando.CommandMessage, args: {roles: string[]}, add: boolean): Promise<discord.Message | discord.Message[]> {
    if (!message.member)
        return message.say('There aren\'t roles in a DM channel.');
    return message.say(await runRoleCommand(message.client as CCBot, message.member, args.roles, add));
}

/**
 * A command for someone to add roles to themselves using the bot.
 */
export class RolesAddCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-roles add',
            description: 'Gives you roles.',
            group: 'roles',
            memberName: 'add',
            args: [
                {
                    key: 'roles',
                    prompt: 'Roles to add?',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {roles: string[]}): Promise<discord.Message|discord.Message[]> {
        return genericARRunner(message, args, true);
    }
}

/**
 * A command for someone to remove roles from themselves using the bot.
 */
export class RolesRmCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-roles rm',
            description: 'Removes roles from you.',
            group: 'roles',
            memberName: 'rm',
            args: [
                {
                    key: 'roles',
                    prompt: 'Roles to remove?',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {roles: string[]}): Promise<discord.Message|discord.Message[]> {
        return genericARRunner(message, args, false);
    }
}


/**
 * A command for someone to remove roles from themselves using the bot.
 */
export class RolesListCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-roles get',
            description: 'Lists all roles.',
            group: 'roles',
            memberName: 'get'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        if (!message.guild)
            return await message.say('You are floating in a void, free, unburdened by any force, not even gravity.\nThus, your roles are what you will them to be.');
        const whitelist = getWhitelist(this.client, message.guild);
        const autorole = convertRoleGroup(this.client, message.guild, 'auto-role');
        const linesInteresting: string[] = [];
        const lines: string[] = [];
        for (const role of message.guild.roles.values()) {
            const caps: string[] = [];
            if (autorole.includes(role.id))
                caps.push('automatic');
            if (whitelist.includes(role.id))
                caps.push('grantable (`-roles add/rm ' + role.name + '`)');
            const inccaps: string[] = getInvolvement(this.client, message.guild, 'inclusive', [role.id]);
            if (inccaps.length != 0)
                caps.push('inclusive (' + inccaps.join() + ')');
            const exccaps: string[] = getInvolvement(this.client, message.guild, 'exclusive', [role.id]);
            if (exccaps.length != 0)
                caps.push('exclusive (' + exccaps.join() + ')');
            (caps.length > 0 ? linesInteresting : lines).push('`' + role.name + '` ' + caps.join())
        }
        return await outputElements(this.client, message, linesInteresting.concat(lines), 10, 2000);
    }
}
