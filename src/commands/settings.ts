import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {convertRoles, convertRoleGroup, getInvolvement, localAdminCheck} from '../utils';

/**
 * A command for the local administrator group to configure bot systems.
 */
export class SettingsSetCommand extends CCBotCommand {
    public constructor(client: CCBot, typeName: string, typeDetails: commando.ArgumentInfo) {
        const opt = {
            name: '-util set-' + typeName,
            description: 'Sets a guild-wide (where applicable) or bot-wide (if from a DM) ' + typeName + '.',
            group: 'util',
            memberName: 'set-' + typeName,
            args: [
                {
                    key: 'target',
                    prompt: 'What should be configured?',
                    type: 'string'
                },
                typeDetails
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {target: string; value: any}): Promise<discord.Message|discord.Message[]> {
        let effectiveGuild: 'global' | discord.Guild = message.guild;
        if (!effectiveGuild) {
            effectiveGuild = 'global';
            if (!this.client.owners.includes(message.author))
                return message.say('You do not have global settings authorization.');
        } else if (!localAdminCheck(message)) {
            return message.say('You do not have local settings authorization.\nContact someone with global settings authorization if you believe this is a mistake.');
        }
        await this.client.provider.set(effectiveGuild, args.target, args.value);
        return message.say('Done!');
    }
}

/**
 * A command for the local administrator group to configure bot systems.
 */
export class SettingsRmCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util rm',
            description: 'Removes a guild-wide (where applicable) or bot-wide (if from a DM) setting.',
            group: 'util',
            memberName: 'rm',
            args: [
                {
                    key: 'target',
                    prompt: 'What should be configured?',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {target: string}): Promise<discord.Message|discord.Message[]> {
        let effectiveGuild: 'global' | discord.Guild = message.guild;
        if (!effectiveGuild) {
            effectiveGuild = 'global';
            if (!this.client.owners.includes(message.author))
                return message.say('You do not have global settings authorization.');
        } else if (!localAdminCheck(message)) {
            return message.say('You do not have local settings authorization.\nContact someone with global settings authorization if you believe this is a mistake.');
        }
        await this.client.provider.remove(effectiveGuild, args.target);
        return message.say('Done!');
    }
}

/**
 * A command for the local administrator group to configure bot systems.
 */
export class SettingsGetCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util get',
            description: 'Gets a guild-wide (where applicable) or bot-wide (if from a DM) setting.',
            group: 'util',
            memberName: 'get',
            args: [
                {
                    key: 'target',
                    prompt: 'What should be read?',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {target: string;}): Promise<discord.Message|discord.Message[]> {
        let effectiveGuild: 'global' | discord.Guild = message.guild;
        if (!effectiveGuild) {
            effectiveGuild = 'global';
            if (!this.client.owners.includes(message.author))
                return message.say('You do not have global settings authorization.');
        } else if (!localAdminCheck(message)) {
            return message.say('You do not have local settings authorization.\nContact someone with global settings authorization if you believe this is a mistake.');
        }
        const val = await this.client.provider.get(effectiveGuild, args.target);
        if (val == undefined)
            return message.say('That setting is not defined.');
        return message.say('Done: `' + JSON.stringify(val) + "`");
    }
}
