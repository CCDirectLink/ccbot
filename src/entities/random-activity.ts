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
