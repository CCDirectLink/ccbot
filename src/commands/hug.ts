import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {findMemberByRef, emoteSafe} from '../utils';
import {userAwareGetEmote} from '../entities/user-datablock';

/**
 * For hugging.
 */
export default class HugCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: 'hug',
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
        const hugEmote = await userAwareGetEmote(this.client, message.author, message.guild || null, 'shizuHUG');
        if (!emoteSafe(hugEmote, message.channel))
            return await message.say('A configuration issue has made shizuHUG an NSFW emote, and this isn\'t an NSFW channel.');
        const hugEmoteString = hugEmote.toString().repeat(tryTimes);
        const alreadyHugged: Set<discord.User> = new Set();
        for (let i = 0; i < effectiveLength; i++) {
            const member = findMemberByRef(message.guild || null, args.people[i]);
            if (member) {
                if (alreadyHugged.has(member.user))
                    continue;
                if (member.user == message.author) {
                    lines.push('You shouldn\'t have to hug yourself, but ' + this.client.user + ' will hug you! ' + hugEmote);
                } else {
                    lines.push(hugEmoteString + ' ' + member.user.toString());
                }
                alreadyHugged.add(member.user);
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
