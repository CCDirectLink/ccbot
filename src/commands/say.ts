import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {silence} from '../utils';
import {VM, VMContext, runFormat} from '../formatter';
import {getUserDatablock} from '../entities/user-datablock';

export interface SayResult {
    error: boolean;
    text: string;
    opts: discord.MessageOptions;
}

// External interface for cases where we want a "say-like interface" (say, greeting, ...?)
export async function say(code: string, vmContext: VMContext): Promise<SayResult | null> {
    // VM
    let text: string;
    try {
        text = await runFormat(code, new VM(vmContext));
    } catch (ex) {
        return {
            error: true,
            text: '**Formatting error**: `' + ex.toString() + '` (was the code correct?)',
            opts: {}
        };
    }
    // Message Options [
    const opts: discord.MessageOptions = {};
    let hasMeta = false;
    if (vmContext.embed) {
        opts.embed = vmContext.embed;
        hasMeta = true;
    }
    // ]
    if ((text != '') || hasMeta)
        return {
            error: false,
            text: text,
            opts: opts
        };
    return null;
}

/**
 * For ventriloquism.
 */
export default class SayCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: 'say',
            description: 'Has the bot say something. Please see the Format Syntax Guide (.cc -formatter help)',
            group: 'general',
            memberName: 'say',
            args: [
                {
                    key: 'text',
                    prompt: 'The text to say.',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {text: string}): Promise<discord.Message|discord.Message[]> {
        // Bootstrap?
        const bootstrap = (await getUserDatablock(this.client, message.author)).get()['bootstrap'];
        if (bootstrap && (bootstrap.constructor === String))
            args.text = bootstrap + args.text;
        const sayResult = await say(args.text, {
            client: this.client,
            channel: message.channel,
            cause: message.author,
            writer: message.author,
            protectedContent: false,
            args: []
        });
        if (sayResult) {
            // It's important that this *does not* use global in place of the setting in the guild if none exists.
            // By per-guild default say should always have a header.
            const headerless = sayResult.error || this.client.provider.get(message.guild || 'global', 'headerless-say', false);
            if (!headerless) {
                if (message.deletable)
                    silence(message.delete());
                return await message.say('*' + message.author.toString() + ' says:*\n' + sayResult.text, sayResult.opts);
            }
            return await message.say(sayResult.text, sayResult.opts);
        }
        return [];
    }
}
