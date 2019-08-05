import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localAdminCheck} from '../utils';

// Important (i.e. non-obvious) limits
const limitLocalCommand = 2000;
const limitLocalEmote = 128;
const limitLocalEmotesArray = 2000;
const limitLocalRoleGroup = 2000;

// Local settings control

// Returns null on success.
async function runLocalSettingTransaction(provider: commando.SettingProvider, context: discord.Guild, name: string, value: any): Promise<string | null> {
    let maxLength = 0;
    let doneCallback = async (): Promise<void> => {};
    const startsWithRG = name.startsWith('roles-group-');
    if (name === 'nsfw') {
        if ((value.constructor === Boolean) || (value === undefined))
            maxLength = 16;
    } else if (name === 'optin-roles') {
        if ((value === 'yes') || (value === 'both') || (value === 'no') || (value === undefined))
            maxLength = 16;
    } else if (name === 'greeting') {
        if ((value.constructor === String) || (value === undefined))
            maxLength = limitLocalCommand;
    } else if (name.startsWith('emote-') || startsWithRG) {
        // NOTE: Despite the name of variables here, this gets both emote- and roles-group- items.
        const base = startsWithRG ? 'roles-group-' : 'emote-';
        const arrayName = startsWithRG ? 'roles-groups' : 'emotes';
        const relevantContent = startsWithRG ? Array : String;
        
        let emotesArrayBase: string[] = await provider.get(context, arrayName, []);
        if (emotesArrayBase.constructor !== Array)
            emotesArrayBase = [];
        const emotesArray = emotesArrayBase.concat();
        const emoteName = name.substring(base.length);
        if (value === undefined) {
            // Removal always works
            maxLength = 1;
            const emotesArrayIndex = emotesArray.indexOf(emoteName);
            if (emotesArrayIndex !== -1) {
                emotesArray.splice(emotesArrayIndex, 1);
                doneCallback = async (): Promise<void> => {
                    await provider.set(context, arrayName, emotesArray);
                };
            }
        } else if (value.constructor === relevantContent) {
            // Addition requires doing a sanity length check on the emotes array
            maxLength = startsWithRG ? limitLocalRoleGroup : limitLocalEmote;
            const emotesArrayIndex = emotesArray.indexOf(emoteName);
            if (emotesArrayIndex === -1)
                emotesArray.push(emoteName);
            if (JSON.stringify(emotesArray).length > limitLocalEmotesArray)
                return 'Adding this item would make the items array too long.';
            doneCallback = async (): Promise<void> => {
                await provider.set(context, arrayName, emotesArray);
            };
        }
    } else if ((name === 'roles-exclusive') || (name === 'roles-inclusive') || (name === 'roles-whitelist')) {
        if ((value === undefined) || (value.constructor === Array))
            maxLength = limitLocalRoleGroup;
    }
    if (!maxLength)
        return 'The setting was not recognized. If this setting is readable, keep in mind that some documented settings are automatically maintained.';
    if (value === undefined) {
        await provider.remove(context, name);
    } else {
        if (JSON.stringify(value).length > maxLength)
            return 'The setting is too long.';
        await provider.set(context, name, value);
    }
    await doneCallback();
    return null;
}

/**
 * A command for the local administrator group to configure bot systems.
 */
export class SettingsSetCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util set',
            description: 'Sets a guild-wide (where applicable) or bot-wide (if from a DM) setting.',
            group: 'util',
            memberName: 'set',
            args: [
                {
                    key: 'target',
                    prompt: 'What should be configured?',
                    type: 'string'
                },
                {
                    key: 'value',
                    prompt: 'What value would you like today? (JSON)',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {target: string; value: string}): Promise<discord.Message|discord.Message[]> {
        let effectiveGuild: discord.Guild | undefined = message.guild;
        if (!effectiveGuild) {
            if (!this.client.owners.includes(message.author))
                return message.say('You do not have global settings authorization.');
            await this.client.provider.set('global', args.target, args.value);
            return message.say('Done!');
        } else if (!localAdminCheck(message)) {
            return message.say('You do not have local settings authorization.\nContact someone with global settings authorization if you believe this is a mistake.');
        } else {
            let value;
            try {
                value = JSON.parse(args.value);
            } catch (e) {
                return message.say('Your JSON was incorrect:\n' + e);
            }
            return message.say((await runLocalSettingTransaction(this.client.provider, effectiveGuild, args.target, value)) || 'Successful.');
        }
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
            await this.client.provider.remove(effectiveGuild, args.target);
            return message.say('Done!');
        } else if (!localAdminCheck(message)) {
            return message.say('You do not have local settings authorization.\nContact someone with global settings authorization if you believe this is a mistake.');
        } else {
            return message.say((await runLocalSettingTransaction(this.client.provider, effectiveGuild, args.target, undefined)) || 'Successful.');
        }
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

    public async run(message: commando.CommandMessage, args: {target: string}): Promise<discord.Message|discord.Message[]> {
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
        return message.say('Done: `' + JSON.stringify(val) + '`');
    }
}
