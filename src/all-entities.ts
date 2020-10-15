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

import loadDateActivity from './entities/date-activity';
import loadPageSwitcher from './entities/page-switcher';
import loadOldBehaviors from './entities/old-behaviors';
import loadGreeter from './entities/greeter';
import loadAuditor from './entities/auditor';
import loadReactRoles from './entities/react-roles';
import loadRandomActivity from './entities/random-activity';
import {loadModDatabase, loadToolDatabase} from './entities/mod-database';
import loadStreamWatcher from './entities/stream-watcher';
import {loadPurgeDatabase, loadPurgeDatabaseChannel} from './entities/purge-database';
import {loadUserDatablock} from './entities/user-datablock';
import {newTwitchStreamProviderLoader} from './entities/twitch-stream-provider';
import {newYouTubeStreamProviderLoader} from './entities/youtube-stream-provider';
import {CCBot} from './ccbot';

/// Registers all the entities. (More or less.)
export default function registerAllEntities(cr: CCBot, twitchClientId: string | undefined, ytClientId: string | undefined): void {
    cr.entities
        .registerType('date-activity', loadDateActivity)
        .registerType('page-switcher', loadPageSwitcher)
        .registerType('old-behaviors', loadOldBehaviors)
        .registerType('greeter', loadGreeter)
        .registerType('auditor', loadAuditor)
        .registerType('react-roles', loadReactRoles)
        .registerType('random-activity', loadRandomActivity)
        .registerType('mod-database', loadModDatabase)
        .registerType('tool-database', loadToolDatabase)
        .registerType('purge-database', loadPurgeDatabase)
        .registerType('purge-database-channel', loadPurgeDatabaseChannel)
        .registerType('user-datablock', loadUserDatablock);
    if (twitchClientId)
        cr.entities.registerType('twitch-stream-provider', newTwitchStreamProviderLoader(twitchClientId));
    if (ytClientId)
        cr.entities.registerType('youtube-stream-provider', newYouTubeStreamProviderLoader(ytClientId));
    cr.entities.registerType('stream-watcher', loadStreamWatcher);
}
