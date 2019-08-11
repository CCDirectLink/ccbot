import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {ModsIndex} from '../data/structures';
import {getJSON, boundRequestTimeout} from '../utils';
import {WatcherEntity, WatcherEntityData} from '../watchers';

export interface ModDatabaseEntityData extends WatcherEntityData {
    endpoint: string;
}

/**
 * Acts as the source for mod list information.
 */
export class ModDatabaseEntity extends WatcherEntity {
    public database: ModsIndex | null;
    public endpoint: string;
    
    public constructor(c: CCBot, db: ModsIndex | null, err: Error | null, data: ModDatabaseEntityData) {
        super(c, 'mod-database-manager', data);
        this.database = db;
        this.lastError = err;
        this.endpoint = data.endpoint;
    }
    
    public async watcherTick(): Promise<void> {
        this.database = await getJSON(this.endpoint, {}) as ModsIndex;
    }
    
    public toSaveData(): ModDatabaseEntityData {
        return Object.assign(super.toSaveData(), {
            refreshMs: this.refreshMs,
            endpoint: this.endpoint
        });
    }
}

export default async function load(c: CCBot, data: ModDatabaseEntityData): Promise<CCBotEntity> {
    // Try pulling data immediately. If that fails, start with a null database.
    try {
        return new ModDatabaseEntity(c, await getJSON(data.endpoint, {}) as ModsIndex, null, data);
    } catch (e) {
        return new ModDatabaseEntity(c, null, e, data);
    }
}
