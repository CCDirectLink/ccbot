// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as discord from 'discord.js';
import {CCBot, CCBotEntity} from '../ccbot';
import {EntityData} from '../entity-registry';
import {TextBasedChannel, getGuildTextChannel, silence} from '../utils';
import {DiscordAPIUser} from '../data/structures';

/// Implements greetings and automatic role assignment.
class AuditorEntity extends CCBotEntity {
    private banListener: (g: discord.Guild, u: DiscordAPIUser, arm: boolean) => void;
    private updateListener: (c: TextBasedChannel, id: string) => void;
    private deletesListener: (c: TextBasedChannel, id: string[]) => void;

    public constructor(c: CCBot, data: EntityData) {
        super(c, 'auditor-manager', data);
        this.banListener = (g: discord.Guild, u: DiscordAPIUser, added: boolean): void => {
            const channel = getGuildTextChannel(c, g, 'editlog');
            if (!channel)
                return;
            let calculatedIcon = 'https://discordapp.com/assets/6e054ab8981d3f1ce8debfd1235d3ea3.svg';
            if (u.avatar)
                calculatedIcon = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`;
            // Ok, well now we have all the details to make a post. Let's see if we can get additional info.
            silence((async (): Promise<void> => {
                let reason = '';
                if (added) {
                    try {
                        const info = await g.fetchBan(u.id);
                        reason = discord.Util.escapeMarkdown(info.reason || '');
                    } catch (_e) {
                        // Deilberately left blank
                    }
                }
                await channel.send({
                    title: `Ban ${added ? 'Added' : 'Removed'}`,
                    description: reason,
                    timestamp: new Date(),
                    footer: {
                        text: `${u.username}#${u.discriminator} (${u.id})`,
                        // As a string to get ESLint to ignore it
                        'icon_url': calculatedIcon
                    }
                });
            })());
        };
        this.updateListener = (frm: TextBasedChannel, id: string): void => {
            this.updateAndDeletionMachine(frm, [id], false);
        };
        this.deletesListener = (frm: TextBasedChannel, id: string[]): void => {
            this.updateAndDeletionMachine(frm, id, true);
        };
        this.client.on('ccbotBanAddRemove', this.banListener);
        this.client.on('ccbotMessageUpdateUnchecked', this.updateListener);
        this.client.on('ccbotMessageDeletes', this.deletesListener);
    }
    private updateAndDeletionMachine(frm: TextBasedChannel, id: string[], deletion: boolean): void {
        // IT IS VITAL THAT THIS ROUTINE IS NOT ASYNC, OR WE WILL LOSE ACCESS TO ANY CACHED MESSAGE COPIES.
        if (!(frm instanceof discord.GuildChannel))
            return;
        const { guild } = frm;
        const targetChannel = getGuildTextChannel(this.client, guild, 'editlog');
        if (!targetChannel)
            return;
        // Do not listen to messages in the channel we're using to send reports about listening to messages.
        if (targetChannel == frm)
            return;
        const resultingEmbed: discord.MessageEmbedOptions = {
            title: (id.length != 1) ? (deletion ? 'Bulk Delete' : 'Bulk Update') : (deletion ? 'Message Deleted' : 'Message Updated'),
            color: deletion ? 0xFF0000 : 0xFFFF00,
            timestamp: new Date()
        };
        let weNeedToCheckMessageZero = false;
        const showName = `#${frm.name || frm.id}`;
        if (id.length != 1) {
            resultingEmbed.title += ` (${id.length} messages in ${showName})`;
            if (id.length <= 50) {
                resultingEmbed.description = `IDs:\n${id.join(', ')}`;
            } else {
                resultingEmbed.description = 'Too many messages to show IDs';
            }
        } else {
            resultingEmbed.title += ` (${showName}, ${id[0]})`;
            resultingEmbed.description = '';
            // More discord.js workarounds that wouldn't even be workarounds if they just exposed the fields in their TypeScript defs
            // Seriously seems like idiot-proofing at the expense of 'it ignored my action!' bugs when stuff isn't loaded
            const channelMessageCollection = frm.messages;
            const message = channelMessageCollection.cache.get(id[0]);
            if (message) {
                // If it's our own message, don't listen, since embeds create edits.
                if (message.author.id == this.client.user!.id)
                    return;
                resultingEmbed.description += `Information on the message before changes:\n${this.summarize(message)}`;
            } else {
                resultingEmbed.description += 'Further information about the old version of the message is unavailable.';
                weNeedToCheckMessageZero = true;
            }
        }
        silence((async (): Promise<void> => {
            try {
                await targetChannel.send('', {embed: resultingEmbed});
            } catch (e) {
                try {
                    await targetChannel.send(`Unable to state details on ${resultingEmbed.title}\n${e.toString()}`);
                } catch (_e2) {
                    try {
                        await targetChannel.send(`Unable to state details on ${resultingEmbed.title}\nUnable to state why either`);
                    } catch (_e3) {
                        await targetChannel.send('An event happened, but describing it causes an error for some reason. Sorry.');
                    }
                }
            }
            if (weNeedToCheckMessageZero) {
                try {
                    const result = await frm.messages.fetch(id[0]);
                    await targetChannel.send(`Current (after edits) information on ${id[0]}:${this.summarize(result)}`);
                } catch (_e) {
                    //await targetChannel.send('Could not get after-edits information on the message.\n' + e.toString());
                }
            }
        })());
    }
    private summarize(message: discord.Message): string {
        let summary = `\nAuthor: ${message.author.username}#${message.author.discriminator} (${message.author.id})`;
        summary += `\nContent:\n\`\`\`\n${discord.Util.cleanCodeBlockContent(message.content)}\n\`\`\``;
        for (const attachment of message.attachments.values())
            summary += `\nHad attachment: ${discord.Util.escapeMarkdown(attachment.name || 'unknown')} \`${discord.Util.escapeInlineCode(attachment.url)}\``;
        // Old-fashioned, but ESLint won't let me hear the end of it otherwise.
        for (let i = 0; i < message.embeds.length; i++)
            summary += '\nHad embed';
        if (message.guild)
            summary += `\nFor current details, see https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
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
