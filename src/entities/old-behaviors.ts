import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';

/**
 * Implements old behaviors into the bot.
 */
class OldBehaviorsEntity extends CCBotEntity {
    public constructor(c: CCBot, data: EntityData) {
        super(c, 'old-behaviors-manager', data);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new OldBehaviorsEntity(c, data);
}
