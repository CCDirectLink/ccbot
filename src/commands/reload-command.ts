import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Reloads the JSON commands.
 */
export default class ReloadCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: 'reload-json',
            description: 'Reloads all JSON commands. Only usable by bot owner.',
            group: 'commands',
            memberName: 'reload-json',
            ownerOnly: true
        };
        super(client, opt);
    }
    
    public run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        this.client.dynamicData.commands.reload();
        this.client.dynamicData.embeds.reload();
        return message.say('[nods] <:leaNOD:400777547991744523>');
    }
}
