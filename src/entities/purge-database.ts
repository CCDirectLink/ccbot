import * as discord from 'discord.js';
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';

export interface PurgeDatabaseEntityData extends EntityData {
    timeMs: number;
    channels: MessageCollation;
}

export interface MessageCollation {[channel: string]: discord.Snowflake[]}

function dupChannels(src: MessageCollation): MessageCollation {
    const dst: MessageCollation = Object.assign({}, src);
    for (const id in src) {
        const array: string[] = [];
        for (const value of src[id])
            array.push(value);
        dst[id] = array;
    }
    return dst;
}

/**
 * Stores the IDs of sent messages.
 */
export class PurgeDatabaseEntity extends CCBotEntity {
    public channels: MessageCollation;
    public timeMs: number;
    private messageCallback: (msg: discord.Message) => void;
    
    public constructor(c: CCBot, data: PurgeDatabaseEntityData) {
        super(c, 'purge-database-manager', data);
        this.channels = dupChannels(data.channels);
        this.timeMs = data.timeMs;
        // Clean out older entries every minute
        const loopCallback = (): void => {
            if (this.killed)
                return;
            const deleteBefore = Date.now() - this.timeMs;
            for (const cid in this.channels) {
                const array = this.channels[cid];
                for (let i = 0; i < array.length; i++) {
                    // Work out if message is too old
                    const flake = discord.SnowflakeUtil.deconstruct(array[i]);
                    if (flake.date.getTime() < deleteBefore) {
                        array.splice(i, 1);
                        i--;
                    }
                }
                if (array.length == 0)
                    delete this.channels[cid];
            }
            setTimeout(loopCallback, 60000);
        };
        loopCallback();
        this.messageCallback = (message: discord.Message): void => {
            if (message.author == this.client.user) {
                const target = this.channels[message.channel.id] || [];
                this.channels[message.channel.id] = target;
                target.push(message.id);
                this.updated();
            }
        };
        this.client.on('message', this.messageCallback);
    }
    
    public onKill(transferOwnership: boolean): void {
        super.onKill(transferOwnership);
        this.client.removeListener('message', this.messageCallback);
    }
    
    public toSaveData(): PurgeDatabaseEntityData {
        return Object.assign(super.toSaveData(), {
            channels: dupChannels(this.channels),
            timeMs: this.timeMs
        });
    }
}

export default async function load(c: CCBot, data: PurgeDatabaseEntityData): Promise<CCBotEntity> {
    return new PurgeDatabaseEntity(c, data);
}
