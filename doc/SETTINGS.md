# Settings

All of these are described individually too.

When updating this file, please update settings.ts with setting validity logic.

They can be controlled per-guild by the local ADMINISTRATOR or bot owners.

They can be controlled globally only by bot owners.

## Global

`nsfw-<GUILD ID>`: Boolean, effectively forcefully enables the per-guild `nsfw` setting.
Example: `-util set-boolean nsfw-558469426765103135 true`

`emotePath`: Array of strings; guild IDs, from most important to least, from which to prioritize emotes.

## Per-Guild

`nsfw`: All emotes that come from this guild are marked NSFW

`roles-*`: Please see `ROLES.md`

`optin-roles`: roles module access state for side-by-side:
 'no' (not valid), 'both' (has '-' prefix), 'yes' (overlaps original bot)

`channel-*`: Specifies utility channels by name. Their names are taken from the old system.

`greeting`: Specifies the bot's greeting, if usable.

## Both

`prefix`: Part of Commando
`emotes`: See EMOTES.md (Automatically maintained for per-guild settings)
`emote-<EMOTE REF>`: See EMOTES.md

`headerless-say`: Removes the "who did it" header from the `say` command.
 Does *not* do "if not per-guild, fallover to global setting", but instead is useful to make DMs nicer.

(document Commando's enable/disable system at some point)
