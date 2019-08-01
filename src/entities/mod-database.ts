import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import * as https from 'https';
import * as http from 'http';
import {ModsIndex} from '../data/structures';

export interface ModDatabaseEntityData extends EntityData {
    // Time between refreshes.
    // The entity loses the information between bot restarts to prevent explosions.
    // Cannot be less than 60 seconds.
    refreshMs: number;
    endpoint: string;
}

function pullData(endpoint: string): Promise<ModsIndex> {
    return new Promise((resolve, reject): void => {
        const request = https.get(endpoint, {
            headers: {
                'user-agent': 'ccbot-new (red queen)'
            }
        }, (res: http.IncomingMessage): void => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', (piece): void => {
                data += piece;
            });
            res.on('end', (): void => {
                try {
                    resolve(JSON.parse(data) as ModsIndex);
                } catch (e) {
                    reject(e);
                }
            });
        });
        request.on('error', (e: Error): void => {
            reject(e);
        });
    });
}

/**
 * Acts as the source for mod list information.
 */
export class ModDatabaseEntity extends CCBotEntity {
    public database: ModsIndex | null;
    public lastError: Error | null;
    public refreshMs: number;
    public endpoint: string;
    
    public constructor(c: CCBot, db: ModsIndex | null, err: Error | null, data: ModDatabaseEntityData) {
        super(c, 'mod-database-manager', data);
        this.database = db;
        this.lastError = err;
        this.refreshMs = Math.max(60000, data.refreshMs) || 60000;
        this.endpoint = data.endpoint;
    }
    
    private async dbTick(): Promise<void> {
        if (this.killed)
            return;
        try {
            this.database = await pullData(this.endpoint);
            this.lastError = null;
        } catch (e) {
            this.lastError = e;
        }
        this.startDBTick();
    }
    
    private startDBTick(): void {
        setTimeout((): void => {this.dbTick();}, this.refreshMs);
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
        return new ModDatabaseEntity(c, await pullData(data.endpoint), null, data);
    } catch (e) {
        return new ModDatabaseEntity(c, null, e, data);
    }
}
