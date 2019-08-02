import loadDateActivity from './entities/date-activity';
import loadPageSwitcher from './entities/page-switcher';
import loadOldBehaviors from './entities/old-behaviors';
import loadGreeter from './entities/greeter';
import loadReactRoles from './entities/react-roles';
import loadRandomActivity from './entities/random-activity';
import loadModDatabase from './entities/mod-database';
import loadPurgeDatabase from './entities/purge-database';
import {CCBot} from './ccbot';

/**
 * Registers all the entities. (More or less.)
 */
export default function registerAllEntities(cr: CCBot) {
    cr.entities.entityTypes['date-activity'] = loadDateActivity;
    cr.entities.entityTypes['page-switcher'] = loadPageSwitcher;
    if (!cr.sideBySideSafety)
        cr.entities.entityTypes['old-behaviors'] = loadOldBehaviors;
    cr.entities.entityTypes['greeter'] = loadGreeter;
    cr.entities.entityTypes['react-roles'] = loadReactRoles;
    cr.entities.entityTypes['random-activity'] = loadRandomActivity;
    cr.entities.entityTypes['mod-database'] = loadModDatabase;
    cr.entities.entityTypes['purge-database'] = loadPurgeDatabase;
}
