/**
 * Entities are persistent mutable objects within the bot's system.
 * They are used to provide configurable behaviors that aren't tied to any specific invocation like a command is.
 * (This isn't to say commands can't affect entities, though.)
 * Note that this particular version is the base version,
 *  which doesn't have the callbacks.
 * Check ccbot.ts CCBotEntity for that one.
 */
export class Entity<C> {
    // Used to alert callbacks to the entity's death.
    public killed: boolean = false;
    public readonly client: C;
    public readonly type: string;
    public readonly id: string;
    // The new Date().getTime() of initial creation, more or less.
    public readonly createTime: number;

    public constructor(c: C, data: any) {
        this.client = c;
        // These carry over.
        this.type = data.type;
        this.id = data.id;
        // If the creation time isn't in the data, this has just been created.
        if ('createTime' in data) {
            this.createTime = data.createTime;
        } else {
            this.createTime = new Date().getTime();
        }
    }
    
    /**
     * Called just after the entity was killed.
     * If the entity is maintaining a state, like an activity, this is where it would be reset.
     */
    public onKill(): any {
        
    }
    
    /**
     * Called to save the entity.
     * Must provide an object that can be passed to newEntity to get the same(ish) entity.
     */
    public toSaveData(): any {
        return {
            type: this.type,
            id: this.id,
            createTime: this.createTime
        };
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
    
    public constructor(c: C) {
        this.client = c;
    }
    
    public newEntity(data: any): T | null {
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
            return this.entities[data.id] = new this.entityTypes[data.type](this.client, data);
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
    }
}
