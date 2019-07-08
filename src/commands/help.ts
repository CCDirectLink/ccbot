import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Help command in -general that's friendlier to the new dispatcher.
 */
export default class HelpCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general help',
            description: 'informs you about commands',
            group: 'general',
            memberName: 'help'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        return await message.say('for another commit');
    }
}
