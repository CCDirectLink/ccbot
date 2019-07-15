import * as discord from 'discord.js';
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {silence} from '../utils';

/**
 * Implements old behaviors into the bot.
 */
class OldBehaviorsEntity extends CCBotEntity {
    private messageListener: (m: discord.Message) => void;
    
    public constructor(c: CCBot, data: EntityData) {
        super(c, 'old-behaviors-manager', data);
        this.messageListener = (m: discord.Message): void => {
            if (this.killed)
                return;

            const lowerContent = m.content.toLowerCase();

            // Where the actual behaviors are
            if (lowerContent.startsWith('failed to load')) {
                silence(m.channel.send('oof'));
            } else if (lowerContent.startsWith('?release')) {
                // Might need to be part of a relevant activity manager
                silence(m.channel.send('Watching the final countdown'));
            } else if ((m.channel as discord.TextChannel).name === 'media') {
                // Yes, the continued requirement of using any to do things is awkward.
                //const cc = m.guild.channels.find('name', 'crosscode');
            }
        };
        this.client.on('message', this.messageListener);
    }
    
    public onKill(): void {
        super.onKill();
        this.client.removeListener('message', this.messageListener);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new OldBehaviorsEntity(c, data);
}