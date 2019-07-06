import {CCBotEntity, CCBot} from '../ccbot';

/**
 * Updates a visible date every 10 seconds.
 * Additional fields: None.
 */
export default class DateActivityEntity extends CCBotEntity {
    public constructor(c: CCBot, data: object) {
        super(c, data);
        this.updateDate();
    }
    
    public updateDate(): void {
        if (this.killed)
            return;
        this.client.user.setActivity(new Date().toString());
        setTimeout((): void => {
            this.updateDate();
        }, 10000);
    }

    public onKill(): void {
        super.onKill();
        this.client.user.setActivity(null);
    }
}