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

    public onKill(transferOwnership: boolean): void {
        if (!transferOwnership)
            silence(this.client.user.setPresence({
                status: 'online',
                game: null
            }));
    }

    private updateDate(): void {
        if (this.killed)
            return;
        silence(this.client.user.setPresence({
            status: 'online',
            game: {
                type: 'WATCHING',
                name: new Date().toString()
            }
        }));
        setTimeout((): void => {
            this.updateDate();
        }, 10000);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new DateActivityEntity(c, data);
}
