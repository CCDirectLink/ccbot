import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {safeParseInt, findMemberByRef, channelAsTBF, nsfw, nsfwGuild} from './utils';
import {CCBot} from './ccbot';

const vmMaxTime = 1024;
const vmEvalTime = 16;
const vmQuoteTime = 128;
const vmFindUserTime = 128;
const vmSetTime = 16;
const vmConcatCharacterTime = 1;
const vmMaxAnythingLength = 2048;

export type Value = string | ValueX;
interface ValueX extends Array<Value> {}
export const lispT: string = "t";

export type VMFunction = (arg: Value[], scope: VMScope) => Promise<Value>;

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
    args: Value[];
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
 * Scoping. Not actually used but kept in for safety purposes...
 */
export class VMScope {
    public readonly vm: VM;
    public readonly parent: VMScope | null;
    public readonly functions: Map<String, VMFunction> = new Map();
    
    public constructor(vm: VM, parent: VMScope | null) {
        this.vm = vm;
        this.parent = parent;
    }
    public extend(): VMScope {
        return new VMScope(this.vm, this);
    }
    public getFunction(name: string): VMFunction | null {
        const fun = this.functions.get(name);
        if (fun)
            return fun;
        if (this.parent)
            return this.parent.getFunction(name);
        return null;
    }
    public addFunction(name: string, value: VMFunction, local: boolean): void {
        if (this.parent && (!local) && (!this.functions.has(name))) {
            this.parent.addFunction(name, value, local);
        } else {
            this.functions.set(name, value);
        }
    }
    // Set & defun, the scope manipulation functions
    public set(name: string, val: Value, local: boolean): void {
        this.addFunction(name, async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 1)
                throw new Error('Cannot supply arguments to ' + name + ' (set)');
            return val;
        }, local);
    }
    public defun(name: string, variables: string[], code: Value, local: boolean): void {
        // Note that all processing happens later.
        const val: VMFunction = async (args: Value[], callerScope: VMScope): Promise<Value> => {
            if (variables.length != (args.length - 1))
                throw new Error('Incorrect form for defun\'d ' + name);
            const runScope = this.extend();
            for (let i = 0; i < variables.length; i++)
                runScope.set(variables[i], await this.vm.eval(args[i + 1], callerScope), true);
            return this.vm.eval(code, runScope);
        };
        this.addFunction(name, val, local);
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
export class VM {
    public readonly context: VMContext;
    public time: number = 0;
    public globalScope: VMScope;
    /**
     * This bit's different from LISP.
     * Since there's no symbols,
     *  there's no way to have it so that a *string* doesn't get looked up but *variables* do,
     *  without requiring all strings get quoted.
     * The good news is, LISP doesn't support ("thinghere" a b c)
     * So we don't support variable lookup, but we *do* support adding a new function,
     *  with a given name, that returns a given value.
     * And we can scope that.
     * Which brings us to this: This contains all the functions to load into the global scope.
     */
    private bootstrapFunctions: Record<string, VMFunction> = {
        // Meta
        '\'': async (args: Value[]): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for \'');
            return args[1];
        },
        // Operations
        'random': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for random');
            const size = (await this.eval(args[1], scope)).toString();
            return Math.floor(Math.random() * safeParseInt(size)).toString();
        },
        'length': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for length');
            const res = await this.eval(args[1], scope);
            if ((res.constructor === Array) || res.constructor === String)
                return res.length.toString();
            throw new Error('Attempted to get length of non-list');
        },
        'nth': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 3)
                throw new Error('Incorrect form for nth');
            const index = safeParseInt((await this.eval(args[1], scope)).toString());
            const res = await this.eval(args[2], scope);
            if ((res.constructor === Array) || (res.constructor === String))
                if ((index >= 0) && (index < res.length))
                    return res[index];
            throw new Error('Index out of bounds for nth: ' + res.toString() + '[' + index + ']');
        },
        'concatenate': async (args: Value[], scope: VMScope): Promise<Value> => {
            let first = true;
            let workspace = [];
            for (let value of args) {
                if (first) {
                    first = false;
                    continue;
                }
                let content = (await this.eval(value, scope)).toString();
                // WARNING! THIS ACTS AS A MEMORY LIMITER. DO NOT, REPEAT, DO NOT, REMOVE.
                this.consumeTime(content.length * vmConcatCharacterTime);
                workspace.push(content);
            }
            return workspace.join('');
        },
        // Functions, Variables & Scopes
        'set': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 3)
                throw new Error('Incorrect form for set');
            this.consumeTime(vmSetTime);
            const name = (await this.eval(args[1], scope)).toString();
            const value = await this.eval(args[2], scope);
            scope.set(name, value, false);
            return value;
        },
        // Control Flow
        'if': async (args: Value[], scope: VMScope): Promise<Value> => {
            if ((args.length != 3) && (args.length != 4))
                throw new Error('Incorrect form for if');
            const res = await this.eval(args[1], scope);
            if (res.constructor === Array) {
                if (res.length === 0) {
                    if (args.length != 4)
                        return [];
                    return await this.eval(args[3], scope);
                }
            }
            return await this.eval(args[2], scope);
        },
        // Discord Queries
        'quote': async (args: Value[], scope: VMScope): Promise<Value> => {
            return this.quote(args, scope, false, false);
        },
        'quote-cause': async (args: Value[], scope: VMScope): Promise<Value> => {
            return this.quote(args, scope, true, false);
        },
        'quote-silent': async (args: Value[], scope: VMScope): Promise<Value> => {
            return this.quote(args, scope, false, true);
        },
        'quote-silent-cause': async (args: Value[], scope: VMScope): Promise<Value> => {
            return this.quote(args, scope, true, true);
        },
        'name': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for name');
            // Determines the local name of someone, if possible.
            const res = (await this.eval(args[1], scope)).toString();
            const guild: discord.Guild | undefined = (this.context.channel as any).guild;
            if (guild) {
                const member: discord.GuildMember | undefined = guild.members.get(res);
                if (member)
                    return member.nickname || member.user.username || res;
            }
            return res;
        },
        'find-user': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for find-user');
            this.consumeTime(vmFindUserTime);
            const res1 = (await this.eval(args[1], scope)).toString();
            const guild: discord.Guild | undefined = (this.context.channel as any).guild;
            const res = findMemberByRef(guild, res1);
            if (res)
                return res.id;
            return [];
        },
        // Context
        'args': async (args: Value[]): Promise<Value> => {
            if (args.length != 1)
                throw new Error('Incorrect form for args');
            return this.context.args;
        },
        'prefix': async (args: Value[]): Promise<Value> => {
            if (args.length != 1)
                throw new Error('Incorrect form for prefix');
            return ((this.context.channel as any).guild && (this.context.channel as any).guild.commandPrefix) || this.context.client.commandPrefix || this.context.client.user.toString();
        },
        'cause': async (args: Value[]): Promise<Value> => {
            if (args.length != 1)
                throw new Error('Incorrect form for cause');
            return this.context.cause.id;
        },
        'emote': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for emote');
            const guild: discord.Guild | undefined = (this.context.channel as any).guild;
            const emote = this.context.client.emoteRegistry.getEmote(guild || null, (await this.eval(args[1], scope)).toString());
            if (emote.guild && nsfwGuild(this.context.client, emote.guild) && !nsfw(this.context.channel))
                return '';
            return emote.toString();
        }
    };
    
    public constructor(ctx: VMContext) {
        this.context = ctx;
        this.time = 0;
        this.globalScope = new VMScope(this, null);
        for (const k in this.bootstrapFunctions)
            this.globalScope.addFunction(k, this.bootstrapFunctions[k], false);
        this.globalScope.defun('random-element', ['array'], ['nth', ['random', ['length', ['array']]], ['array']], false);
    }
    
    public consumeTime(time: number): void {
        this.time += time;
        if (this.time > vmMaxTime)
            throw new Error('Time consumed puts VM over-budget, cancelling operation');
    }
        
    public async eval(arg: Value, scope: VMScope): Promise<Value> {
        this.consumeTime(vmEvalTime);
        
        // arg.length == 0 is also known as "nil"
        if (arg.constructor === Array) {
            const args = arg as Value[];
            if (args.length != 0) {
                if (args[0].constructor === String) {
                    const fname = args[0] as string;
                    const fun = scope.getFunction(fname);
                    if (!fun)
                        throw new Error('No such function ' + fname);
                    const res = await fun(args, scope);
                    if (res.toString().length > vmMaxAnythingLength)
                        throw new Error('Returned value above max size');
                    return res;
                } else if (args[0].constructor === Array) {
                    // NON-LISP rule: As function names have to be constant strings,
                    //  a list of statements is now possible.
                    // The way this works is that if the first arg is an *array*,
                    //  then all args including first are statements
                    
                    // this means that () will return ()
                    let lastResult: Value = [];
                    for (const stmt of args)
                        lastResult = await this.eval(stmt, scope);
                    return lastResult;
                }
            }
        }
        return arg;
    }
    
    private async quote(args: Value[], scope: VMScope, cause: boolean, silent: boolean): Promise<Value> {
        if (args.length != 2)
            throw new Error('Incorrect form for quote');
        this.consumeTime(vmQuoteTime);
        
        const components = (args[0] as string).split('-');
        const url = (await this.eval(args[1], scope)).toString();
        const details = discordMessageLinkURL.exec(url);
        if (!details)
            return 'Quotation failure. Invalid message link.\n';
        const channel = channelAsTBF(this.context.client.channels.get(details[1]));
        if (!channel)
            return 'Quotation failure. Channel ' + details[1] + ' does not exist or is not a text channel.\n';
        // Security check...
        if (!userHasReadAccessToChannel((this.context.channel as any).guild, channel, this.context.writer)) {
            return 'Quotation failure. Writer doesn\'t have access to the message.';
        } else if (components.indexOf('cause') != -1) {
            if (!userHasReadAccessToChannel((this.context.channel as any).guild, channel, this.context.cause))
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
}

/**
 * Runs a line of the bot's format-syntax.
 * Credit for the theory behind the design goes in part to LISP, PHP, and in part to (er, Lanterns, what's the name of your group again?)'s bot '42'.
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
 *  Also, " is pretty much a togglable escape.
 * /leaCheese/: Shows the leaCheese emote. For compatibility with old .cc say
 * //: Repeated verbatim, escapes text until next space. Used to keep URLs happy
 */
export async function runFormat(text: string, runner: VM): Promise<string> {
    const res = await runFormatInternal(text, async (v: Value): Promise<string> => {
        return (await runner.eval(v, runner.globalScope)).toString();
    });
    // return res + '\n' + runner.time + 'TU';
    return res;
}    
export async function runFormatInternal(text: string, runner: (a: Value) => Promise<string>): Promise<string> {
    let workspace = '';
    let escapeMode = false;
    let stringMode = false;
    let emoteMode: string | null = null;
    let urlMode = false;
    // Note: Index 0 here is the innermost (currently-appending-to) list.
    const listStack: Value[][] = [];
    // Unique reference for unescaped '
    const mySecretQuoteObject: Value[] = [];
    let listCurrentToken = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const whitespace = (ch == ' ') || (ch == '\r') || (ch == '\n') || (ch == '\t');
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
            if (stringMode) {
                // Inside a string
                if (ch == '\"') {
                    listStack[0].push(listCurrentToken);
                    listCurrentToken = '';
                    stringMode = false;
                } else {
                    listCurrentToken += ch;
                }
            } else if (whitespace || (ch == '\'') || (ch == '(') || (ch == ')') || (ch == '"')) {
                // 'Breaking' characters
                if (listCurrentToken.length > 0)
                    listStack[0].push(listCurrentToken);
                listCurrentToken = '';
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
                } else if (ch == '"') {
                    stringMode = true;
                }
                // By default characters act as whitespace since they don't get appended
            } else {
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
    if (stringMode)
        throw new Error('Unterminated String');
    if (listStack.length)
        throw new Error('Unterminated Invocation');
    // URL mode doesn't go here, it's not a formal body, just a "keep away from this" mechanism
    return workspace;
}
