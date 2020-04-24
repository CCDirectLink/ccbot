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
interface TwitchPaginated<X> {
    data: X[];
    pagination?: {
        cursor: string;
    };
}

interface TwitchStream {
    id: string;
    user_id: string;
    user_name: string;
    game_id: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
}

interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
}

/// The Game ID of CrossCode.
/// Hardcoded because this is the kind of thing where a change just doesn't happen,
/// and if it does happen the bot can be updated...
const gameId = '491243';

/// Scans for CrossCode Twitch streams.
export class TwitchStreamProviderEntity extends StreamProviderEntity {
    private requestMaker: (endpoint: string) => Promise<object>;

    public constructor(c: CCBot, data: StreamProviderEntityData, clientId: string) {
        super(c, 'twitch', data);
        this.requestMaker = async (endpoint: string): Promise<object> => {
            if (!endpoint.startsWith('helix/'))
                throw new Error('You sure about that?');
            return await getJSON('https://api.twitch.tv/' + endpoint, {
                'Client-ID': clientId
            });
        };
    }

    public async watcherTick(): Promise<void> {
        const streams = (await this.requestMaker('helix/streams?game_id=' + gameId)) as TwitchPaginated<TwitchStream>;

        // Twitch requires we have a user's "login" (username) for their stream URL.
        // So we need to grab those.
        // Additional note: Each index here corresponds with a streams.data index.
        const userGrabComponents: string[] = [];
        for (const stream of streams.data)
            userGrabComponents.push('id=' + stream.user_id);
        let users: TwitchPaginated<TwitchUser> = {data: []};
        if (userGrabComponents.length > 0)
            users = (await this.requestMaker('helix/users?' + userGrabComponents.join('&'))) as TwitchPaginated<TwitchUser>;

        this.streams = [];
        for (let index = 0; index < users.data.length; index++) {
            const stream = streams.data[index];
            const user = users.data[index];
            this.streams.push({
                userName: stream.user_name,
                service: 'Twitch',
                title: stream.title,
                url: 'https://www.twitch.tv/' + user.login,
                language: stream.language,
                started: new Date(stream.started_at)
            });
        }
    }
}

export function newTwitchStreamProviderLoader(clientId: string): (c: CCBot, data: StreamProviderEntityData) => Promise<CCBotEntity> {
    return async (c: CCBot, data: StreamProviderEntityData): Promise<CCBotEntity> => {
        return new TwitchStreamProviderEntity(c, data, clientId);
    };
}
