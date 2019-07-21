# Entities

The entity system here is a feature added by this bot's codebase.

They aren't present in the Commando framework itself.

As such, they need documentation to help you understand and use them.

## Principles

Entities follow some basic principles:

1. `newEntity` Completion Is Readiness - that is, if the newEntity Promise
 resolves, the entity is fully initialized.
Note that if the load function is run and completes, then so will newEntity.
The entity *should not* suddenly and immediately self-destruct on load due to a
 failed fetchMessage.
The entity *may* self-destruct on load due to having gone past the end of it's
 planned lifetime, but this should only occur if the entity was supposed to
 do this while alive.
This becomes important on the technical side of how entities are created,
 and becomes important for the structural concerns TypeScript raises.

2. IDs Are Ownership - that is, the entity for `message-597188020734787625`
 "owns" that message, and *may* delete it on death.
This becomes important for the primary use of entities later on.

3. Entities Encapsulate Arbitrary Behaviors - Entities may do whatever they want
 while they're living and during, but not after, death.
An Entity is allowed to, for example, randomly hug people on the stroke of
 midnight every Thursday, though that may constitute a violation of local guild
 rules dependent on where the bot is operating.
This implies at least a level of control over node.js timing primitives and
 discord.js-level objects.

4. Entity Construction Assumes An Eventual Kill - An entity that is constructed
 must eventually be killed, assuming no data loss.
The kill may take place in an entirely different run of the bot, however.
The bot's shutdown *does not* kill all entities, as those entities that have
 been saved might, if automatically killed, delete resources the saved versions
 depend on (such as, say, emote-based voting messages, should that occur).
The resolving or rejection of load's promise is considered a guarantee of a
 consistent state, and in the case of resolving, a guarantee of an eventual
 kill() for the entity by some means or another.
In practice, this should not be considered absolute, and in cases where the
 bot's shutdown occurs shortly after entity creation, entities may never be
 killed.

## Structure

The terms `whatever-cat`, `loadWhateverCat`, `WhateverCatData`,
 and `WhateverCatEntity` refer to the four names for various entity parts.

`whatever` - The entity's `type` constant in all-entities, but which is also
 referred to from the command body.
This is not constrained in WhateverCatData due to type-checking issues.

`loadWhateverCat` - This is the name used in all-entities to import the loader.
The name actually used in the defining TS file is simply `load`.

`WhateverCatData` - The entity's data interface. Extends EntityData.

`WhateverCatEntity` - The entity class itself.
May be private, but should be consistent for debugging.

An Entity-defining TS file contains at least a `load` function.
It should be `export default`, and of the form:
 `async function load(c: CCBot, data: WData): Promise<CCBotEntity>`.
Implicit in this is the assertion that an entity with the correct type constant
 has data of that form, allowing for cleaner code.
More explicitly, the creation of an entity is an asynchronous process that may
 take time to fetch involved messages and other Discord state.
While not strictly necessary in the Discord API, discord.js requires it.

The file may contain a WhateverData interface, or it may use EntityData instead.
This is used for type-checking the initialization JSON object of an entity from
 an entity or command spawning the entity.
(In case of dependency loops, relevant structures should be moved
 to the data/structures.ts file.)

## The Load Function And What It Actually Does

The load function's purpose is to ensure that readonly fields can be initialized
 with fixed values that aren't known when the load function starts.

For, say, a manager entity for a specific message, this may involve creating
 the message itself if none has been provided in the data.

This allows for a simple `newEntity`-based way to create a message with some
 interactive behavior, as a channel ID is required anyway in Discord to get
 a specific message by ID.

The load function initializes the message and supplies the message ID,
 and the constructor of the actual entity can act as if the state was loaded,
 which improves the code's simplicity.

It then passes the resulting state, which is essentially a group of field
 initializers, to the entity's constructor.

## How An Entity Works

An Entity subclass passes the ID and core EntityData to it's constructor.

Once constructed, it can immediately do whatever it likes.

It has access to the client, may receive events dependent on the ID,
 and may add handlers to get access to other events.

(As an entity can only be gotten rid of by bot shutdown or kill, there's no risk
 that adding these handlers to the client could lead to a handler->object leak,
 assuming onKill detaches the handlers properly.
There is a risk that entities that do not have some kill condition could be
 effectively leaking, but that's a matter of the entity's policy,
 or if the entity doesn't force a killTime, the entity creator's policy.)

## Known Entity IDs

`activity-manager`: In control of the current activity.
Expected to update on construction - not allowed to clear on kill.
This is because on kill, the new manager may have already been constructed.
If it's particularly needed to clear the current activity,
 create a 'no-activity' activity-manager entity.

`message-SOMEIDHERE`: For `message.id == 'SOMEIDHERE'`, usually more numeric,
 acts as the manager for that message.
This ensures that message-related events are sent to the entity, but it also
 implies that killing the manager may delete the message in some cases.

`old-behaviors-manager`: Meant to be an instance of the `old-behaviors` entity.

`greeter-manager`: Implements 'greeting'.