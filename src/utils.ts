import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';

/**
 * Returns if a given channel is appropriate for NSFW information.
 */
export function nsfw(channel: discord.Channel): boolean {
    if (channel.type == "text") {
        const c2: discord.TextChannel = channel as discord.TextChannel;
        if (c2.guild.verified)
            return false;
        return c2.nsfw;
    } else if (channel.type == "dm") {
        return true;
    }
    return false;
};

/**
 * Returns if a given guild is considered a liability SFW-wise.
 */
export function nsfwGuild(client: commando.CommandoClient, guild: discord.Guild): boolean {
    if (client.provider.get('global', 'nsfw-' + guild.id, false))
        return true;
    const val = client.provider.get(guild, 'nsfw', false);
    return (val || false) && true;
}

export function channelAsTBF(channel: discord.Channel | undefined): (discord.Channel & discord.TextBasedChannelFields) | undefined {
    if (channel && ((channel as any).sendEmbed))
        return (channel as unknown) as (discord.Channel & discord.TextBasedChannelFields);
    return undefined;
}

export function getGuildTextChannel(client: commando.CommandoClient, guild: discord.Guild, id: string): discord.TextChannel | undefined {
    const guildChannel = client.provider.get(guild, 'channel-' + id, '');
    const result = guild.channels.find((c: discord.GuildChannel): boolean => {
        return (c.id == guildChannel) || (c.name == guildChannel);
    });
    return channelAsTBF(result) as (discord.TextChannel | undefined);
}

/**
 * Gets the state of the roles module.
 * Returns 'yes', 'no', or something else as a string
 */
export function getRolesState(client: commando.CommandoClient & {sideBySideSafety: boolean}, guild: discord.Guild | undefined): string {
    let rolesState: string = client.sideBySideSafety ? 'no' : 'yes';
    if (client.sideBySideSafety && guild)
        rolesState = (client.provider.get(guild, 'optin-roles') || rolesState).toString();
    return rolesState;
}

/**
 * Use if you think a failed promise really doesn't matter.
 */
export function silence(n: Promise<any>) {
    n.catch(() => {});
}

/**
 * A random array element picker.
 */
export function randomArrayElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Sorts in a natural (?) manner.
 */
export function naturalComparison(a: string, b: string): number {
    a = a.toLowerCase();
    b = b.toLowerCase();
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        let cha = a.charCodeAt(i);
        let chb = b.charCodeAt(i);
        if (cha < chb)
            return -1;
        if (cha > chb)
            return 1;
    }
    if (a.length < b.length)
        return -1;
    if (a.length > b.length)
        return 1;
    return 0;
}

/**
 * Checks if a user is at the local guild's bot-administrative level.
 */
export function localAdminCheck(t: commando.CommandMessage): boolean {
    if (t.client.owners.includes(t.author))
        return true;
    if (t.member)
        if (t.member.hasPermission('ADMINISTRATOR'))
            return true;
    return false;
}

export const mentionRegex = /\<\@\!?([0-9]*)\>/g;

export function findMemberByRef(t: discord.Guild | undefined | null, ref: string): discord.GuildMember | null {
    if (!t)
        return null;

    const mention = mentionRegex.exec(ref);
    if (mention)
        return t.members.get(mention[1]) || null;

    const byId = t.members.get(ref);
    if (byId)
        return byId;

    const candidates: discord.GuildMember[] = t.members.filterArray((v: discord.GuildMember): boolean => {
        return (v.user.username.includes(ref)) || (ref == (v.user.username + '#' + v.user.discriminator)) || (ref == v.user.id) || (ref == v.nickname);
    });
    if (candidates.length == 1)
        return candidates[0];
    return null;
}

// An integer parser that knows when to abort
export function safeParseInt(a: string): number {
    const res = parseInt(a);
    if (!Number.isSafeInteger(res))
        throw new Error('Number ' + a + ' is not a sane integer');
    if (res.toString() !== a)
        throw new Error('Number ' + a + ' does not convert back into itself');
    return res;
}

export function checkIntegerResult(a: number) {
    if (!Number.isSafeInteger(a))
        throw new Error('Operation result became ' + a);
}