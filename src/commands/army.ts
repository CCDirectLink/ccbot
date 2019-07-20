import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {randomArrayElement} from '../utils';

// Scientific reasons for Lea to have to exist.
const tooTinyFailReasons = [
    ' think (or do they?), therefore they are.',
    '-studying scientists advise against a non-existence policy',
    ' want to be free'
];
// Scientific reasons for Lea to avoid being spammed horizontally.
const tooWideFailReasons = [
    '-studying scientists advise against this formation',
    '-studying military scientists want the army to seem less harmful to bait the enemy',
    ' are scared of big rooms'
];
// Scientific reasons for Lea to avoid being spammed vertically.
const tooHighFailReasons = [
    '-studying scientists advise against this formation',
    '-studying military scientists want the army to seem less harmful to bait the enemy',
    '-army requires shorter vertical spaces in order to develop properly as a species',
    ' prefer low ceilings as it reminds them of home'
];

/**
 * Generalized army manufacturing plant for the Lea [NOD]
 * Not to be confused with the other NOD
 */
export default class ArmyCommand extends CCBotCommand {
    public readonly emote: string;
    public constructor(client: CCBot, group: string, name: string, emote: string) {
        const opt = {
            name: '-' + group + ' ' + name,
            description: 'summons the ' + emote + ' army',
            group: group,
            memberName: name,
            args: [
                {
                    key: 'width',
                    prompt: 'The breadth of the army? (A number.)',
                    type: 'integer'
                },
                {
                    key: 'height',
                    prompt: 'The height of the army? (A number; or not present, in which case width is put here to create a square)',
                    type: 'integer',
                    default: 0
                }
            ]
        };
        super(client, opt);
        this.emote = emote;
    }
    
    public async run(message: commando.CommandMessage, args: {width: number; height: number}): Promise<discord.Message|discord.Message[]> {
        // Awkward, but solves the issue.
        if (args.height == 0)
            args.height = args.width;
        const emoteUse = this.client.getEmote(message.guild || null, this.emote);
        // Initial safety checks
        if ((args.width < 1) || (args.height < 1))
            return message.say('the ' + emoteUse + randomArrayElement(tooTinyFailReasons) + '.');
        if (args.width > 20)
            return message.say('the ' + emoteUse + randomArrayElement(tooWideFailReasons) + '.');
        if (args.height > 10)
            return message.say('the ' + emoteUse + randomArrayElement(tooHighFailReasons) + '.');

        // Build the army
        const lines = [
            '**You are being raided!**'
        ];

        const line = emoteUse.toString().repeat(args.width);
        for (let i = 0; i < args.height; i++)
            lines.push(line);

        // More safety checks
        const text = lines.join('\n');
        if (text.length > 2000)
            return message.say('the army may be too large!');

        // Send the army
        return message.say(text);
    }
}
