// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import ReloadCommand from './commands/reload';
import CounterCommand from './commands/counter';
import PingCommand from './commands/ping';
import {InspireCommand, AddQuoteCommand, RmQuoteCommand} from './commands/inspire';
import HugCommand from './commands/hug';
import PurgeCommand from './commands/purge';
import ArmyCommand from './commands/army';
import {RolesAddCommand, RolesRmCommand, RolesListCommand} from './commands/roles';
import {SettingsCommand, ShowUserSettingsCommand, SettingsOperation, SettingsContext} from './commands/settings';
import {ListEmotesCommand, EmoteCommand, ReactCommand} from './commands/emotes';
import {ModsToolsGetCommand} from './commands/mods';
import SayCommand from './commands/say';
import {CCBot} from './ccbot';

/// Registers all the commands. (More or less.)
export default function registerAllCommands(cr: CCBot): void {
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
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Get, SettingsContext.Global));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Set, SettingsContext.Global));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Rm, SettingsContext.Global));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Get, SettingsContext.Local));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Set, SettingsContext.Local));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Rm, SettingsContext.Local));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Get, SettingsContext.User));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Set, SettingsContext.User));
    cr.registry.registerCommand(new SettingsCommand(cr, SettingsOperation.Rm, SettingsContext.User));
    cr.registry.registerCommand(new ShowUserSettingsCommand(cr));
    cr.registry.registerCommand(new CounterCommand(cr));
    // part of inspire
    cr.registry.registerCommand(new AddQuoteCommand(cr));
    cr.registry.registerCommand(new RmQuoteCommand(cr));

    cr.registry.registerGroup('general');
    cr.registry.registerCommand(new ArmyCommand(cr, 'general', 'cheesearmy'));
    cr.registry.registerCommand(new ArmyCommand(cr, 'general', 'leacheesearmy', 'leaCheeseAngry'));
    cr.registry.registerCommand(new PingCommand(cr));
    cr.registry.registerCommand(new ListEmotesCommand(cr, false));
    cr.registry.registerCommand(new ListEmotesCommand(cr, true));
    cr.registry.registerCommand(new EmoteCommand(cr));
    cr.registry.registerCommand(new ReactCommand(cr));
    cr.registry.registerCommand(new SayCommand(cr));
    cr.registry.registerCommand(new HugCommand(cr));
    cr.registry.registerCommand(new PurgeCommand(cr));
    cr.registry.registerCommand(new InspireCommand(cr));

    cr.registry.registerGroup('roles');
    cr.registry.registerCommand(new RolesAddCommand(cr));
    cr.registry.registerCommand(new RolesRmCommand(cr));
    cr.registry.registerCommand(new RolesListCommand(cr));

    cr.registry.registerCommand(new ModsToolsGetCommand(cr, 'general', 'mods', false));
    cr.registry.registerCommand(new ModsToolsGetCommand(cr, 'general', 'tools', true));
}
