import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from '../data/structures';
import {nsfw} from '../utils';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Runs a line of the bot's format-syntax.
 * Credit for the theory behind the design goes in part to LISP, and in part to someone else's bot '42'
 * 
 * The special sequences are:
 * %: Escape character. Will escape anything, except ( outside of a list system.
 * %%: How to write '%'.
 * %(...):
 *  Execute custom format insertion. The contents of this are a recursive list.
 *  Within this, a separate set of syntax rules are defined.
 *  All that really matters here is that %(emote leaCheese) gives you <:leaCheese:257888171772215296>.
 */
function runFormat(client: CCBot, text: string, runner: (args: (string | object)[]) => string): string {
    let workspace = '';
    let escapeMode = false;
    // Note: Index 0 here is the innermost (currently-appending-to) list.
    const listStack: (string | object)[][] = [];
    let listCurrentToken = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escapeMode) {
            if (listStack.length > 0) {
                listCurrentToken += ch;
            } else if (ch == '(') {
                listStack.unshift([]);
            } else {
                workspace += ch;
            }
            escapeMode = false;
        } else if (ch == '%') {
            escapeMode = true;
        } else if (listStack.length > 0) {
            if ((ch == ' ') || (ch == '(') || (ch == ')')) {
                // 'Breaking' characters
                listStack[0].push(listCurrentToken);
                listCurrentToken = '';
            }
            if ((ch == '(') || (ch == ')')) {
                // 'Break/Place/Break' characters
                if (ch == '(') {
                    listStack.unshift([]);
                } else {
                    if (listStack.length == 1) {
                        workspace += runner(listStack[0]);
                        listStack.shift();
                    } else {
                        listStack[1].push(listStack[0]);
                        listStack.shift();
                    }
                }
            } else if (ch != ' ') {
                // Normal characters
                listCurrentToken += ch;
            }
        } else {
            workspace += ch;
        }
    }
    return workspace;
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
        if (json.options)
            Object.assign(opt, json.options);
        super(client, opt);
        this.command = json;
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        if (this.command.nsfw && !nsfw(message.channel))
            return await message.say('That command is NSFW, and this is not an NSFW channel.');
        // Message Options
        const opts: discord.MessageOptions = {};
        let hasMeta = false;
        if (this.command.embed) {
            opts.embed = this.command.embed;
            hasMeta = true;
        }
        // Side-effects (reacts)
        if (this.command.commandReactions)
            for (const react of this.command.commandReactions)
                await message.react(react);
        // Actually send resulting message if necessary
        // Note that the syntax handling here may have to be moved out to a separate module at some point.
        if (this.command.format || hasMeta)
            return await message.say(runFormat(this.client, this.command.format || '', (args: (string | object)[]): string => {
                if ((args.length == 2) && (args[0] == 'emote'))
                    return this.client.getEmote(message.guild || null, args[1].toString()).toString();
                throw new Error('Unknown format routine.');
            }), opts);
        return [];
    }
}
