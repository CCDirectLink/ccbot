import loadDateActivity from './entities/date-activity';
import loadPageSwitcher from './entities/page-switcher';
import loadOldBehaviors from './entities/old-behaviors';
import loadRandomActivity from './entities/random-activity';
import {CCBot} from './ccbot';

/**
 * Registers all the entities. (More or less.)
 */
export default function registerAllEntities(cr: CCBot) {
    cr.entities.entityTypes['date-activity'] = loadDateActivity;
    cr.entities.entityTypes['page-switcher'] = loadPageSwitcher;
    cr.entities.entityTypes['old-behaviors'] = loadOldBehaviors;
    cr.entities.entityTypes['random-activity'] = loadRandomActivity;
}
