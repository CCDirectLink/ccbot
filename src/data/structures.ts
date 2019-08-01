import {RichEmbedOptions} from 'discord.js';
// commands.json
export interface Command {
    // The description. Defaults to 'No Description'.
    description?: string;
    // Ensures this command will only run in NSFW channels.
    // Uses a different definition of NSFW channel to Commando.
    nsfw?: boolean;
    // Commando command info override.
    options?: object;

    // The text. May contain traces of format directives, prefixed with %.
    // See formatter.ts for more details.
    format?: string;
    // Embed (Note, however, that all strings here are valid targets for format directives!)
    embed?: RichEmbedOptions;
    // Reactions to the command.
    commandReactions?: string[];
}
export interface CommandGroup {[command: string]: Command}
export interface CommandSet {[group: string]: CommandGroup}

// secrets.json
export interface Secrets {
    // The Discord bot token.
    token: string;
    // Prefix for commands.
    commandPrefix: string;
    // Bot owners.
    owner: string | string[];
    // Ensures the old-behaviors entity isn't registered, as this has authority
    //  to do all sorts of 'odd' things that could interfere with a side-by-side
    //  run with the old software.
    safety: boolean;
    // The amount of time before deleting messages in the output cache, in milliseconds.
    // For default, see main.ts
    outputCacheTimeout?: number;
}

// entities.json - array of newEntity data objects
export type EntitySet = object[];

// Implements the persistence backend.
export interface GuildData {[setting: string]: object}

export interface GuildIndex {[guildID: string]: GuildData}

// CCModsDB ( https://raw.githubusercontent.com/CCDirectLink/CCModDB/master/mods.json )
export interface ModPage {
    name: string;
    url: string;
}
export interface Mod {
    name: string;
    version: string;
    description?: string | null;
    license?: string | null;
    page: ModPage[];
    archive_link: string;
    hash: { sha256?: string };
}
export interface ModsIndex {
    mods: {[name: string]: Mod};
}