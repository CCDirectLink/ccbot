import ReloadCommand from './commands/reload';
import CounterCommand from './commands/counter';
import ThanksCommand from './commands/thanks';
import PingCommand from './commands/ping';
import {CCBot} from './ccbot';

/**
 * Registers all the commands. (More or less.)
 */
export default function registerAllCommands(cr: CCBot) {
    cr.registry.registerDefaultTypes();
    cr.registry.registerDefaultGroups();
    cr.registry.registerDefaultCommands({
        help: false, // not compatible with the new dispatcher
        prefix: true,
        eval_: true,
        ping: false,
        commandState: true
    });
    cr.registry.registerCommand(new ReloadCommand(cr));
    cr.registry.registerCommand(new CounterCommand(cr));
    cr.registry.registerGroup("general");
    cr.registry.registerCommand(new ThanksCommand(cr));
    cr.registry.registerCommand(new PingCommand(cr));
}
