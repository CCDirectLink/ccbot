# Emotes

Emotes are complicated.

Different places want their own emote namespaces,
 but they also want to share the majority of emotes with everybody else,
 and those emotes themselves come from all sorts of different other places.

In this bot, emote names are referred to as 'emote references'.
An emote reference need not be directly related to any aspect of the actual emote.

The system in this bot has a set of tiers.
Later tiers override previous tiers.

1. Directly passed to the `emoteResolverNina` function
2. Scanned Emotes. (Conflicts here result in one getting the name and the rest getting a '#<number>' postfix. Which emote is chosen is based on emotePath; see settings; and NSFW-ness.)
3. Owner-configured emotes.
4. Guild-configured emotes.
5. User-configured emotes, if allowed in this case. See SETTINGS.md: User on this. The resulting resolutions go through the rest of the layers, but this is NOT recursive!

The scanned emotes are stored in the Global Emote Registry.

The Global Emote Registry may need to be manually refreshed,
 with the command `emote emote_reset`.

The other two levels can only add or override emotes, not remove them, right now.

They use the settings `emotes` (string array, emote references) and `emote-<name>` (string, emote)

Note: For local settings, the `emotes` array is automatically maintained.

The NSFW control setting causes all emotes from that guild to be hidden outside of NSFW contexts.

## emoteResolverNina

This function is used for 'direct' emote references, which are used in `emote-<name>` settings and the like (but not for User Datablock settings, as it's not in danger of recursion there)

The name is kind of silly but keeps it from being confused with emote references or such.

This tries the following:

1. If it's a known custom emote ID (as in ID number), that emote is used.
2. If it looks like a *usage* of a custom emote, that emote is used.
3. If it passes the secret looksLikeAnEmoji function (Blame pedantic people), the text is directly transmuted as a unicode emoji.
4. Replaced with ❓ (which is a valid emoji) and previous occurs.
