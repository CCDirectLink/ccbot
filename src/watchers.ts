import {CCBotEntity, CCBot} from './ccbot';
import {EntityData} from './entity-registry';
import {boundRequestTimeout} from './utils';

// Base watcher...

export interface WatcherEntityData extends EntityData {
    /**
     * Time between refreshes.
     */
    refreshMs: number;
}

/**
 * A WatcherEntity periodically updates to 'watch' something or apply some effect.
 */
export abstract class WatcherEntity extends CCBotEntity {
    public refreshMs: number;
    public lastError: Error | null;
    
    public constructor(c: CCBot, id: string, data: WatcherEntityData, earlyDelay?: number) {
        super(c, id, data);
        this.refreshMs = data.refreshMs;
        this.lastError = null;
        earlyDelay = earlyDelay || 0;
        setTimeout((): void => {this.startWatcherTick();}, earlyDelay);
    }
    
    private async startWatcherTick(): Promise<void> {
        if (this.killed)
            return;
        try {
            await this.watcherTick();
            this.lastError = null;
        } catch (e) {
            this.lastError = e;
        }
        setTimeout((): void => {
            this.startWatcherTick();
        }, boundRequestTimeout(this.refreshMs));
    }
    
    /**
     * Override this in your subclass.
     * Downloads data from the streaming service to locate streams.
     */
    public abstract watcherTick(): Promise<void>;

    public toSaveData(): WatcherEntityData {
        return Object.assign(super.toSaveData(), {
            refreshMs: this.refreshMs
        });
    }
}

// Subclasses...

// Subclasses... / StreamProvider

/**
 * Information about a stream.
 * Most fields are self-explainatory but there may be exceptions.
 */
export interface StreamInformation {
    // Critical
    userName: string;
    service: string;
    url: string;
    // Useful
    title?: string;
    /**
     * When the stream started (if this is known).
     * Can be used to make a 'lossy' stream start notifier:
     *  notify about streams that started after the last stream you noticed.
     */
    started?: Date;
    /**
     * A language (will be assumed to be in https://en.wikipedia.org/wiki/ISO_639-1 form)
     */
    language?: string;
}

export type StreamProviderEntityData = WatcherEntityData;

/**
 * The base stream provider.
 * Automatically prefixes the ID with 'stream-provider-'.
 */
export abstract class StreamProviderEntity extends WatcherEntity {
    // Updating list of the top X streams.
    public streams: StreamInformation[] = [];
    public constructor(c: CCBot, id: string, data: WatcherEntityData) {
        super(c, 'stream-provider-' + id, data);
    }
}
