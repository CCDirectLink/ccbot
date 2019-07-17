# Emotes

Emotes are complicated.

Different places want their own emote namespaces,
 but they also want to share the majority of emotes with everybody else,
 and those emotes themselves come from all sorts of different other places.

In this bot, emote names are referred to as 'emote references'.
An emote reference need not be directly related to any aspect of the actual emote.

The system in this bot has 3 tiers.

Later tiers override previous tiers.

1. Scanned Emotes.
2. Owner-configured emotes.
3. Guild-configured emotes.

The scanned emotes are stored in the Global Emote Registry.

The Global Emote Registry may need to be manually refreshed,
 with the command `emote emote_reset`.

The other two levels can only add or override emotes, not remove them, right now.

They use the settings `emotes` (string array, emote references) and `emote-<name>` (string, emote)
