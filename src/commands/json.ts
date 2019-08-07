import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from '../data/structures';
import {nsfw} from '../utils';
import {CCBot, CCBotCommand} from '../ccbot';
import {VM, VMContext, runFormat} from '../formatter';

/**
 * Copies an object while also formatting it.
 * Don't ask me how the type conversions are supposed to make sense.
 * They don't.
 */
async function copyAndFormat(vm: VM, embed: string | {[k: string]: string | object | number | undefined}): Promise<string | object> {
    if (embed.constructor == String)
        return await runFormat(embed as string, vm);
    if (embed.constructor == Object) {
        const embobj = embed as {[k: string]: string | {[k: string]: string | object}};
        const o: {[k: string]: string | object} = {};
        for (const k in embobj)
            o[k] = await copyAndFormat(vm, embobj[k]);
        return o;
    }
    return embed;
}

/**
 * A JSON-run "command", but really more like a responder.
 * For format details, please see the structures file.
 */
export default class JSONCommand extends CCBotCommand {
    // The JSON command structure.
    private readonly command: structures.Command;
    
    public constructor(client: CCBot, group: string, name: string, json: structures.Command) {
        const opt = {
            name: '-' + group.toLowerCase() + ' ' + name.toLowerCase(),
            description: json.description || 'No description.',
            group: group.toLowerCase(),
            memberName: name.toLowerCase()
        };
        // Allows overriding the involved Commando options.
        // This includes adding arguments.
        if (json.options)
            Object.assign(opt, json.options);
        super(client, opt);
        this.command = json;
    }
    
    public async run(message: commando.CommandMessage, args: {args: string[]}): Promise<discord.Message|discord.Message[]> {
        if (this.command.nsfw && !nsfw(message.channel))
            return await message.say('That command is NSFW, and this is not an NSFW channel.');
        const vmContext: VMContext = {
            client: this.client,
            channel: message.channel,
            cause: message.author,
            // JSON commands are always part of the bot (for now)
            writer: message.author,
            protectedContent: false,
            args: []
        };
        if (args && args.args) {
            if (args.args.constructor === Array) {
                vmContext.args = args.args;
            } else {
                vmContext.args = [args.args.toString()];
            }
        }
        for (const arg of vmContext.args)
            if (arg.constructor !== String)
                return await message.say('That command can only eat strings, but it was given non-strings.');
        const vm = new VM(vmContext);
        const formatText = await runFormat(this.command.format || '', vm);

        // Message Options
        const opts: discord.MessageOptions = {};
        let hasMeta = false;
        if (this.command.embed) {
            opts.embed = await copyAndFormat(vm, this.command.embed) as object;
            hasMeta = true;
        }

        // Side-effects (reacts)
        if (this.command.commandReactions)
            for (const react of this.command.commandReactions)
                await message.react(this.client.emoteRegistry.getEmote(message.guild || null, react));

        // Actually send resulting message if necessary
        if (this.command.format || hasMeta)
            return await message.say(formatText, opts);
        return [];
    }
}
