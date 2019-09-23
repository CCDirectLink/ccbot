import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Inspires you with a quote.
 */
export class InspireCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-general inspire',
            description: 'inspires you with a quote',
            group: 'general',
            memberName: 'inspire'
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        const quotes: string[] = this.client.provider.get('global', 'quotes', []);
        const lastQuote: number = this.client.provider.get('global', 'lastQuote', -1);
        if (quotes.length == 0)
            return message.say('I\'m actually two thirds space alien, one third goat, another two thirds blueberry, and five thirds pure, unintensified hugs.\nAnd I have no quotes for you.');
        if (quotes.length == 1) {
            if (lastQuote != 0)
                await this.client.provider.set('global', 'lastQuote', 0);
            return message.say('0: ' + quotes[0]);
        }
        const effectiveLength: number = ((lastQuote >= 0) && (lastQuote < quotes.length)) ? (quotes.length - 1) : quotes.length;
        let target = Math.floor(Math.random() * effectiveLength);
        if (lastQuote >= 0)
            if (target >= lastQuote)
                target++;
        await this.client.provider.set('global', 'lastQuote', target);
        return message.say(target + ': ' + quotes[target]);
    }
}

/**
 * Adds a quote.
 */
export class AddQuoteCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util add-quote',
            description: 'adds a quote',
            group: 'util',
            memberName: 'add-quote',
            ownerOnly: true,
            args: [
                {
                    key: 'quote',
                    prompt: 'Text?',
                    type: 'string'
                }
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {quote: string}): Promise<discord.Message|discord.Message[]> {
        const quotes: string[] = this.client.provider.get('global', 'quotes', []);
        const newQuotes: string[] = JSON.parse(JSON.stringify(quotes));
        newQuotes.push(args.quote);
        await this.client.provider.set('global', 'quotes', newQuotes);
        return message.say('Done, this is quote ' + quotes.length); // *not* newQuotes, then it'd have to -1
    }
}

/**
 * Removes a quote.
 */
export class RmQuoteCommand extends CCBotCommand {
    public constructor(client: CCBot) {
        const opt = {
            name: '-util rm-quote',
            description: 'removes a quote',
            group: 'util',
            memberName: 'rm-quote',
            ownerOnly: true,
            args: [
                {
                    key: 'quote',
                    prompt: 'ID?',
                    type: 'integer'
                }
            ]
        };
        super(client, opt);
    }

    public async run(message: commando.CommandMessage, args: {quote: number}): Promise<discord.Message|discord.Message[]> {
        const quotes: string[] = this.client.provider.get('global', 'quotes', []);
        const newQuotes: string[] = JSON.parse(JSON.stringify(quotes));
        if (args.quote < 0)
            return message.say('Can\'t, Curly Brace would be mad.');
        if (args.quote >= newQuotes.length)
            return message.say('Can\'t, the *other* Curly Brace would be mad.');
        newQuotes.splice(args.quote, 1);
        await this.client.provider.set('global', 'quotes', newQuotes);
        return message.say('Done, this is quote ' + quotes.length); // *not* newQuotes, then it'd have to -1
    }
}
