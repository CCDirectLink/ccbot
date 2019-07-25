import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {silence} from '../utils';

/**
 * Updates a visible date every 10 seconds.
 * Additional fields: None.
 */
class DateActivityEntity extends CCBotEntity {
    public constructor(c: CCBot, data: EntityData) {
        super(c, 'activity-manager', data);
        this.updateDate();
    }
    
    public onKill(replaced: boolean): void {
        if (!replaced)
            silence(this.client.user.setActivity(null));
    }
    
    private updateDate(): void {
        if (this.killed)
            return;
        silence(this.client.user.setActivity(new Date().toString()));
        setTimeout((): void => {
            this.updateDate();
        }, 10000);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new DateActivityEntity(c, data);
}
