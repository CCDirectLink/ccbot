import * as discord from 'discord.js';

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

export function channelAsTBF(channel: discord.Channel | undefined): discord.TextBasedChannelFields | undefined {
    if (channel && ((channel as any).sendEmbed))
        return (channel as unknown) as discord.TextBasedChannelFields;
    return undefined;
}