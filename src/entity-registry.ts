import {DynamicData} from './dynamic-data';
import {EntitySet} from './data/structures';

/**
 * Entity's base data
 */
export interface EntityData {
    type: string;
    id: string;
    createTime?: number;
    killTime?: number;
}

/**
 * Entities are persistent mutable objects within the bot's system.
 * They are used to provide configurable behaviors that aren't tied to any specific invocation like a command is.
 * (This isn't to say commands can't affect entities, though.)
 * Note that this particular version is the base version,
 *  which doesn't have the callbacks.
 * Check ccbot.ts CCBotEntity for that one.
 */
export abstract class Entity<C> {
    // Used to alert callbacks to the entity's death.
    public killed: boolean = false;
    public readonly client: C;
    public readonly type: string;
    public readonly id: string;
    // The new Date().getTime() of initial creation, more or less.
    public readonly createTime: number;
    // NOTE: If this is 0, the entity won't die.
    // If this is 0 on creation, the entity still won't die until the next time the bot is run;
    //  entities that are loaded with a 0 killTime are assumed to be relatively permanent.
    // Lowering a killTime (making it happen sooner) may not actually work,
    //  due to measures to avoid kill-checks eating CPU.
    // Setting killTime to 0 potentially stops the kill checks, making it permanent for that run.
    public killTime: number;

    public constructor(c: C, data: EntityData) {
        this.client = c;
        // These carry over.
        this.type = data.type;
        this.id = data.id;
        // If the creation time isn't in the data, this has just been created.
        if ('createTime' in data) {
            this.createTime = data.createTime as number;
        } else {
            this.createTime = new Date().getTime();
        }
        this.killTime = data.killTime || 0;
        if (this.killTime) {
            // The setImmediate ensures the entity isn't killed before insertion.
            setImmediate((): void => this.entityCheckIfShouldKill());
        }
    }
    
    /**
     * Checks if the entity should be killed, and if not, waits until it should.
     * This is only run if killTime was set in the first place.
     */
    private entityCheckIfShouldKill(): void {
        if (this.killed)
            return;
        if (!this.killTime)
            return;
        const time = new Date().getTime();
        if (time >= this.killTime) {
            this.kill();
        } else {
            setTimeout((): void => this.entityCheckIfShouldKill(), this.killTime - time);
        }
    }
    
    /**
     * Used in the subclass to connect to killEntity.
     */
    public kill(): void {
        throw new Error('Subclass did not implement kill()');
    }
    
    /**
     * Used in the subclass to connect to markPendingFlush.
     */
    public updated(): void {
        throw new Error('Subclass did not implement updated()');
    }
    
    /**
     * Called just after the entity was killed.
     * If the entity is maintaining a state, like an activity, this is where it would be reset.
     */
    public onKill(): void {
        
    }
    
    /**
     * Called to save the entity.
     * Must provide an object that can be passed to newEntity to get the same(ish) entity.
     */
    public toSaveData(): EntityData {
        const sd: EntityData = {
            type: this.type,
            id: this.id,
            createTime: this.createTime
        };
        if ('killTime' in this)
            sd.killTime = this.killTime;
        return sd;
    }
}

/**
 * The EntityRegistry is the registry and processor for all Entity objects.
 * Entities are derived from the Entity class,
 *  and are expected to be initialized with a json object like them.
 */
export class EntityRegistry<C, T extends Entity<C>> {
    public readonly client: C;
    public readonly entityTypes: {[type: string]: new(c: C, data: any) => T} = {};
    public readonly entities: {[id: string]: T} = {};
    // A reference to the entity DynamicData.
    private readonly entityData: DynamicData<EntitySet>;
    // Prevents unnecessary entity resets during save-to-dynamic-data.
    private duringOurModification: boolean = false;
    // True if entities should be saved soon. Reset to false on save-to-dynamic-data.
    private pendingEntityFlush: boolean = false;
    // Until this is true, the EntityRegistry does nothing.
    // This is important because until the bot is ready,
    //  certain things might not exist that entities might want to access.
    private started: boolean = false;
    
    public constructor(c: C, data: DynamicData<EntitySet>) {
        this.client = c;
        this.entityData = data;
        this.entityData.onModify(() => {
            if (this.started)
                if (!this.duringOurModification)
                    this.resetEntities();
        });
    }
    
    /**
     * Starts entities (i.e. creates them & such).
     * Before this point, entity-related operations do nothing.
     * This allows the entity system to be present (so commands run at the 'right' time fail gracefully),
     *  without entities having to account for the bot not being ready.
     */
    public start(): void {
        if (this.started)
            return;
        this.started = true;
        this.resetEntities();
    }
    
    /**
     * Creates a new entity from the JSON data for that entity.
     */
    public newEntity(data: any): T | null {
        if (!this.started)
            return null;
        // If no ID is provided, make one.
        if (!('id' in data)) {
            data.id = '0';
            let idn = 0;
            while (data.id in this.entities) {
                idn++;
                data.id = idn.toString();
            }
        }
        // Then create the entity by type.
        if (this.entityTypes[data.type]) {
            this.killEntity(data.id);
            const e = this.entities[data.id] = new this.entityTypes[data.type](this.client, data);
            this.markPendingFlush();
            return e;
        } else {
            console.log('invalid entity type ' + data.type + ' was in registry');
        }
        return null;
    }

    /**
     * Kills the entity with the given ID.
     */    
    public killEntity(id: string): void {
        if (id in this.entities) {
            const v = this.entities[id];
            v.killed = true;
            delete this.entities[id];
            v.onKill();
        }
        this.markPendingFlush();
    }
    
    /**
     * Kills absolutely all entities (perhaps in preparation for a load)
     */
    public killAllEntities(): void {
        for (const k in this.entities) {
            const v = this.entities[k];
            v.killed = true;
            delete this.entities[k];
            v.onKill();
        }
        this.markPendingFlush();
    }
    
    /**
     * 
     */
    public resetEntities(): void {
        if (!this.started)
            return;
        this.killAllEntities();
        for (const entity of this.entityData.data)
            this.newEntity(entity);
        this.pendingEntityFlush = false;
    }
    
    /**
     * Marks the registry as needing to be flushed.
     * To avoid making bulk operations waste I/O, this uses a setImmediate and a flag.
     * So multiple marks will be combined into one.
     */
    public markPendingFlush(): void {
        this.pendingEntityFlush = true;
        setImmediate(() => {
            if (this.pendingEntityFlush)
                this.saveToDynamicData();
        });
    }
    
    /**
     * Writes all entities to the DynamicData.
     */
    public saveToDynamicData(): void {
        if (!this.started)
            return;
        this.duringOurModification = true;
        this.entityData.modify((d: EntitySet) => {
            d.splice(0, d.length);
            for (const k in this.entities)
                d.push(this.entities[k].toSaveData());
        });
        this.duringOurModification = false;
        this.pendingEntityFlush = false;
     }
}
