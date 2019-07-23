import * as discord from 'discord.js';
import {EntityData} from '../entity-registry';
import {CCBotEntity, CCBot} from '../ccbot';
import {runRoleCommand} from '../commands/roles';

export interface ReactRolesData extends EntityData {
    // Guild ID
    guild: string;
    // Message ID
    message: string;
    // Reactstring->Role-Names mapping
    reactions: {[react: string]: string[]};
}

/**
 * Given a message that is setup by the administration (thus killing != deleting)
 *  for controlling user roles based on reactions.
 * Not perfect; performs the roles add/rm logic, but doesn't apply it to the reactions the user has.
 * That would be impossible in some cases anyway.
 */
class ReactRolesEntity extends CCBotEntity {
    private guild: discord.Guild;
    private messageId: string;
    private reactions: {[react: string]: string[]};

    public constructor(c: CCBot, g: discord.Guild, data: ReactRolesData) {
        super(c, 'message-' + data.message, data);
        this.guild = g;
        this.messageId = data.message;
        this.reactions = data.reactions;
    }
    
    public toSaveData(): ReactRolesData {
        return Object.assign(super.toSaveData(), {
            guild: this.guild.id,
            message: this.messageId,
            reactions: this.reactions
        });
    }

    public emoteReactionTouched(target: discord.Emoji, user: discord.User, add: boolean): void {
        super.emoteReactionTouched(target, user, add);
        const member = this.guild.member(user);
        if (!member)
            return;
        const reaction = this.reactions[target.id || target.name];
        if (reaction)
            runRoleCommand(this.client, member, reaction, add);
    }
}

export default async function load(c: CCBot, data: ReactRolesData): Promise<CCBotEntity> {
    const guild = c.guilds.get(data.guild);
    if (!guild)
        throw new Error('unable to find the guild ' + data.guild);
    return new ReactRolesEntity(c, guild, data);
}
