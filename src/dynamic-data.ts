import * as fs from 'fs';
import * as structures from './data/structures';

/**
 * The sub-manager for a given object of 'dynamic data', i.e. that stuff we ideally would want to save/load.
 */
export class DynamicData<T> {
    // The data. Please treat as read-only - use modify to modify it.
    data: T;

    // Read-only (makes modify throw an error)
    ro: boolean;

    private path: string;
    private modifyTimeoutActive: boolean = false;
    private modifyActions: (() => void)[] = [];
    
    // The 'readonly' flag implies any changes to the file are developer-caused, allowing for live changes
    constructor(name: string, readonly: boolean, defaultContent: T) {
        this.path = 'dynamic-data/' + name + '.json';
        this.ro = readonly;
        this.data = defaultContent;
        this.reload();
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
    
    // Used to neatly wrap modifying accesses.
    modify(modifier: (value: T) => void) {
        if (this.ro)
            throw new Error('Attempt to modify read-only dynamic data!');
        modifier(this.data);
        if (!this.modifyTimeoutActive) {
            this.modifyTimeoutActive = true;
            setTimeout(() => {
                this.modifyTimeoutActive = false;
                console.log('saving ' + this.path);
                fs.writeFileSync(this.path, JSON.stringify(this.data, null, "    "));
            }, 30000);
        }
        this.callOnModify();
    }
    
    // Reloads the object. Note that the promise won't be rejected on reload failure.
    reload(): Promise<void> {
        return new Promise((resolve: () => void, reject: () => void) => {
            fs.readFile(this.path, 'utf8', (err: any, data: string) => {
                if (!err) {
                    try {
                        this.data = this.migrate(JSON.parse(data));
                    } catch (e) {
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
     * Given a loaded JSON object,
     *  migrates the JSON value 'x' to the current version.
     * Can also act as a verifier.
     */
    migrate(x: any): T {
        return x as T;
    }
};

/**
 * The place where all dynamic data goes.
 * Useful for eval access.
 * There should only be one of these at a time right now, since it's always based on the same folder.
 */
export default class DynamicDataManager {
    commands: DynamicData<structures.CommandSet> = new DynamicData('commands', false, {});
    embeds: DynamicData<structures.EmbedSet> = new DynamicData('embeds', false, {});
}
