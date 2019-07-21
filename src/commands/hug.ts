import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {findCheaterByRef} from '../utils';

/**
 * For hugging.
 */
export default class HugCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general hug',
            description: 'hugs another user, or set of users. end the list of people with a number to hug them multiple times. Designed by Emileyah, Monika!, Kumatsun & 20kdc.',
            group: 'general',
            memberName: 'hug',
            args: [
                {
                    key: 'people',
                    prompt: 'Who to hug (and, optionally, how many times)?',
                    type: 'string',
                    infinite: true
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {people: string[]}): Promise<discord.Message|discord.Message[]> {
        /*
         * Design contributions by:
         *  Emileyah: 208763015657553921
         *  Monika!: 394808963356688394
         *  Kumatsun: 306499531665833984
         */
        if (args.people.length == 0)
            return [];
        let effectiveLength = args.people.length;
        let tryTimes = parseInt(args.people[args.people.length - 1]);
        if ((!Number.isNaN(tryTimes)) && (tryTimes < 50)) {
            effectiveLength--;
        } else {
            tryTimes = 1;
        }
        if (tryTimes < 1)
            return await message.say('The space-hugs continuum would be warped!');
        if (effectiveLength > 10)
            return await message.say('The physics of that are questionable, sadly...');
        const lines = [];
        const hugEmote = this.client.getEmote(message.guild || null, 'shizuHUG').toString().repeat(tryTimes);
        const alreadyHugged: Set<discord.User> = new Set();
        for (let i = 0; i < effectiveLength; i++) {
            const user = findCheaterByRef(message, args.people[i]);
            if (user == message.author) {
                lines.push('You shouldn\'t have to hug yourself, but ' + this.client.user + ' will hug you! ' + hugEmote);
            } else if (user) {
                if (alreadyHugged.has(user))
                    continue;
                lines.push(hugEmote + ' ' + user.toString());
                alreadyHugged.add(user);
            } else {
                lines.push('Couldn\'t find ' + args.people[i] + '!');
            }
        }
        
        const text = lines.join('\n');
        if (text.length > 2000)
            return await message.say('Hug overload!');
        return await message.say(text);
    }
}
