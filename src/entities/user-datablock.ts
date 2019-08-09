import * as discord from 'discord.js';
import {CCBotEntity, CCBot} from '../ccbot';
import {EntityData} from '../entity-registry';

export interface UserDatablockEntityData extends EntityData {
    who: string;
    content: string;
}

// 30 days
const userDatablockTTL = 30 * (24 * 60 * 60 * 1000);
// This should leave a few extra characters in the embed window for show-user-settings.
const userDatablockMaxLength = 2000;

/**
 * Dumb storage with a deathclock on it.
 */
export class UserDatablockEntity extends CCBotEntity {
    public who: string;
    public content: string;
    
    public constructor(c: CCBot, data: UserDatablockEntityData) {
        // Reset timeouts if we change TTL, but try to stagger resulting deathclocks over a 16-second period.
        if (data.killTimeout !== userDatablockTTL) {
            data.killTime = Date.now() + userDatablockTTL + ((data.createTime || 0) % 16000);
            data.killTimeout = userDatablockTTL;
        }
        super(c, 'user-datablock-' + data.who, data);
        this.who = data.who;
        this.content = data.content;
    }
    
    public get(): Record<string, any> {
        this.postponeDeathAndUpdate();
        return JSON.parse(this.content);
    }
    public set(updated: Record<string, any>): void {
        const res = JSON.stringify(updated, null, '\t');
        if (res.length > userDatablockMaxLength)
            throw new Error('User Datablock cannot be above ' + userDatablockMaxLength + ' characters.');
        this.content = res;
        this.postponeDeathAndUpdate();
    }
    
    public toSaveData(): UserDatablockEntityData {
        return Object.assign(super.toSaveData(), {
            who: this.who,
            content: this.content
        });
    }
}

export async function loadUserDatablock(c: CCBot, data: UserDatablockEntityData): Promise<CCBotEntity> {
    return new UserDatablockEntity(c, data);
}

export async function getUserDatablock(c: CCBot, user: discord.User | string): Promise<UserDatablockEntity> {
    if (user.constructor === String) {
        user = user as string;
    } else {
        user = (user as discord.User).id;
    }
    const id = 'user-datablock-' + user;
    if (id in c.entities.entities) {
        return c.entities.entities[id] as UserDatablockEntity;
    } else {
        const res = new UserDatablockEntity(c, {
            type: 'user-datablock',
            who: user,
            content: '{}'
        });
        c.entities.newEntitySync(res);
        return res;
    }
}

export async function userAwareGetEmote(c: CCBot, user: discord.User | string | null, guild: discord.Guild | null, name: string): Promise<discord.Emoji> {
    if (user) {
        const datablock = await getUserDatablock(c, user);
        const res = datablock.get()['emote-' + name];
        if (res)
            return c.emoteRegistry.getEmote(null, String(res));
    }
    return c.emoteRegistry.getEmote(guild, name);
}