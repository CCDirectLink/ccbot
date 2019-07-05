import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Reloads the JSON commands.
 */
export default class ReloadCommand extends CCBotCommand {
    constructor(client: CCBot) {
        const opt = {
            name: 'reload-json',
            description: 'Reloads all JSON commands.',
            group: 'commands',
            memberName: 'reload-json'
        };
        super(client, opt);
    }
    
    run(message: commando.CommandMessage, args: string | object | string[], fromPattern: boolean): Promise<discord.Message|discord.Message[]> {
        this.client.dynamicData.commands.reload();
        this.client.dynamicData.embeds.reload();
        return message.say("[nods] <400777547991744523:leaNOD:>");
    }
};