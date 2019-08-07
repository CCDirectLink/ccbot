import ReloadCommand from './commands/reload';
import CounterCommand from './commands/counter';
import PingCommand from './commands/ping';
import HelpCommand from './commands/help';
import HugCommand from './commands/hug';
import PurgeCommand from './commands/purge';
import ArmyCommand from './commands/army';
import {RolesAddCommand, RolesRmCommand, RolesListCommand} from './commands/roles';
import {SettingsSetCommand, SettingsGetCommand, SettingsRmCommand} from './commands/settings';
import {ListEmotesCommand, EmoteCommand, ReactCommand} from './commands/emotes';
import {ModsGetCommand} from './commands/mods';
import SayCommand from './commands/say';
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

    // util
    cr.registry.registerCommand(new ReloadCommand(cr));
    cr.registry.registerCommand(new SettingsSetCommand(cr));
    cr.registry.registerCommand(new SettingsGetCommand(cr));
    cr.registry.registerCommand(new SettingsRmCommand(cr));
    cr.registry.registerCommand(new CounterCommand(cr));
    
    cr.registry.registerGroup("general");
    cr.registry.registerCommand(new ArmyCommand(cr, 'general', 'leacheesearmy', 'leaCheeseAngry'));
    cr.registry.registerCommand(new PingCommand(cr));
    cr.registry.registerCommand(new ListEmotesCommand(cr));
    cr.registry.registerCommand(new EmoteCommand(cr));
    cr.registry.registerCommand(new ReactCommand(cr));
    cr.registry.registerCommand(new SayCommand(cr));
    cr.registry.registerCommand(new HugCommand(cr));
    cr.registry.registerCommand(new PurgeCommand(cr));
    
    cr.registry.registerGroup("roles");
    cr.registry.registerCommand(new RolesAddCommand(cr));
    cr.registry.registerCommand(new RolesRmCommand(cr));
    cr.registry.registerCommand(new RolesListCommand(cr));

    cr.registry.registerGroup("mods");
    cr.registry.registerCommand(new ModsGetCommand(cr));
}
