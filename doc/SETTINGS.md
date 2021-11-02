# Settings

All of these are described individually too.

When updating this file, please update settings.ts with setting validity logic.

They can be controlled per-guild by the local ADMINISTRATOR or bot owners.

They can be controlled globally only by bot owners.

## Global (global)

`nsfw-<GUILD ID>`: Boolean, effectively forcefully enables the per-guild `nsfw` setting.

`emotePath`: Array of strings; guild IDs, from most important to least, from which to prioritize emotes.

`quotes`: Array of strings: Quotes.

`lastQuote`: The index of the last shown quote to prevent repetition.

## Per-Guild (local)

`nsfw`: All emotes that come from this guild are marked NSFW

`emotes-sfw`: Array of emotes that are definitely SFW, by Discord emote ID (not names!)
 (NOTE: If you even need to consider doing a global override here:
  have you considered taking it up with the admin;
  or failing that, forcing all emotes they have to be considered NSFW?)

`roles-*`: Please see `ROLES.md`

`channel-greet`: Greeting channel name

`channel-info`: Information channel name

`channel-syslog`: System log channel name

`channel-editlog`: Edit log channel name

`greeting`: Specifies the bot's greeting, if usable.

`dm-greeting`: Specifies the greeting sent to DMs.

`farewell`: Specifies the message to post into `channel-greet` when a member leaves (very logical and totally not ad-hoc, I know).

## Both (local, global)

`prefix`: Part of Commando

`emotes`: See EMOTES.md (Automatically maintained for per-guild settings)

`emote-<EMOTE REF>`: See EMOTES.md. Values are emoteResolverNina inputs because otherwise it would be recursive.

`emotes-registry-allowList` and `emotes-registry-blockList`: Used for filtering emotes when building the bot's emote registry. The block list takes priority over the allow list. Setting allow list to an empty array will effectively stop the bot from loading any emotes from a given guild. NOTE: This setting shouldn't be used for censoring emotes as emojiResolverNina allows sending emotes by ID! Also local administrators can still use the `emotes` array to expose emotes globally, which is a feature: in conjunction with allow/block lists it can be used for using different names (renaming) of guild emotes in emojiResolverNina.

`headerless-say`: Removes the "who did it" header from the `say` command.
 Does *not* do "if not per-guild, fallover to global setting", but instead is useful to make DMs nicer.

(document Commando's enable/disable system at some point)

## User-local (user)

`emote-<EMOTE REF>`: Local user aliases. These do not show up in lsemotes. They can have some effects on commands. These are emote references, NOT emoteResolverNina inputs
`bootstrap`: Prepended to all 'say's
