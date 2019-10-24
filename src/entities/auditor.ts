import * as discord from 'discord.js';
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {getGuildTextChannel, silence, guildOf} from '../utils';
import {DiscordAPIUser} from '../data/structures';

/**
 * Implements greetings and automatic role assignment.
 */
class AuditorEntity extends CCBotEntity {
    private banListener: (g: discord.Guild, u: DiscordAPIUser, arm: boolean) => void;
    private updateListener: (c: discord.Channel & discord.TextBasedChannelFields, id: string) => void;
    private deletesListener: (c: discord.Channel & discord.TextBasedChannelFields, id: string[]) => void;

    public constructor(c: CCBot, data: EntityData) {
        super(c, 'auditor-manager', data);
        this.banListener = (g: discord.Guild, u: DiscordAPIUser, added: boolean): void => {
            const channel = getGuildTextChannel(c, g, 'editlog');
            if (!channel)
                return;
            let calculated_icon: string = 'https://discordapp.com/assets/6e054ab8981d3f1ce8debfd1235d3ea3.svg';
            if (u.avatar)
                calculated_icon = 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png';
            silence(channel.sendEmbed({
                title: 'Ban ' + (added ? 'Added' : 'Removed'),
                timestamp: new Date(),
                footer: {
                    text: u.username + '#' + u.discriminator + ' (' + u.id + ')',
                    icon_url: calculated_icon
                }
            }));
        };
        this.updateListener = (frm: discord.Channel & discord.TextBasedChannelFields, id: string): void => {
            this.updateAndDeletionMachine(frm, [id], false);
        };
        this.deletesListener = (frm: discord.Channel & discord.TextBasedChannelFields, id: string[]): void => {
            this.updateAndDeletionMachine(frm, id, true);
        };
        this.client.on('ccbotBanAddRemove', this.banListener);
        this.client.on('ccbotMessageUpdateUnchecked', this.updateListener);
        this.client.on('ccbotMessageDeletes', this.deletesListener);
    }
    private updateAndDeletionMachine(frm: discord.Channel & discord.TextBasedChannelFields, id: string[], deletion: boolean): void {
        // IT IS VITAL THAT THIS ROUTINE IS NOT ASYNC, OR WE WILL LOSE ACCESS TO ANY CACHED MESSAGE COPIES.
        const guild = guildOf(frm);
        if (!guild)
            return;
        const targetChannel = getGuildTextChannel(this.client, guild, 'editlog');
        if (!targetChannel)
            return;
        // Do not listen to messages in the channel we're using to send reports about listening to messages.
        if (targetChannel == frm)
            return;
        let resultingEmbed: discord.RichEmbedOptions = {
            title: (id.length != 1) ? (deletion ? 'Bulk Delete' : 'Bulk Update') : (deletion ? 'Message Deleted' : 'Message Updated'),
            color: deletion ? 0xFF0000 : 0xFFFF00,
            timestamp: new Date()
        };
        let weNeedToCheckMessageZero = false;
        const showName = '#' + ((frm as unknown as {name?: string}).name || frm.id);
        if (id.length != 1) {
            resultingEmbed.title += ' (' + id.length + ' messages in ' + showName + ')';
            if (id.length <= 50) {
                resultingEmbed.description = 'IDs:\n' + id.join(', ');
            } else {
                resultingEmbed.description = 'Too many messages to show IDs';
            }
        } else {
            resultingEmbed.title += ' (' + showName + ', ' + id[0] + ')';
            resultingEmbed.description = '';
            // More discord.js workarounds that wouldn't even be workarounds if they just exposed the fields in their TypeScript defs
            // Seriously seems like idiot-proofing at the expense of 'it ignored my action!' bugs when stuff isn't loaded
            const channelMessageCollection = (frm as unknown as {messages: discord.Collection<string, discord.Message>}).messages;
            const message = channelMessageCollection.get(id[0]);
            if (message) {
                resultingEmbed.description += this.summarize(message);
            } else {
                resultingEmbed.description += '\nFurther information about the old version of the message is unavailable.';
                weNeedToCheckMessageZero = true;
            }
        }
        silence((async (): Promise<void> => {
            try {
                await targetChannel.send('', {embed: resultingEmbed});
            } catch (e) {
                try {
                    await targetChannel.send('Unable to state details on ' + resultingEmbed.title + '\n' + e.toString());
                } catch (e2) {
                    try {
                        await targetChannel.send('Unable to state details on ' + resultingEmbed.title + '\nUnable to state why either');
                    } catch (e3) {
                        await targetChannel.send('An event happened, but describing it causes an error for some reason. Sorry.');
                    }
                }
            }
            if (weNeedToCheckMessageZero) {
                try {
                    const result = await frm.fetchMessage(id[0]);
                    await targetChannel.send('Current (after edits) information on ' + id[0] + ':' + this.summarize(result));
                } catch (e) {
                    //await targetChannel.send('Could not get after-edits information on the message.\n' + e.toString());
                }
            }
        })());
    }
    private summarize(message: discord.Message): string {
        let summary = '\nAuthor: ' + message.author.username + '#' + message.author.discriminator + ' (' + message.author.id + ')';
        summary += '\nOld content:\n```\n' + discord.Util.escapeMarkdown(message.content, true, false) + '\n```';
        for (let k of message.attachments.keyArray()) {
            const attachment = message.attachments.get(k) as discord.MessageAttachment;
            summary += '\nHad attachment: ' + discord.Util.escapeMarkdown(attachment.filename) + ' `' + discord.Util.escapeMarkdown(attachment.url, false, true) + '`';
        }
        for (let embed of message.embeds)
            summary += '\nHad embed';
        if (message.guild)
            summary += '\nFor current details, see https://discordapp.com/channels/' + message.guild.id + '/' + message.channel.id + '/' + message.id;
        return summary;
    }
    public onKill(transferOwnership: boolean): void {
        super.onKill(transferOwnership);
        this.client.removeListener('ccbotBanAddRemove', this.banListener);
        this.client.removeListener('ccbotMessageUpdateUnchecked', this.updateListener);
        this.client.removeListener('ccbotMessageDeletes', this.deletesListener);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new AuditorEntity(c, data);
}
