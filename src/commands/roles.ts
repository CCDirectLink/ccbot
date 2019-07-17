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

    const userRoles = message.member.roles.keyArray();
    const request = convertRoles(message.client, message.guild, args.roles, false);
    if (!request)
        return message.say('The request contained invalid roles.');
    const whitelist = convertRoleGroup(message.client, message.guild, 'self-serve');
    for (const v of request)
        if (!whitelist.includes(v))
            return message.say('You don\'t have permission for some of these roles.');
    
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

    const involvedGroups = getInvolvement(message.client, message.guild, add ? 'exclusive' : 'inclusive', primaryRoles);
    for (const groupName of involvedGroups) {
        const groupContent: string[] = convertRoleGroup(message.client, message.guild, groupName);
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
                return message.say('You need at least one ' + groupName + ' role.');
        }
    }
    
    // -- Action performance & description --
    
    if (removeRoles.length > 0)
        await message.member.removeRoles(removeRoles);
    if (addRoles.length > 0)
        await message.member.addRoles(addRoles);
    
    return message.say('Done!');
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
