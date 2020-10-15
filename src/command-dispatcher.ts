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

import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from './data/structures';
import JSONCommand from './commands/json';
import {CCBot} from './ccbot';
import {mentionRegex} from './utils';

// Not nice.
(commando as any).CommandDispatcher = require('discord.js-commando/src/dispatcher');

async function cleanupMessage(client: CCBot, message: discord.Message) {
    client.entities.killEntity('message-' + message.id, true);
    for (const r of message.reactions.values())
        if (r.me)
            await r.remove();
}

/// A modified version of CommandMessage that performs better cleanup.
class CCBotCommandMessage extends (commando.CommandMessage as any) {
    constructor(message: discord.Message, command: commando.Command | null, text: string) {
        super(message, command, text); // eslint-disable-line constructor-super
    }

    reply(content: any, options: any) {
        if (typeof content === 'string') {
            // check for error message and block it
            // don't let it "spam" a channel
            const regexp = /You may not use the/;
            if (content.match(regexp)) {
                return;
            }
        }
        return super.reply(content, options);
    }

    /// Prepares to edit a response.
    /// This modified version cleans up after whatever was happening before.
    async editResponse(a: (discord.Message | discord.Message[]), b: any): Promise<discord.Message | discord.Message[]> {
        // Kill involved entities
        if (a.constructor === Array) {
            for (const msg of a as discord.Message[])
                await cleanupMessage(this.client, msg);
        } else {
            await cleanupMessage(this.client, a as discord.Message);
        }
        // Get rid of embed
        if (b) {
            if (b.options) {
                if (!b.options.embed)
                    b.options.embed = null;
            } else {
                b.options = {embed: null};
            }
        }
        return super.editResponse(a, b);
    }
}

/// A modified version of the CommandDispatcher to apply custom parsing rules and the new CommandMessage.
class CCBotCommandDispatcher extends (commando.CommandDispatcher as any) {
    client!: CCBot;

    constructor(c: CCBot, r: commando.CommandRegistry) {
        super(c, r); // eslint-disable-line constructor-super
    }

    parseMessage(message: discord.Message): commando.CommandMessage | null {
        // Stage 1: Prefix removal, cleanup
        let text: string = message.content;

        // The regexes used here are taken from the older code.

        // Trim
        text = text.replace(/^\s+|\s+$/g, '');

        //  Get & remove the prefix
        let commandPrefix: string | undefined;
        if (message.guild) {
            commandPrefix = (message.guild as any).commandPrefix;
        } else {
            commandPrefix = this.client.commandPrefix;
        }

        // TODO: rewrite this to use an array of prefixes
        const commandPrefixMention1 = `<@!${this.client.user.id}>`;
        const commandPrefixMention2 = `<@${this.client.user.id}>`;

        if (commandPrefix && text.startsWith(commandPrefix)) {
            text = text.substring(commandPrefix.length);
        } else if (text.startsWith(commandPrefixMention1)) {
            text = text.substring(commandPrefixMention1.length);
        } else if (text.startsWith(commandPrefixMention2)) {
            text = text.substring(commandPrefixMention2.length);
        } else if (!message.guild) {
            text = text; // eslint-disable-line no-self-assign
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

        // So much simpler via 'memberName', command: but that's "deprecated" for some silly reason
        const commandInst: commando.Command | undefined = groupInst.commands.find((cmd: commando.Command): boolean => {
            return cmd.memberName == command;
        });
        if (!commandInst)
            return this.parseUnknownCommand(message, text);

        return new CCBotCommandMessage(message, commandInst, text) as unknown as commando.CommandMessage;
    }

    parseUnknownCommand(message: any, text: string): commando.CommandMessage | null {
        // This is imitating the Commando master behavior.
        // But we use it as a method for overriding the unknown-command.
        let cmd: commando.Command | null = null;
        const utilGroup: commando.CommandGroup | undefined = this.registry.groups.get('util');
        if (utilGroup)
            cmd = utilGroup.commands.find((cmd: commando.Command): boolean => {
                return cmd.memberName == 'unknown-command';
            }) || null;
        return new CCBotCommandMessage(message, cmd, text) as unknown as commando.CommandMessage;
    }
}

export default CCBotCommandDispatcher as any;
