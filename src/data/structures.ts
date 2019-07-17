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

    // The text. At some point, may be expanded to contain formatting directives (hence the name).
    // The character '%' is reserved for said formatting directives.
    // As such, '%%' will be replaced with '%' as a form of escaping.
    format?: string;
    // Embed
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
}

// entities.json - array of newEntity data objects
export type EntitySet = object[];

// Implements the persistence backend.
export interface GuildData {[setting: string]: object}

export interface GuildIndex {[guildID: string]: GuildData}