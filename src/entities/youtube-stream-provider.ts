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
import {StreamProviderEntityData, StreamProviderEntity} from '../watchers';
import {getJSON} from '../utils';

// These represent external serialized data, be careful.
interface YouTubeVideoThumbnail {
    url: string;
    width: number;
    height: number;
}
interface YouTubeVideoSearchResult {
    kind: 'youtube#searchResult';
    etag: string;
    id: {
        kind: 'youtube#video';
        videoId: string;
    };
    snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: Record<string, YouTubeVideoThumbnail>;
        channelTitle: string;
        liveBroadcastContent: string;
    };
}

interface YouTubeSearchListResponse {
    kind: 'youtube#searchListResponse';
    etag: string;
    regionCode: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
    // Shouldn't be strictly video, but in this case it is
    items: YouTubeVideoSearchResult[];
}

// What we search for. (Change to something memey like 'Baldi's Basics' if you aren't getting results)
const searchTerm = 'CrossCode';

/// Scans for CrossCode Twitch streams.
export class YouTubeStreamProviderEntity extends StreamProviderEntity {
    private requestMaker: () => Promise<object>;

    public constructor(c: CCBot, data: StreamProviderEntityData, clientId: string) {
        super(c, 'youtube', data);
        this.requestMaker = async (): Promise<object> => {
            return await getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&q=' + searchTerm + '&type=video&key=' + clientId, {});
        };
    }

    public async watcherTick(): Promise<void> {
        const streams = (await this.requestMaker()) as YouTubeSearchListResponse;
        this.streams = [];
        // eslint-disable-next-line no-useless-catch
        try {
            for (const stream of streams.items)
                this.streams.push({
                    userName: stream.snippet.channelTitle,
                    title: stream.snippet.title,
                    started: new Date(stream.snippet.publishedAt),
                    service: 'YouTube',
                    url: 'https://www.youtube.com/watch?v=' + stream.id.videoId
                });
        } catch (e) {
            // console.log(JSON.stringify(streams));
            throw e;
        }
    }
}

export function newYouTubeStreamProviderLoader(clientId: string): (c: CCBot, data: StreamProviderEntityData) => Promise<CCBotEntity> {
    return async (c: CCBot, data: StreamProviderEntityData): Promise<CCBotEntity> => {
        return new YouTubeStreamProviderEntity(c, data, clientId);
    };
}
