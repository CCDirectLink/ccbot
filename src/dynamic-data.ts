import * as fs from 'fs';
import * as structures from './data/structures';

/**
 * Manages 'dynamic data', i.e. that stuff we ideally would want to save/load.
 */
export class DynamicData<T> {
    data: T;
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
    onModify(action: () => void) {
        this.modifyActions.push(action);
    }
    callOnModify() {
        for (const v of this.modifyActions)
            v();
    }
    // Used to neatly wrap modifying accesses.
    modify(modifier: () => void) {
        if (this.ro)
            throw new Error('Attempt to modify read-only dynamic data!');
        modifier();
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
    // Triggers a reload.
    reload() {
        fs.readFile(this.path, 'utf8', (err: any, data: string) => {
            if (!err) {
                try {
                    this.data = this.migrate(JSON.parse(data));
                } catch (e) {
                    console.error(e);
                }
                this.callOnModify();
            }
        });
    }
    // Migrates the JSON value 'x' forward in format version. Can also act as a verifier.
    migrate(x: any): T {
        return x as T;
    }
};

/**
 * The place where all dynamic data goes. Useful for eval access.
 */
export default class DynamicDataManager {
    commands: DynamicData<structures.CommandSet> = new DynamicData('commands', false, {});
    embeds: DynamicData<structures.EmbedSet> = new DynamicData('embeds', false, {});
}
