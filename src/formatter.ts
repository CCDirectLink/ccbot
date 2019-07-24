import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import {randomArrayElement} from './utils';
import {CCBot, CCBotCommand} from './ccbot';

export type Value = string | ValueX;
interface ValueX extends Array<Value> {}

export type VM = (arg: Value) => Value;

export interface VMContext {
    client: CCBot;
    channel: discord.Channel & discord.TextBasedChannelFields;
    cause: discord.User;
}

/**
 * Creates the VM for the formatted parts.
 * The VM is essentially LISPy, but keep in mind:
 * The only valid types are strings and lists.
 *
 * WARNING! The VM handles arbitrary guild administrator input.
 * If it didn't, there'd be no point having this layer in the first place.
 * Don't trust it with too much information.
 * If it gets too big, *give it time & memory budgets*.
 * But ideally, just don't let it get to that point...
 */
export function newVM(context: VMContext): VM {
    let vm: VM;
    vm = (arg: Value): Value => {
        if (arg.constructor === Array) {
            const args: ValueX = arg as ValueX;
            if ((args.length == 2) && (args[0] == 'quote'))
                return args[1];
            if ((args.length == 1) && (args[0] == 'prefix'))
                return ((context.channel as any).guild && (context.channel as any).guild.commandPrefix) || context.client.commandPrefix || context.client.user.toString();
            if ((args.length == 1) && (args[0] == 'cause'))
                return context.cause.id;
            if ((args.length == 2) && (args[0] == 'random-element')) {
                // Gets a random element from an array.
                const res = vm(args[1]);
                if (res.constructor === Array)
                    return randomArrayElement(res as Value[]);
                return res;
            }
            if ((args.length == 2) && (args[0] == 'name')) {
                // Determines the local name of someone, if possible.
                const res = vm(args[1]).toString();
                const user = context.client.users.get(res);
                if (!user)
                    return res;
                let nickname = null;
                const guild: discord.Guild | undefined = (context.channel as any).guild;
                if (guild) {
                    const member: discord.GuildMember | undefined = guild.members.get(user.id);
                    if (member)
                        nickname = member.nickname;
                }
                return nickname || user.username || res;
            }
            if ((args.length == 2) && (args[0] == 'emote'))
                return context.client.emoteRegistry.getEmote((context.channel as any).guild || null, vm(args[1]).toString()).toString();
            throw new Error('Unknown format routine / bad parameters. Dump: ' + args.toString());
        }
        // The idea behind this is... to use more LISP ideas, basically.
        // Strings get passed as-is, lists are executed,
        //  but the command *could* perform some other logic instead.
        return arg;
    };
    return vm;
}

/**
 * Runs a line of the bot's format-syntax.
 * Credit for the theory behind the design goes in part to LISP, PHP, and in part to someone else's bot '42'.
 *
 * Essentially, this is like PHP & 42 in operating principles;
 *  without proper encapsulation, text goes to 'standard output'.
 * The return value of the function is the text,
 *  which also makes any formatting directive implicitly usable in other ways if the system gets more complex.
 *
 * The VM within that, above, is LISP-style (different data structure though).
 * 
 * The special sequences are:
 * %: Escape character. Will escape anything, except ( outside of a list system.
 * %%: How to write '%'.
 * %(...):
 *  Execute custom format insertion. The contents of this are a recursive list.
 *  Within this, a separate set of syntax rules are defined.
 *  All that really matters here is that %(emote leaCheese) gives you <:leaCheese:257888171772215296>.
 */
export function runFormat(text: string, runner: VM): string {
    let workspace = '';
    let escapeMode = false;
    // Note: Index 0 here is the innermost (currently-appending-to) list.
    const listStack: Value[][] = [];
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
                if (listCurrentToken.length > 0)
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
