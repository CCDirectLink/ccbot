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

import {CCBot, CCBotEntity} from '../ccbot';
import {EntityData} from '../entity-registry';
import {silence} from '../utils';

export interface CountdownActivityData extends EntityData {
    // Can be obtained with the Date.UTC(year, month, date, hours, minutes, seconds, ms) function.
    // Note that the month paraameter are zero-indexed.
    countdownTimestampMs: number;
}

class CountdownActivityEntity extends CCBotEntity {
    public readonly countdownTimestampMs: number;

    public constructor(c: CCBot, data: CountdownActivityData) {
        super(c, 'activity-manager', data);
        this.countdownTimestampMs = data.countdownTimestampMs;
        this.updateCountdown();
    }

    public onKill(transferOwnership: boolean): void {
        if (!transferOwnership)
            silence(this.client.user!.setPresence({
                status: 'online'
            }));
    }

    private updateCountdown(): void {
        if (this.killed)
            return;
        silence(this.client.user!.setPresence({
            status: 'online',
            activity: {
                type: 'WATCHING',
                name: this.getCountdownText()
            }
        }));
        setTimeout((): void => {
            this.updateCountdown();
        }, 10000);
    }

    private getCountdownText(): string {
        // Date.now() returns a UTC timestamp.
        const currentTimestampMs = Date.now();

        function formatNumber(value: number, width = 2): string {
            return value.toString().padStart(width, '0');
        }

        const pastCountdownTimestamp = this.countdownTimestampMs < currentTimestampMs;
        const millisecondsLeft = Math.abs(this.countdownTimestampMs - currentTimestampMs);
        // const millisecondsStr = formatNumber(left % 1000, 4);
        const secondsLeft = millisecondsLeft / 1000;
        const secondsStr = formatNumber(Math.floor(secondsLeft % 60));
        const minutesLeft = secondsLeft / 60;
        const minutesStr = formatNumber(Math.floor(minutesLeft % 60));
        const hoursLeft = minutesLeft / 60;
        const hoursStr = formatNumber(Math.floor(hoursLeft % 24));
        const daysLeft = hoursLeft / 24;
        const daysStr = formatNumber(Math.floor(daysLeft));

        const signStr = pastCountdownTimestamp ? '+' : '-';
        return `T${signStr}${daysStr}:${hoursStr}:${minutesStr}:${secondsStr} UTC`;
    }

    public toSaveData(): CountdownActivityData {
        return Object.assign(super.toSaveData(), {
            countdownTimestampMs: this.countdownTimestampMs
        });
    }
}

export default async function load(c: CCBot, data: CountdownActivityData): Promise<CCBotEntity> {
    return new CountdownActivityEntity(c, data);
}
