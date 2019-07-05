import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import * as structures from '../data/structures';
import {nsfw} from '../utils';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * A JSON-run "command", but really more like a responder.
 */
export default class JSONCommand extends CCBotCommand {
    readonly command: structures.Command;
    
    constructor(client: CCBot, group: string, name: string, json: structures.Command) {
        const opt = {
            name: name.toLowerCase(),
            description: json.description || 'No description.',
            group: group.toLowerCase(),
            memberName: name.toLowerCase()
        };
        // Allows overriding the involved Commando options.
        if (json.options)
            Object.assign(opt, json.options);
        super(client, opt);
        this.command = json;
    }
    
    async run(message: commando.CommandMessage, args: string | object | string[], fromPattern: boolean): Promise<discord.Message|discord.Message[]> {
        if (this.command.nsfw && !nsfw(message.channel)) {
            // Need to log & use channel NSFWness
            return await message.say('That command is NSFW, and this is not an NSFW channel.');
        }
        // Message Options
        const opts: discord.MessageOptions = {};
        let hasMeta: boolean = false;
        if (this.command.embed) {
            if (!(this.command.embed in this.client.dynamicData.embeds.data)) {
                return await message.say('The embed \'' + this.command.embed + '\' was not available.');
            } else {
                opts.embed = this.client.dynamicData.embeds.data[this.command.embed];
                hasMeta = true;
            }
        }
        // Side-effects (reacts)
        if (this.command.commandReactions)
            for (const react of this.command.commandReactions)
                await message.react(react);
        // Actually send resulting message if necessary
        if (this.command.format || hasMeta)
            return await message.say(this.command.format || '', opts);
        return [];
    }
};