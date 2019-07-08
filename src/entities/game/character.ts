import {CCBotEntity, CCBot} from '../../ccbot';
import {EntityData} from '../../entity-registry';

interface GameCharacterData extends EntityData {
    user: string
}

/**
 * The Entity that represents a player's state in the Game.
 * Uses IDs of the form 'game-character-{user-id}'.
 */
class GameCharacterEntity extends CCBotEntity {
    public user: string;
    
    public constructor(c: CCBot, data: GameCharacterData) {
        super(c, 'game-character-' + data.user, data);
        this.user = data.user;
    }
    
    public toSaveData(): GameCharacterData {
        return Object.assign(super.toSaveData(), {
            user: this.user
        });
    }
}

export default async function load(c: CCBot, data: GameCharacterData): Promise<CCBotEntity> {
    return new GameCharacterEntity(c, data);
}
