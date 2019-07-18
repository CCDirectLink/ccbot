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
            lines.push('To send a command, prefix the bot prefix (or a ping to the bot) followed by the command.');
            lines.push('The bot prefix/ping isn\'t necessary in DMs.');
            lines.push('`-general` is optional for these commands.');
            lines.push('');
        }
        
        for (const cmd of this.group.commands.values()) {
            const fmt = cmd.format ? ' ' + cmd.format : '';
            lines.push('** -' + this.group.id + ' ' + cmd.memberName + fmt + ' **: ' + cmd.description);
        }
        
        // Append some details on other groups
        const allGroups = this.client.registry.groups.keyArray();
        lines.push('');
        lines.push('Also see: `-' + allGroups.join(' help`, `-') + ' help`');
        
        // The text is set in stone from here on in.
        const text = lines.join('\n');
        if (message.channel.type == 'dm') {
            return await message.say('', {embed: {description: text}});
        } else {
            try {
                await message.author.sendEmbed({description: text});
                return await message.say('The help page has been sent to your DMs.');
            } catch (e) {
                return await message.say('Tried to send help information to DMs, but... are your DMs blocked?');
            }
        }
    }
}
