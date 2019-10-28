import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {silence, randomArrayElement} from '../utils';

type ActivityType = ('PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING');
type ActivityStatus = ('online' | 'idle' | 'dnd' | 'invisible');

export interface Activity {
    status?: ActivityStatus;
    type: ActivityType;
    name: string;
}

export interface RandomActivityData extends EntityData {
    activities: Activity[];
    intervalMs: number;
}

/**
 */
class RandomActivityEntity extends CCBotEntity {
    public readonly activities: Activity[];
    public readonly interMessageTime: number;
    
    public constructor(c: CCBot, data: RandomActivityData) {
        super(c, 'activity-manager', data);
        this.activities = data.activities;
        this.interMessageTime = data.intervalMs;
        this.updateText();
    }
    
    public onKill(transferOwnership: boolean): void {
        if (!transferOwnership)
            silence(this.client.user.setPresence({
                status: 'online',
                game: null
            }));
    }
    
    public updateText(): void {
        if (this.killed)
            return;
        const element = randomArrayElement(this.activities);
        this.client.user.setPresence({
            status: element.status || 'online',
            game: {
                type: element.type as ActivityType,
                name: element.name
            }
        });
        setTimeout((): void => {
            this.updateText();
        }, this.interMessageTime);
    }
    
    public toSaveData(): RandomActivityData {
        return Object.assign(super.toSaveData(), {
            activities: this.activities,
            intervalMs: this.interMessageTime
        });
    }
}

export default async function load(c: CCBot, data: RandomActivityData): Promise<CCBotEntity> {
    return new RandomActivityEntity(c, data);
}
