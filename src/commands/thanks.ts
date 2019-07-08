import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Thanks the RFG developers for an awesome game.
 */
export default class ThanksCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general thanks',
            description: 'Writes a template thank-you message to the devs :)',
            group: 'general',
            memberName: 'thanks'
        };
        super(client, opt);
    }
    
    public run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        let thankYouMessage = '';
        if (Math.random() > 0.5) {
            thankYouMessage = 'Keep up the good work!';
        } else {
            thankYouMessage = 'You guys are awesome.';
        }
        
        return message.replyEmbed(new discord.RichEmbed({
            description: 'From ' + message.member.nickname + ',\n\t' + thankYouMessage + '\nTo,\n\t\tRadical Fish Games'
        }));
    }
}
