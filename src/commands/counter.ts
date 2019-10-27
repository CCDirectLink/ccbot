import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {outputElements, PageSwitcherOutputElementWithCategory} from '../entities/page-switcher';

/**
 * A counter.
 */
export default class CounterCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util counter',
            description: 'Creates a 50-page bunch of nonsense to read through for bot testing.',
            group: 'util',
            memberName: 'counter',
            args: [
                {
                    key: 'error',
                    prompt: 'Triggers an error (useful for testing handling)',
                    type: 'boolean',
                    default: false
                }
            ]
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage, args: {error: boolean}): Promise<discord.Message|discord.Message[]> {
        if (args.error)
            throw new Error('The user wanted an error.');
        const pages: PageSwitcherOutputElementWithCategory[] = [];
        for (let i = 0; i < 50; i++) {
            pages.push({
                category: 'Group ' + Math.floor(i / 3),
                text: 'Element ' + (i + 1)
            });
        }
        return await outputElements(this.client, message, pages, 2, 2000);
    }
}
