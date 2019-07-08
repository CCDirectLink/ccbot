import loadDateActivity from './entities/date-activity';
import loadPageSwitcher from './entities/page-switcher';
import {CCBot} from './ccbot';

/**
 * Registers all the entities. (More or less.)
 */
export default function registerAllEntities(cr: CCBot) {
    cr.entities.entityTypes['date-activity'] = loadDateActivity;
    cr.entities.entityTypes['page-switcher'] = loadPageSwitcher;
}
