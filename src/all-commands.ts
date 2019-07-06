import ReloadCommand from './commands/reload-command';
import {CCBot} from './ccbot';

/**
 * Registers all the commands. (More or less.)
 */
export default function registerAllCommands(cr: CCBot) {
    cr.registry.registerDefaults();
    cr.registry.registerCommand(new ReloadCommand(cr));
}
