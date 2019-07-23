import * as fs from 'fs';
import * as structures from './data/structures';

/**
 * The sub-manager for a given object of 'dynamic data', i.e. that stuff we ideally would want to save/load.
 */
export class DynamicData<T> {
    // The data. Please treat as read-only - use modify to modify it.
    public data: T;

    // Immediate access (prevents change-buffering behavior)
    public immediate: boolean;

    // RAM access (changes are always lost)
    // It does not make sense to have a non-immediate RAM
    public ram: boolean;
    
    // Resolves after the initial load.
    public initialLoad: Promise<void>;

    private path: string;
    
    // Used for the write buffering
    private modifyTimeoutActive: (() => void)[] | null = null;
    private modifyTimeoutReject: ((err: any) => void)[] | null = null;
    
    private modifyActions: (() => void)[] = [];
    
    constructor(name: string, immediate: boolean, ram: boolean, defaultContent: T) {
        this.path = 'dynamic-data/' + name + '.json';
        this.immediate = immediate;
        this.ram = ram;
        this.data = defaultContent;
        this.initialLoad = this.reload();
    }

    // Adds a modification callback.
    onModify(action: () => void) {
        this.modifyActions.push(action);
    }

    // Calls the various modifyActions.
    private callOnModify() {
        for (const v of this.modifyActions)
            v();
    }
    
    private saveImmediate(): Promise<void> {
        if (this.ram)
            return Promise.resolve();
        return new Promise((resolve: () => void, reject: (err: any) => void) => {
            console.log('saving ' + this.path);
            fs.writeFile(this.path, JSON.stringify(this.data, null, "    "), (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
    
    /*
     * Used to neatly wrap modifying accesses.
     * The promise is resolved when the data is written. It may be rejected if saving fails.
     * Note: saveSync should only be used if you really absolutely want to be sure it's saved now.
     */
    modify(modifier: (value: T) => void): Promise<void> {
        modifier(this.data);
        this.callOnModify();
        if (this.immediate) {
            return this.saveImmediate();
        } else {
            // This logic ensures only one write is ongoing at a time.
            let mta: (() => void)[] = [];
            let mtj: ((err: any) => void)[] = [];
            if ((this.modifyTimeoutActive == null) || (this.modifyTimeoutReject == null)) {
                console.log('opening save window on ' + this.path);
                this.modifyTimeoutActive = mta;
                this.modifyTimeoutReject = mtj;
                setTimeout(() => {
                    this.saveImmediate().then(() => {
                        this.modifyTimeoutActive = null;
                        this.modifyTimeoutReject = null;
                        for (const f of mta)
                            f();
                    }, (err: any) => {
                        this.modifyTimeoutActive = null;
                        this.modifyTimeoutReject = null;
                        for (const f of mtj)
                            f(err);
                    });
                }, 30000);
            } else {
                mta = this.modifyTimeoutActive;
                mtj = this.modifyTimeoutReject;
            }
            return new Promise((resolve: () => void, reject: (err: any) => void) => {
                mta.push(resolve);
                mtj.push(reject);
            });
        }
    }
    
    /**
     * Reloads the object. Note that the promise won't be rejected on reload failure.
     */
    reload(): Promise<void> {
        return new Promise((resolve: () => void, reject: (err: any) => void) => {
            fs.readFile(this.path, 'utf8', (err: any, data: string) => {
                if (!err) {
                    try {
                        this.data = JSON.parse(data);
                    } catch (e) {
                        console.log('in ' + this.path);
                        console.error(e);
                    }
                    this.callOnModify();
                    resolve();
                } else {
                    resolve();
                }
            });
        });
    }
    
    /**
     * Destroys the DynamicData, severing the link to the filesystem (if there is one).
     * Before doing so, saves any modified data, leaving things in a consistent state.
     */
    async destroy(): Promise<void> {
        if (this.modifyTimeoutActive != null)
            await this.saveImmediate();
        this.ram = true;
    }
};

/**
 * The place where all dynamic data goes.
 * Useful for eval access.
 * There should only be one of these at a time right now, since it's always based on the same folder.
 */
export default class DynamicDataManager {
    commands: DynamicData<structures.CommandSet> = new DynamicData('commands', false, true, {});
    entities: DynamicData<structures.EntitySet> = new DynamicData('entities', false, false, []);
    settings: DynamicData<structures.GuildIndex> = new DynamicData('settings', true, false, {});
    
    async destroy(): Promise<void> {
        await Promise.all([
            this.commands.destroy(),
            this.entities.destroy(),
            this.settings.destroy()
        ]);
    }
}
