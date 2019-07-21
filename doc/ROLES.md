# The Role Management System

The role management system is just as messy as it was in the previous bot, but now it provides a cleaner user interface.

## Concepts

The system has two primary concepts: Role groups and role group groups.

Both are arrays of strings, those strings being the names of the relevant objects.

There are 2 hard-coded role groups, and 2 hard-coded role group groups.


The first hard-coded role group is `roles-group-whitelist`.

`roles-group-whitelist` roles can be added and removed by anyone to themselves.

The other hard-coded role group is `roles-group-auto-role`.
This isn't currently implemented because the logic behind it isn't understood enough yet for a better implementation.

The hard-coded role group groups add additional rules to `roles-group-whitelist`.

`roles-exclusive` only allows up to one role in each group to be active at any given time.

Attempting to add another role will cancel out.

`roles-inclusive` forces at least one role in each group to be active at any given time.

Note that `-roles add` only considers `roles-exclusive` rules, and `-roles rm` only considers `roles-inclusive` rules.

The rules are not considered outside of these interactions.

Thus, complex interactions between role groups may lead to an inconsistent state.

## Configuring

See the 'settings' module!!!
