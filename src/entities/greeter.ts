import * as discord from 'discord.js';
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';
import {getRolesState, getGuildTextChannel, convertRoleGroup} from '../utils';
import {newVM, runFormat} from '../formatter';

/**
 * Implements greetings and role assignment.
 */
class GreeterEntity extends CCBotEntity {
    private memberListener: (m: discord.GuildMember) => void;
    
    public constructor(c: CCBot, data: EntityData) {
        super(c, 'greeter-manager', data);
        this.memberListener = (m: discord.GuildMember): void => {
            if (this.killed)
                return;
            const rolesState: string = getRolesState(this.client, m.guild);
            if (rolesState == 'no')
                return;
            const channel = getGuildTextChannel(c, m.guild, 'greet');
            if (channel) {
                const greeting = c.provider.get(m.guild, 'greeting');
                if (greeting) {
                    channel.send(runFormat(greeting.toString(), newVM({
                        client: c,
                        channel: channel,
                        cause: m.user
                    })));
                }
            }
            m.addRoles(convertRoleGroup(c, m.guild, 'auto-role'));
        };
        this.client.on('guildMemberAdd', this.memberListener);
    }
    
    public onKill(): void {
        super.onKill();
        this.client.removeListener('guildMemberAdd', this.memberListener);
    }
}

export default async function load(c: CCBot, data: EntityData): Promise<CCBotEntity> {
    return new GreeterEntity(c, data);
}
