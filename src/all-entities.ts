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

/**
 * Registers all the entities. (More or less.)
 */
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
