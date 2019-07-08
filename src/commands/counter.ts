import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';
import {PageSwitcherData} from '../entities/page-switcher';

/**
 * A counter.
 */
export default class CounterCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util counter',
            description: 'Creates a 50-page bunch of nonsense to read through for bot testing.',
            group: 'util',
            memberName: 'counter'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        const ent: PageSwitcherData = {
            type: 'page-switcher',
            channel: message.channel.id,
            user: message.author.id,
            page: 0,
            pages: [],
            killTimeout: 60000
        };
        for (let i = 0; i < 50; i++)
            ent.pages.push({
                title: 'Page ' + (i + 1),
            });
        await this.client.entities.newEntity(ent);
        // We actually don't want to let Commando have control of the message here,
        //  because it's being passed to the Entity framework.
        return [];
    }
}
