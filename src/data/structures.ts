import {RichEmbedOptions} from 'discord.js';
// commands.json
export type Command = {
    "description"?: string,
    "nsfw"?: boolean,
    "options"?: object,

    "format"?: string,
    "embed"?: string,
    "commandReactions"?: string[]
};
export type CommandGroup = {[command: string]: Command};
export type CommandSet = {[group: string]: CommandGroup};
// secrets.json
export type Secrets = {
    "token": string,
    "commandPrefix": string,
    "owner": string | string[]
};
// embeds.json
export type EmbedSet = {[id: string]: RichEmbedOptions};
