import DateActivityEntity from './entities/date-activity';
import {PageSwitcherEntity} from './entities/page-switcher';
import {CCBot} from './ccbot';

/**
 * Registers all the entities. (More or less.)
 */
export default function registerAllEntities(cr: CCBot) {
    cr.entities.entityTypes['date-activity'] = DateActivityEntity;
    cr.entities.entityTypes['page-switcher'] = PageSwitcherEntity;
}
