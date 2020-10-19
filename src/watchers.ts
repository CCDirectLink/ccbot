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

import {CCBot, CCBotEntity} from './ccbot';
import {EntityData} from './entity-registry';
import {boundRequestTimeout} from './utils';

// Base watcher...

export interface WatcherEntityData extends EntityData {
    /// Time between refreshes.
    refreshMs: number;
}

/// A WatcherEntity periodically updates to 'watch' something or apply some effect.
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

    /// Override this in your subclass.
    /// Downloads data from the streaming service to locate streams.
    public abstract watcherTick(): Promise<void>;

    public toSaveData(): WatcherEntityData {
        return Object.assign(super.toSaveData(), {
            refreshMs: this.refreshMs
        });
    }
}

// Subclasses...

// Subclasses... / StreamProvider

/// Information about a stream.
/// Most fields are self-explainatory but there may be exceptions.
export interface StreamInformation {
    // Critical
    userName: string;
    service: string;
    url: string;
    // Useful
    title?: string;
    /// When the stream started (if this is known).
    /// Can be used to make a 'lossy' stream start notifier:
    ///  notify about streams that started after the last stream you noticed.
    started?: Date;
    /// A language (will be assumed to be in https://en.wikipedia.org/wiki/ISO_639-1 form)
    language?: string;
}

export type StreamProviderEntityData = WatcherEntityData;

/// The base stream provider.
/// Automatically prefixes the ID with 'stream-provider-'.
export abstract class StreamProviderEntity extends WatcherEntity {
    // Updating list of the top X streams.
    public streams: StreamInformation[] = [];
    public constructor(c: CCBot, id: string, data: WatcherEntityData) {
        super(c, `stream-provider-${id}`, data);
    }
}
