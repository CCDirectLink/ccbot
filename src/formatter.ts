import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import {channelAsTBF, randomArrayElement, nsfw, nsfwGuild} from './utils';
import {CCBot, CCBotCommand} from './ccbot';

export type Value = string | ValueX;
interface ValueX extends Array<Value> {}

export type VM = (arg: Value) => Promise<Value>;

export interface VMContext {
    client: CCBot;
    channel: discord.Channel & discord.TextBasedChannelFields;
    cause: discord.User;
}

const discordMessageLinkURL = /([0-9]+)\/([0-9]+)$/;

/**
 * Creates the VM for the formatted parts.
 * The VM is essentially LISPy, but keep in mind:
 * The only valid types are strings and lists.
 *
 * WARNING! The VM handles arbitrary input from any user.
 * If it didn't, there'd be no point having this layer in the first place.
 * Don't trust it with too much information.
 * If it gets too big, *give it time & memory budgets*.
 * But ideally, just don't let it get to that point...
 */
export function newVM(context: VMContext): VM {
    let vm: VM;
    vm = async (arg: Value): Promise<Value> => {
        if (arg.constructor === Array) {
            const args: ValueX = arg as ValueX;
            if ((args.length == 2) && (args[0] == '\''))
                return args[1];
            if ((args.length == 2) && (args[0] == 'quote')) {
                const url = (await vm(args[1])).toString();
                const details = discordMessageLinkURL.exec(url);
                if (!details)
                    return 'Quotation failure. Invalid message link.\n';
                const channel = channelAsTBF(context.client.channels.get(details[1]));
                if (!channel)
                    return 'Quotation failure. Channel ' + details[1] + ' does not exist or is not a text channel.\n';
                if (channel != context.channel)
                    return 'Quotation failure. Quotes are only allowed from the current channel until the security implications are cleared up.\n';
                try {
                    const message = await channel.fetchMessage(details[2]);
                    
                    // Frankly, expect the escaping here to fail...
                    const escapedContent = '> ' + (message.cleanContent.replace('\n', '\n> ').replace('<@', '\\<@'));
                    let text = message.author.toString() + ' wrote at ' + message.createdAt.toUTCString() + ': \n' + escapedContent + '\n';
                    const additionals: string[] = [];
                    if (message.embeds.length > 0)
                        additionals.push(message.embeds.length + ' embeds');
                    if (message.reactions.size > 0)
                        additionals.push(message.reactions.size + ' reactions');
                    if (additionals.length > 0)
                        text += '(' + additionals.join(', ') + ')';
                    return text;
                } catch (e) {
                    return 'Quotation failure. Message ' + details[2] + ' unavailable.\n';
                }
                return args[1];
            }
            if ((args.length == 1) && (args[0] == 'prefix'))
                return ((context.channel as any).guild && (context.channel as any).guild.commandPrefix) || context.client.commandPrefix || context.client.user.toString();
            if ((args.length == 1) && (args[0] == 'cause'))
                return context.cause.id;
            if ((args.length == 2) && (args[0] == 'random-element')) {
                // Gets a random element from an array.
                const res = await vm(args[1]);
                if (res.constructor === Array)
                    return randomArrayElement(res as Value[]);
                return res;
            }
            if ((args.length == 2) && (args[0] == 'name')) {
                // Determines the local name of someone, if possible.
                const res = (await vm(args[1])).toString();
                const guild: discord.Guild | undefined = (context.channel as any).guild;
                if (guild) {
                    const member: discord.GuildMember | undefined = guild.members.get(res);
                    if (member)
                        return member.nickname || member.user.username || res;
                }
                return res;
            }
            if ((args.length == 2) && (args[0] == 'emote')) {
                const guild: discord.Guild | undefined = (context.channel as any).guild;
                const emote = context.client.emoteRegistry.getEmote(guild || null, (await vm(args[1])).toString());
                if (emote.guild && nsfwGuild(context.client, emote.guild) && !nsfw(context.channel))
                    return '';
                return emote.toString();
            }
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
 *  Any value can be prefixed with ' to wrap it as so: (%' list)
 * /leaCheese/: Shows the leaCheese emote. For compatibility with old .cc say
 * //: Repeated verbatim, escapes text until next space. Used to keep URLs happy
 */
export async function runFormat(text: string, runner: VM): Promise<string> {
    let workspace = '';
    let escapeMode = false;
    let emoteMode: string | null = null;
    let urlMode = false;
    // Note: Index 0 here is the innermost (currently-appending-to) list.
    const listStack: Value[][] = [];
    // Unique reference for unescaped '
    const mySecretQuoteObject: Value[] = [];
    let listCurrentToken = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escapeMode) {
            if (listStack.length > 0) {
                listCurrentToken += ch;
            } else if (emoteMode != null) {
                emoteMode += ch;
            } else if (ch == '(') {
                listStack.unshift([]);
            } else {
                workspace += ch;
            }
            escapeMode = false;
        } else if ((ch == '%') && !urlMode) {
            escapeMode = true;
        } else if (emoteMode != null) {
            if (ch == '/') {
                if (emoteMode == '') {
                    workspace += '//';
                    urlMode = true;
                } else {
                    // Done!
                    workspace += await runner(['emote', emoteMode]);
                }
                emoteMode = null;
            } else {
                emoteMode += ch;
            }
        } else if (listStack.length > 0) {
            if ((ch == '\'') || (ch == ' ') || (ch == '(') || (ch == ')')) {
                // 'Breaking' characters
                if (listCurrentToken.length > 0)
                    listStack[0].push(listCurrentToken);
                listCurrentToken = '';
            }
            if ((ch == '\'') || (ch == '(') || (ch == ')')) {
                // 'Break/Place/Break' characters
                if (ch == '(') {
                    listStack.unshift([]);
                } else if (ch == ')') {
                    // Post-process the list that's being worked on to apply quotes.
                    const list = listStack.shift() as Value[];
                    for (let i = 0; i < list.length; i++) {
                        if (list[i] === mySecretQuoteObject) {
                            list.splice(i, 1);
                            list[i] = ['\'', list[i]];
                            i--;
                        }
                    }
                    if (listStack.length == 0) {
                        workspace += await runner(list);
                    } else {
                        listStack[0].push(list);
                    }
                } else if (ch == '\'') {
                    listStack[0].push(mySecretQuoteObject);
                }
            } else if (ch != ' ') {
                // Normal characters
                listCurrentToken += ch;
            }
        } else if ((ch == '/') && !urlMode) {
            // Entering emote mode
            emoteMode = '';
        } else {
            if (ch == ' ')
                urlMode = false;
            workspace += ch;
        }
    }
    if (emoteMode != null)
        throw new Error('Unterminated Emote (state: ' + emoteMode + ')');
    if (escapeMode)
        throw new Error('Unterminated Escape');
    if (listStack.length)
        throw new Error('Unterminated Invocation');
    // URL mode doesn't go here, it's not a formal body, just a "keep away from this" mechanism
    return workspace;
}
