import * as discord from 'discord.js';
import * as commando from 'discord.js-commando';
import {CCBot, CCBotCommand} from '../ccbot';

/**
 * Help command in -general that's friendlier to the new dispatcher.
 */
export default class HelpCommand extends CCBotCommand {
    public constructor(client: CCBot, group: string) {
        const opt = {
            name: '-' + group + ' help',
            description: 'provides the text you\'re reading!',
            group: group,
            memberName: 'help'
        };
        super(client, opt);
    }
    
    public async run(message: commando.CommandMessage): Promise<discord.Message|discord.Message[]> {
        const lines = [
            '__ ** ' + this.group.name + ' Commands ** __',
            ''
        ];
        
        if (this.groupID == 'general') {
            lines.push('To send a command, prefix the bot prefix (or a ping to the bot).');
            lines.push('The bot prefix/ping isn\'t necessary in DMs.');
            lines.push('`-general` is optional for these commands.');
            lines.push('');
        }
        
        for (const cmd of this.group.commands.values()) {
            const fmt = cmd.format ? ' ' + cmd.format : '';
            if (cmd.description != 'UNDOCUMENTED')
                lines.push('** -' + this.group.id + ' ' + cmd.memberName + fmt + ' **: ' + cmd.description);
        }
        
        // Append some details on other groups
        const allGroups = this.client.registry.groups.keyArray();
        lines.push('');
        lines.push('Also see: `-' + allGroups.join(' help`, `-') + ' help`');
        
        // The text is set in stone from here on in.
        const text = [lines.join('\n')];
        let index = 0;
        while (index < text.length) {
            let didSomethingThisRound = false;
            while (text[index].length > 2048) {
                const target = text[index];
                let breakp = target.lastIndexOf('\n');
                if (breakp == -1)
                    breakp = target.length / 2;
                text[index] = target.substring(0, breakp);
                if (!didSomethingThisRound) {
                    text[index + 1] = target.substring(breakp + 1);
                    didSomethingThisRound = true;
                } else {
                    text[index + 1] = target.substring(breakp + 1) + '\n' + text[index + 1];
                }
            }
            index++;
        }
        if (message.channel.type == 'dm') {
            const array: discord.Message[] = [];
            for (const str of text)
                array.push(await message.say('', {embed: {description: str}}) as discord.Message);
            return array;
        } else {
            try {
                for (const str of text)
                    await message.author.sendEmbed({description: str}) as discord.Message;
                return await message.say('The help page has been sent to your DMs.');
            } catch (e) {
                return await message.say('Tried to send help information to DMs, but... are your DMs blocked?');
            }
        }
    }
}
