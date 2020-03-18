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
import {ModsIndex, ToolsIndex} from '../data/structures';
import {getJSON} from '../utils';
import {WatcherEntity, WatcherEntityData} from '../watchers';

export interface ModlikeDatabaseEntityData extends WatcherEntityData {
    endpoint: string;
}

/**
 * The base 'retrieve a JSON file of type X periodically' type.
 */
export class ModlikeDatabaseEntity<X extends {}> extends WatcherEntity {
    public database: X | null;
    public endpoint: string;

    public constructor(c: CCBot, id: string, db: X | null, err: Error | null, data: ModlikeDatabaseEntityData) {
        super(c, id, data);
        this.database = db;
        this.lastError = err;
        this.endpoint = data.endpoint;
    }

    public async watcherTick(): Promise<void> {
        this.database = await getJSON(this.endpoint, {}) as X;
    }

    public toSaveData(): ModlikeDatabaseEntityData {
        return Object.assign(super.toSaveData(), {
            refreshMs: this.refreshMs,
            endpoint: this.endpoint
        });
    }
}

/**
 * Acts as the source for mod list information.
 */
export class ModDatabaseEntity extends ModlikeDatabaseEntity<ModsIndex> {
    public constructor(c: CCBot, db: ModsIndex | null, err: Error | null, data: ModlikeDatabaseEntityData) {
        super(c, 'mod-database-manager', db, err, data);
    }
}

/**
 * Acts as the source for mod list information.
 */
export class ToolDatabaseEntity extends ModlikeDatabaseEntity<ToolsIndex> {
    public constructor(c: CCBot, db: ToolsIndex | null, err: Error | null, data: ModlikeDatabaseEntityData) {
        super(c, 'tool-database-manager', db, err, data);
    }
}

export async function loadModDatabase(c: CCBot, data: ModlikeDatabaseEntityData): Promise<CCBotEntity> {
    // Try pulling data immediately. If that fails, start with a null database.
    try {
        return new ModDatabaseEntity(c, await getJSON(data.endpoint, {}) as ModsIndex, null, data);
    } catch (e) {
        return new ModDatabaseEntity(c, null, e, data);
    }
}
export async function loadToolDatabase(c: CCBot, data: ModlikeDatabaseEntityData): Promise<CCBotEntity> {
    // Try pulling data immediately. If that fails, start with a null database.
    try {
        return new ToolDatabaseEntity(c, await getJSON(data.endpoint, {}) as ToolsIndex, null, data);
    } catch (e) {
        return new ToolDatabaseEntity(c, null, e, data);
    }
}
