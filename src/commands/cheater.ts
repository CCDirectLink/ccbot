import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {findCheaterByRef} from '../utils';

/**
 * Apollo's apostle applied an application about a applicable antisocial accident.
 */
export default class CheaterCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general cheater' + client.originalBotCommandPostfix,
            description: 'accuses someone of being a C H E A T E R',
            group: 'general',
            memberName: 'cheater' + client.originalBotCommandPostfix,
            args: [
                {
                    key: 'cheater',
                    prompt: 'Who is the cheater?',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {cheater: string}): Promise<discord.Message|discord.Message[]> {
        const cheater: discord.User | null = findCheaterByRef(message, args.cheater);
        if (!cheater)
            return message.say('could not find the cheater.');
        return message.say('<@' + cheater.id + '> ' + this.client.getEmote(message.guild || null, 'apolloPoint').toString() + this.client.getEmote(message.guild || null, 'apolloShout').toString() + ' I GOT YOU NOW!');
    }
}
