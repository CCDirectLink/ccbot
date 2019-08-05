import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import {channelAsTBF, randomArrayElement, nsfw, nsfwGuild} from './utils';
import {CCBot, CCBotCommand} from './ccbot';

export type Value = string | ValueX;
interface ValueX extends Array<Value> {}

export type VM = (arg: Value) => Promise<Value>;

type ChannelTBF = discord.Channel & discord.TextBasedChannelFields;

export interface VMContext {
    client: CCBot;
    channel: ChannelTBF;
    // The person whose say- code we are running.
    // Null means it comes from guild settings at some level,
    //  which means it has as much permission as the bot within the guild.
    // If the code is built into the bot, set this on a case by case basis, but "cause" is usually safe.
    writer: discord.User | null;
    cause: discord.User;
    // Keep false by default.
    // Setting to true indicates that this VM has handled content the writer is not trusted with.
    // This prevents untrusted code from causing escalation.
    protectedContent: boolean;
}

const discordMessageLinkURL = /([0-9]+)\/([0-9]+)$/;

/**
 * @param where The channel this is being sent to.
 * @param source The channel the message is being sourced from.
 * @param user A security principal like writer; null is guild-level access (@'where')
 */
function userHasReadAccessToChannel(where: ChannelTBF, source: ChannelTBF, user: discord.User | null): boolean {
    const quoteGuild: discord.Guild | undefined = (source as any).guild;
    if (!user) {
        // Guild access
        const contextGuild: discord.Guild | undefined = (where as any).guild;
        if (contextGuild && (contextGuild === quoteGuild))
            return true;
        return false;
    } else {
        // User access (this one gets complicated)
        // DMs between the user & the bot are always up for grabs
        if (user.dmChannel === source)
            return true;
        // Is it something the user has access to?
        if (quoteGuild) {
            const userAsMember = quoteGuild.members.get(user.id);
            if (userAsMember)
                if (userAsMember.permissionsIn(source).has('READ_MESSAGES'))
                    return true;
        }
        return false;
    }
}

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
            if ((args.length == 2) && ((args[0] == 'quote') || (args[0] == 'quote-cause') || (args[0] == 'quote-silent') || (args[0] == 'quote-silent-cause'))) {
                const components = (args[0] as string).split('-');
                const url = (await vm(args[1])).toString();
                const details = discordMessageLinkURL.exec(url);
                if (!details)
                    return 'Quotation failure. Invalid message link.\n';
                const channel = channelAsTBF(context.client.channels.get(details[1]));
                if (!channel)
                    return 'Quotation failure. Channel ' + details[1] + ' does not exist or is not a text channel.\n';
                // Security check...
                if (!userHasReadAccessToChannel((context.channel as any).guild, channel, context.writer)) {
                    return 'Quotation failure. Writer doesn\'t have access to the message.';
                } else if (components.indexOf('cause') != -1) {
                    if (!userHasReadAccessToChannel((context.channel as any).guild, channel, context.cause))
                        return 'Quotation failure; Writer requested that Cause needs access.';
                }
                try {
                    const message = await channel.fetchMessage(details[2]);
                    
                    // Frankly, expect the escaping here to fail...
                    const escapedContent = '> ' + (message.cleanContent.replace('\n', '\n> ').replace('<@', '\\<@'));
                    const ref = (components.indexOf('silent') != -1) ? message.author.username + '#' + message.author.discriminator : message.author.toString();
                    let text = ref + ' wrote at ' + message.createdAt.toUTCString() + ': \n' + escapedContent + '\n';
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
