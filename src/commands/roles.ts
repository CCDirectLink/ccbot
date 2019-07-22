import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {convertRoles, convertRoleGroup, getInvolvement} from '../utils';

/**
 * There's a lot of common stuff this combines into one function.
 */
async function genericARRunner(message: commando.CommandMessage, args: {roles: string[]}, add: boolean): Promise<discord.Message | discord.Message[]> {
    if (!message.member)
        return message.say('There aren\'t roles in a DM channel.');
    return message.say(await runRoleCommand(message.client as CCBot, message.member, args.roles, add));
}
export async function runRoleCommand(client: CCBot, member: discord.GuildMember, roles: string[], add: boolean): Promise<string> {

    const userRoles = member.roles.keyArray();
    const request = convertRoles(client, member.guild, roles, false);
    if (!request)
        return 'The request contained invalid roles.';

    // -- Check that all roles are allowed --

    const whitelistGroups: string[] = client.provider.get(member.guild, 'roles-whitelist', []);
    const whitelist: string[] = [];
    for (const v of whitelistGroups)
        for (const v2 of convertRoleGroup(client, member.guild, v))
            whitelist.push(v2);
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
    
    // -- Action performance & description --
    
    if (removeRoles.length > 0)
        await member.removeRoles(removeRoles);
    if (addRoles.length > 0)
        await member.addRoles(addRoles);
    
    return 'Done!';
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
