import DateActivityEntity from './entities/date-activity-entity';
import {CCBot} from './ccbot';

/**
 * Registers all the entities. (More or less.)
 */
export default function registerAllEntities(cr: CCBot) {
    cr.entities.entityTypes["date-activity"] = DateActivityEntity;
}
