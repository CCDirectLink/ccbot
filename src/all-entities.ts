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
    cr.entities.entityTypes['date-activity'] = loadDateActivity;
    cr.entities.entityTypes['page-switcher'] = loadPageSwitcher;
    cr.entities.entityTypes['old-behaviors'] = loadOldBehaviors;
    cr.entities.entityTypes['greeter'] = loadGreeter;
    cr.entities.entityTypes['auditor'] = loadAuditor;
    cr.entities.entityTypes['react-roles'] = loadReactRoles;
    cr.entities.entityTypes['random-activity'] = loadRandomActivity;
    cr.entities.entityTypes['mod-database'] = loadModDatabase;
    cr.entities.entityTypes['tool-database'] = loadToolDatabase;
    cr.entities.entityTypes['purge-database'] = loadPurgeDatabase;
    cr.entities.entityTypes['purge-database-channel'] = loadPurgeDatabaseChannel;
    cr.entities.entityTypes['user-datablock'] = loadUserDatablock;
    if (twitchClientId)
        cr.entities.entityTypes['twitch-stream-provider'] = newTwitchStreamProviderLoader(twitchClientId);
    if (ytClientId)
        cr.entities.entityTypes['youtube-stream-provider'] = newYouTubeStreamProviderLoader(ytClientId);
    cr.entities.entityTypes['stream-watcher'] = loadStreamWatcher;
}
