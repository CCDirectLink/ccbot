# Settings

All of these are described individually too.

They can be controlled per-guild by the local ADMINISTRATOR or bot owners.

They can be controlled globally only by bot owners.

## Global

`nsfw-<GUILD ID>`: Boolean, effectively forcefully enables the per-guild `nsfw` setting.
Example: `-util set-boolean nsfw-558469426765103135 true`

## Per-Guild

`nsfw`: All emotes that come from this guild are marked NSFW

`roles-*`: Please see `ROLES.md`

`channel-*`: Specifies utility channels by name. Their names are taken from the old system.

`greeting`: Specifies the bot's greeting, if usable.

## Both

`prefix`: Part of Commando
`emotes`: See EMOTES.md
`emote-<EMOTE REF>`: See EMOTES.md

`headerless-say`: Removes the "who did it" header from the `say` command.
 Does *not* do "if not per-guild, fallover to global setting", but instead is useful to make DMs nicer.

(document Commando's enable/disable system at some point)