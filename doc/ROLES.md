# The Role Management System

The role management system is just as messy as it was in the previous bot, but now it provides a cleaner user interface.

## Concepts

The system has two primary concepts: Role groups and role group groups.

Both are arrays of strings, those strings being the names of the relevant objects.

Note that a role can be in several groups, and thus in several role group groups.

There is 1 hard-coded role group, and 3 hard-coded role group groups.

The hard-coded role group is `roles-group-auto-role`.

This is a set of roles added to members entering the guild.

The hard-coded role group groups control how users control roles.

All roles in groups in `roles-whitelist` can be added and removed by anyone to themselves.

`roles-exclusive` only allows up to one role in each group to be active at any given time.

Attempting to add another role will cancel out.

`roles-inclusive` forces at least one role in each group to be active at any given time.

Note that `-roles add` only considers `roles-exclusive` rules, and `-roles rm` only considers `roles-inclusive` rules.

The rules are not considered outside of these interactions.

Thus, complex interactions between role groups may lead to an inconsistent state.

## Configuring

See the 'settings' module!!!
