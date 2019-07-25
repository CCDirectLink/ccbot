import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import JSONCommand from './commands/json';
import {CCBot} from './ccbot';
import {mentionRegex, getRolesState} from './utils';

// Not nice.
(commando as any).CommandDispatcher = require('discord.js-commando/src/dispatcher');

/**
 * A modified version of the CommandDispatcher.
 */
class CCBotCommandDispatcher extends (commando.CommandDispatcher as any) {
    client!: CCBot;
    
    constructor(c: CCBot, r: commando.CommandRegistry) {
        super(c, r);
    }

    parseMessage(message: any): commando.CommandMessage | null {
        // Stage 1: Prefix removal, cleanup
        let text: string = message.content;
        
        // The regexes used here are taken from the older code.

        // Trim
        text = text.replace(/^\s+|\s+$/g, '');
        
        //  Get & remove the prefix
        let commandPrefix: string;
        if (message.guild) {
            commandPrefix = message.guild.commandPrefix;
        } else {
            commandPrefix = this.client.commandPrefix;
        }

        const universalPrefix: string = this.client.user.toString();
        commandPrefix = commandPrefix || universalPrefix;
        
        if (text.startsWith(commandPrefix)) {
            text = text.substring(commandPrefix.length);
        } else if (text.startsWith(universalPrefix)) {
            text = text.substring(universalPrefix.length);
        } else if (!message.guild) {
            text = text;
        } else {
            return null;
        }
        
        // Stage 2: Further Stuff

        // Remove mentions, but keep the content so they work properly for findCheaterByRef
        text = text.replace(mentionRegex, '$1');
        // Trim (again!)
        text = text.replace(/^\s+|\s+$/g, '');

        // Stage 3: Parse The Command
        let group = 'general';
        if (text.startsWith('-')) {
            const cutPoint1 = text.indexOf(' ');
            if (cutPoint1 != -1) {
                group = text.substring(1, cutPoint1);
                text = text.substring(cutPoint1);
                // Trim (once more)
                text = text.replace(/^\s+|\s+$/g, '');
            }
        }
        let command = text;
        const cutPoint2 = text.indexOf(' ');
        if (cutPoint2 != -1) {
            command = text.substring(0, cutPoint2);
            text = text.substring(cutPoint2);
            // Trim (yet again)
            text = text.replace(/^\s+|\s+$/g, '');
        } else {
            text = '';
        }
        
        // console.log([group, command, text]);
        
        // Stage 4: Actually Figure Out What Command It Is
        
        group = group.toLowerCase();
        command = command.toLowerCase();

        const groupInst: commando.CommandGroup | undefined = this.registry.groups.get(group);
        if (!groupInst)
            return this.parseUnknownCommand(message, text);

        // [SAFETY] Determine the local state of the roles module.
        let rolesState: string = getRolesState(this.client, message.guild);
        // [SAFETY] All commands that are potentially conflicting get a '-' postfix.
        if ((group != 'util') && (group != 'formatter') && (group != 'commands') && (command != 'hug') && ((rolesState != 'yes') || (group != 'roles')) && this.client.sideBySideSafety) {
            if (!command.endsWith('-'))
                return null;
            command = command.substring(0, command.length - 1);
        }
        // [SAFETY] Disable access to roles module if we don't trust it yet
        if ((rolesState == 'no') && (group == 'roles'))
            return null;

        // So much simpler via 'memberName', command: but that's "deprecated" for some silly reason
        const commandInst: commando.Command | undefined = groupInst.commands.find((cmd: commando.Command): boolean => {
            return cmd.memberName == command;
        });
        if (!commandInst)
            return this.parseUnknownCommand(message, text);

        return new commando.CommandMessage(message, commandInst, text);
    }
    
    parseUnknownCommand(message: any, text: string): commando.CommandMessage | null {
        // [SAFETY]
        if (this.client.sideBySideSafety)
            return null;
        return new commando.CommandMessage(message, this.registry.unknownCommand, text)
    }
}

export default CCBotCommandDispatcher as any;
