import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {localAdminCheck} from '../utils';
import {getUserDatablock} from '../entities/user-datablock';

// Important (i.e. non-obvious) limits
const limitLocalCommand = 2000;
const limitLocalEmote = 128;
const limitLocalChannelName = 128;
const limitLocalEmotesArray = 2000;
const limitLocalRoleGroup = 2000;

export enum SettingsOperation {
    Get,
    Set,
    Rm
};

export enum SettingsContext {
    Global,
    Local,
    User
};

// <editor-fold desc="Backend" defaultstate=collapsed>
// Returns null on success.
async function runLocalSettingTransaction(provider: commando.SettingProvider, context: discord.Guild, name: string, value: undefined | string | undefined[]): Promise<string | null> {
    let maxLength = 0;
    let doneCallback = async (): Promise<void> => {};
    const startsWithRG = name.startsWith('roles-group-');
    if (name === 'nsfw') {
        if ((value === undefined) || (value.constructor === Boolean))
            maxLength = 16;
    } else if (name === 'headerless-say') {
        if ((value === undefined) || (value.constructor === Boolean))
            maxLength = 16;
    } else if (name === 'optin-roles') {
        if ((value === undefined) || (value === 'yes') || (value === 'both') || (value === 'no'))
            maxLength = 16;
    } else if (name === 'greeting') {
        if ((value === undefined) || (value.constructor === String))
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
    } else if ((name === 'channel-greet') || (name === 'channel-info') || (name === 'channel-syslog') || (name === 'channel-editlog')) {
        if ((value === undefined) || (value.constructor === String))
            maxLength = limitLocalChannelName;
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

function isAuthorized(message: commando.CommandMessage, operation: SettingsOperation, context: SettingsContext, contextInstance: string): boolean {
    // Validate instance
    if ((context == SettingsContext.Global) && (contextInstance != 'global'))
        return false;
    if ((context == SettingsContext.Local) && (!message.client.guilds.has(contextInstance)))
        return false;
    if ((context == SettingsContext.User) && (!message.client.users.has(contextInstance)))
        return false;
    // Authorized?
    if (message.client.isOwner(message.author))
        return true;
    if (context == SettingsContext.Local) {
        if (!message.guild)
            return false;
        if (!localAdminCheck(message))
            return false;
        if (contextInstance != message.guild.id)
            return false;
        return true;
    } else if (context == SettingsContext.User) {
        return message.author.id == contextInstance;
    } else {
        // Also covers Global (which has no access except for owner) so do not make true by default
        return false;
    }
}
// </editor-fold>

/**
 * A command to configure bot systems.
 */
export class SettingsCommand extends CCBotCommand {
    public readonly operation: SettingsOperation;
    public readonly context: SettingsContext;
    public constructor(client: CCBot, op: SettingsOperation, target: SettingsContext) {
        const localName = SettingsOperation[op].toLowerCase() + '-' + SettingsContext[target].toLowerCase();
        const opt = {
            name: '-util ' + localName,
            description: SettingsOperation[op] + ' ' + SettingsContext[target].toLowerCase() + ' setting.',
            group: 'util',
            memberName: localName,
            args: [
                {
                    key: 'key',
                    prompt: 'Which setting?',
                    type: 'string'
                }
            ]
        };
        if (op == SettingsOperation.Set) {
            opt.args.push({
                key: 'value',
                prompt: 'What value would you like today? (JSON)',
                type: 'string'
            })
        }
        super(client, opt);
        this.operation = op;
        this.context = target;
    }

    public async run(message: commando.CommandMessage, args: {key: string; value: string}): Promise<discord.Message|discord.Message[]> {
        let instance = '';
        if (this.context === SettingsContext.Global) {
            instance = 'global';
        } else if (this.context === SettingsContext.Local) {
            if (message.guild) {
                instance = message.guild.id;
            } else {
                return message.say('No local guild.');
            }
        } else if (this.context === SettingsContext.User) {
            instance = message.author.id;
        }

        if (!isAuthorized(message, this.operation, this.context, instance))
            return message.say('You aren\'t authorized to do that.');

        let value = undefined;
        if (this.operation == SettingsOperation.Get) {
            // Reading
            if ((this.context == SettingsContext.Global) || (this.context == SettingsContext.Local)) {
                // This relies on instance === 'global' for Global context.
                // Essentially, if not for runLocalSettingTransaction,
                //  both local & global contexts would use the same code
                value = this.client.provider.get(instance, args.key);
            } else if (this.context == SettingsContext.User) {
                const dbl = await getUserDatablock(this.client, instance);
                value = dbl.get()[args.key];
            }
            if (value === undefined)
                return message.say('That value does not exist.');
            return message.say('Done: `' + JSON.stringify(value) + '`');
        } else {
            // Writing
            if (this.operation == SettingsOperation.Set) {
                try {
                    value = JSON.parse(args.value);
                } catch (e) {
                    return message.say('Your JSON was incorrect:\n' + e);
                }
            }
            if (this.context == SettingsContext.Global) {
                await this.client.provider.set('global', args.key, value);
                return message.say('Done!');
            } else if (this.context == SettingsContext.Local) {
                const guild = this.client.guilds.get(instance);
                if (!guild)
                    return message.say('How\'d you get here, then?');
                return message.say((await runLocalSettingTransaction(this.client.provider, guild, args.key, value)) || 'Successful.');
            } else if (this.context == SettingsContext.User) {
                const dbl = await getUserDatablock(this.client, instance);
                const db = dbl.get();
                db[args.key] = value;
                dbl.set(db);
                return message.say('Done!');
            }
        }
        return message.say('Unable to handle the specified request.');
    }
}

/**
 * A command to configure bot systems.
 */
export class ShowUserSettingsCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util show-user-settings',
            description: 'Show the entire contents of your user settings datablock.',
            group: 'util',
            memberName: 'show-user-settings'
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {key: string; value: string}): Promise<discord.Message|discord.Message[]> {
        const res = (await getUserDatablock(this.client, message.author)).content;
        return message.embed(new discord.RichEmbed({
            description: '```json\n' + res + '\n```'
        }));
    }
}