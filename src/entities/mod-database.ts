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
import {ModlikeIndex, Modlike, ModlikePage} from '../data/structures';
import {getJSON} from '../utils';
import {WatcherEntity, WatcherEntityData} from '../watchers';

export interface ModlikeDatabaseEntityData extends WatcherEntityData {
    endpoint: string;
}

interface NPDatabase {
    [id: string]: NPDatabasePackage;
}

interface NPDatabasePackage {
    metadata: NPDatabasePackageMetadata;
    installation: NPDatabasePackageInstallation[];
}

interface NPDatabasePackageMetadata {
    ccmodType?: 'base' | 'tool';
    ccmodHumanName: string;
    name: string;
    version: string;
    description?: string;
    homepage?: string;
}

interface NPDatabasePackageInstallation {
    type: 'modZip' | 'ccmod';
    url: string;
}

interface ToolsDatabase {
    tools: ModlikeIndex;
}

/// The base 'retrieve a JSON file of type T periodically' type.
export abstract class ModlikeDatabaseEntity<T> extends WatcherEntity {
    public database: ModlikeIndex | null;
    public endpoint: string;

    public constructor(c: CCBot, id: string, data: ModlikeDatabaseEntityData) {
        super(c, id, data);
        this.database = null;
        this.endpoint = data.endpoint;
    }

    public async watcherTick(): Promise<void> {
        this.database = this.parseEndpointResponse(await getJSON<T>(this.endpoint, {}));
    }

    public abstract parseEndpointResponse(data: T): ModlikeIndex;

    public toSaveData(): ModlikeDatabaseEntityData {
        return Object.assign(super.toSaveData(), {
            refreshMs: this.refreshMs,
            endpoint: this.endpoint
        });
    }
}

// copied from https://github.com/CCDirectLink/CCModDB/blob/f4b7caca87776465f2dcadc6a98a9d24f0935f98/build/src/db.ts#L84-L102
function getModHomepageWebsiteName(url?: string): ModlikePage[] {
    if (!url) return [];

    let name: string;
    switch (new URL(url).hostname) {
        case 'github.com':
            name = 'GitHub';
            break;
        case 'gitlab.com':
            name = 'GitLab';
            break;
        default:
            name = 'mod\'s homepage';
    }

    return [{name, url}];
}

/// Acts as the source for mod list information.
export class ModDatabaseEntity extends ModlikeDatabaseEntity<NPDatabase> {
    public constructor(c: CCBot, data: ModlikeDatabaseEntityData) {
        super(c, 'mod-database-manager', data);
    }

    public parseEndpointResponse(dbData: NPDatabase): ModlikeIndex {
        const mods: ModlikeIndex = {}
        for (const id in dbData) {
            const pkg = dbData[id];
            const { metadata } = pkg;

            if (metadata.ccmodType === 'base' || metadata.ccmodType === 'tool') continue;

            const isInstallable = pkg.installation.some((i) => i.type === 'ccmod' || i.type === 'modZip');
            if (!isInstallable) continue;

            mods[id] = {
                name: metadata.ccmodHumanName || metadata.name,
                version: metadata.version,
                description: metadata.description,
                page: getModHomepageWebsiteName(metadata.homepage),
            } as Modlike;
        }
        return mods;
    }
}

/// Acts as the source for mod list information.
export class ToolDatabaseEntity extends ModlikeDatabaseEntity<ToolsDatabase> {
    public constructor(c: CCBot, data: ModlikeDatabaseEntityData) {
        super(c, 'tool-database-manager', data);
    }

    public parseEndpointResponse(data: ToolsDatabase): ModlikeIndex {
        return data.tools;
    }
}

export async function loadModDatabase(c: CCBot, data: ModlikeDatabaseEntityData): Promise<CCBotEntity> {
    return new ModDatabaseEntity(c, data);
}
export async function loadToolDatabase(c: CCBot, data: ModlikeDatabaseEntityData): Promise<CCBotEntity> {
    return new ToolDatabaseEntity(c, data);
}
