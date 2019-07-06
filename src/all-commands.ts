import ReloadCommand from './commands/reload';
import CounterCommand from './commands/counter';
import {CCBot} from './ccbot';

/**
 * Registers all the commands. (More or less.)
 */
export default function registerAllCommands(cr: CCBot) {
    cr.registry.registerDefaults();
    cr.registry.registerCommand(new ReloadCommand(cr));
    cr.registry.registerCommand(new CounterCommand(cr));
}
