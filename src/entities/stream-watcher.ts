import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {EntityData} from '../entity-registry';
import {CCBotEntity, CCBot} from '../ccbot';
import {silence, channelAsTBF, guildOf} from '../utils';
import {WatcherEntityData, WatcherEntity, StreamProviderEntity} from '../watchers';

// All the kinds of stream provider we care about
const streamProviders: string[] = ['twitch', 'youtube'];

export interface StreamWatcherData extends WatcherEntityData {
    // Channel ID.
    channel: string;
    // Message ID (not present if it must be created)
    message?: string;
}

/**
 * Watches the streams go by.
 */
class StreamWatcherEntity extends WatcherEntity {
    private channel: discord.Channel & discord.TextBasedChannelFields;
    private message: discord.Message;
    
    public constructor(c: CCBot, channel: discord.Channel & discord.TextBasedChannelFields, message: discord.Message, data: StreamWatcherData) {
        super(c, 'message-' + message.id, data, 10000);
        this.channel = channel;
        this.message = message;
    }
    
    public async watcherTick(): Promise<void> {
        const streams: {
            name: string;
            value: string;
        }[] = [];
        const guild = guildOf(this.channel);
        for (const providerType of streamProviders) {
            const id = 'stream-provider-' + providerType;
            if (id in this.client.entities.entities) {
                const provider = this.client.entities.entities[id] as StreamProviderEntity;
                if (provider.lastError !== null)
                    streams.push({
                        name: '<error from ' + id + '>',
                        value: provider.lastError.toString()
                    });
                for (const stream of provider.streams) {
                    let langTag = '';
                    if (stream.language)
                        langTag = '(' + stream.language.toUpperCase() + ')';
                        
                    let titleTag = '';
                    if (stream.title)
                        titleTag = ': ' + stream.title;
                    
                    const streamLongTail: string[] = [stream.url];
                    if (stream.started)
                        streamLongTail.push('Started at ' + stream.started + '.');
                    if (guild) {
                        const foundMember = guild.members.find((member: discord.GuildMember): boolean => {
                            if (member.user.username.toLowerCase() === stream.userName.toLowerCase())
                                return true;
                            return false;
                        });
                        if (foundMember)
                            streamLongTail.push('Possibly here as ' + foundMember.nickname);
                    }
                    streams.push({
                        name: stream.userName + ' ' + langTag + ' on ' + stream.service + titleTag,
                        value: streamLongTail.join('\n')
                    });
                }
            }
        }
        await this.message.edit('', {
            embed: {
                title: 'CrossCode Streams',
                fields: streams,
                timestamp: new Date()
            }
        });
    }
    
    public toSaveData(): StreamWatcherData {
        return Object.assign(super.toSaveData(), {
            channel: this.channel.id,
            message: this.message.id
        });
    }
    
    public onKill(transferOwnership: boolean): void {
        super.onKill(transferOwnership);
        if (!transferOwnership)
            silence(this.message.delete());
    }
}

/**
 * Creates a stream watcher.
 */
export default async function load(c: CCBot, data: StreamWatcherData): Promise<CCBotEntity> {
    const channel = channelAsTBF(c.channels.get(data.channel));
    if (!channel)
        throw Error('involved channel no longer exists');
    let message: discord.Message;
    if (!data.message) {
        // New
        message = await channel.send('Did you know that it takes at least one second for a stream watcher to initialize?') as discord.Message;
    } else {
        // Reused
        message = await channel.fetchMessage(data.message);
    }
    return new StreamWatcherEntity(c, channel, message, data);
}
