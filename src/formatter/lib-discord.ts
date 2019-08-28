import * as discord from 'discord.js';
import {VM, asString, wrapFunc, Value, falseValue} from './core';
import {findMemberByRef, guildOf, channelAsTBF, emoteSafe} from '../utils';
import {CCBot} from '../ccbot';
import {userAwareGetEmote} from '../entities/user-datablock';

const vmQuoteTime = 128;
const vmFindUserTime = 128;

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
    // The current embed.
    embed?: discord.RichEmbedOptions;
}

const discordMessageLinkURL = /([0-9]+)\/([0-9]+)$/;

/**
 * @param where The channel this is being sent to.
 * @param source The channel the message is being sourced from.
 * @param user A security principal like writer; null is guild-level access (@'where')
 */
function userHasReadAccessToChannel(where: ChannelTBF, source: ChannelTBF, user: discord.User | null): boolean {
    const quoteGuild = guildOf(source);
    if (!user) {
        // Guild access
        const contextGuild = guildOf(where);
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

export function installDiscord(vm: VM, context: VMContext): void {
    async function quote(urlV: Value, cause: boolean, silent: boolean): Promise<Value> {
        vm.consumeTime(vmQuoteTime);
        
        const url = asString(urlV);
        const details = discordMessageLinkURL.exec(url);
        if (!details)
            return 'Quotation failure. Invalid message link.\n';
        const channel = channelAsTBF(context.client.channels.get(details[1]));
        if (!channel)
            return 'Quotation failure. Channel ' + details[1] + ' does not exist or is not a text channel.\n';
        // Security check...
        if (!userHasReadAccessToChannel(context.channel, channel, context.writer)) {
            return 'Quotation failure. Writer doesn\'t have access to the message.';
        } else if (cause) {
            if (!userHasReadAccessToChannel(context.channel, channel, context.cause))
                return 'Quotation failure; Writer requested that Cause needs access.';
        }
        try {
            const message = await channel.fetchMessage(details[2]);

            // Frankly, expect the escaping here to fail...
            const escapedContent = '> ' + (message.cleanContent.replace('\n', '\n> ').replace('<@', '\\<@'));
            const ref = silent ? message.author.username + '#' + message.author.discriminator : message.author.toString();
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
        return url;
    }

    vm.install({
        // Discord Queries
        'quote': wrapFunc('quote', 1, async (args: Value[]): Promise<Value> => quote(args[0], false, false)),
        'quote-cause': wrapFunc('quote-cause', 1, async (args: Value[]): Promise<Value> => quote(args[0], true, false)),
        'quote-silent': wrapFunc('quote-silent', 1, async (args: Value[]): Promise<Value> => quote(args[0], false, true)),
        'quote-silent-cause': wrapFunc('quote-silent-cause', 1, async (args: Value[]): Promise<Value> => quote(args[0], true, true)),
        'name': wrapFunc('name', 1, async (args: Value[]): Promise<Value> => {
            // Determines the local name of someone, if possible.
            const res = asString(args[0]);
            const guild = guildOf(context.channel);
            if (guild) {
                const member: discord.GuildMember | undefined = guild.members.get(res);
                if (member)
                    return member.nickname || member.user.username || res;
            }
            return res;
        }),
        'find-user': wrapFunc('find-user', 1, async (args: Value[]): Promise<Value> => {
            vm.consumeTime(vmFindUserTime);
            const res1 = asString(args[0]);
            const guild = guildOf(context.channel);
            const res = findMemberByRef(guild, res1);
            if (res)
                return res.id;
            return falseValue;
        }),
        // Context
        'args': wrapFunc('args', 0, async (): Promise<Value> => context.args),
        'prefix': wrapFunc('prefix', 0, async (): Promise<Value> => {
            const guild = guildOf(context.channel);
            return (guild && guild.commandPrefix) || context.client.commandPrefix || context.client.user.toString();
        }),
        'cause': wrapFunc('cause', 0, async (): Promise<Value> => context.cause.id),
        'emote': wrapFunc('emote', 1, async (args: Value[]): Promise<Value> => {
            const guild = guildOf(context.channel);
            const emote = await userAwareGetEmote(context.client, context.writer, guild || null, args[0].toString());
            if (!emoteSafe(emote, context.channel))
                return '';
            return emote.toString();
        }),
        // Context Modification ; Embeds
        'embed': wrapFunc('embed', 1, async (args: Value[]): Promise<Value> => {
            let val = args[0];
            if (val === '') {
                delete context.embed;
            } else if (val.constructor == Array) {
                const embed = val as Value[];
                if (embed.length == 0)
                    throw new Error('Embed control list has no type.');
                val = val as Value[];
                const tp = asString(embed[0]);
                if (tp === 'image') {
                    if (embed.length != 3)
                        throw new Error('Embed control list format image needs name, url');
                    const url = asString(embed[2]);
                    context.embed = {
                        title: asString(embed[1]),
                        url: url,
                        image: {
                            url: url
                        }
                    };
                } else {
                    throw new Error('Embed control list type not understood: ' + tp);
                }
            }
            return falseValue;
        })
    });
}
