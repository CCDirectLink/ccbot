# The Role Management System

The role management system is just as messy as it was in the previous bot, but now it provides a cleaner user interface.

## Concepts 1

The system has two primary concepts: Role groups and role group groups.

Both are arrays of strings, those strings being the names of the relevant objects.

Note that a role can be in several groups, and thus in several role group groups.

There are 2\* hard-coded role group, and 4 hard-coded role group groups.

\* But see user role groups.

## Concepts 2

There are 3 hard-coded role groups.

`roles-group-auto-role` is a set of roles added to members entering the guild.

In addition, if a group `roles-group-auto-user-<user ID>` exists, such as `roles-group-auto-user-234666977765883904`, that's included too.

If a user with important roles enters or leaves often, this allows them to keep their roles.

`roles-group-deny-role` is a set of roles users *cannot ever ever have, even via admin intervention*.

A group of the form `roles-group-allow-user-<user ID>` removes per-user entries from this.

A group of the form `roles-group-deny-user-<user ID>` adds per-user entries to this.

Allow takes precedence over deny.

The remaining role group(s) control what people are allowed to use what commands.

If a user has any role listed in `roles-group-purgers`, they can use `.cc purge`.

## Concepts 3

The hard-coded role group groups control how users control roles.

`roles-groups` is a list of all role groups.

All roles in groups in `roles-whitelist` can be added and removed by anyone to themselves.

`roles-exclusive` only allows up to one role in each group to be active at any given time.

Attempting to add another role will cancel out.

`roles-inclusive` forces at least one role in each group to be active at any given time.

Note that `-roles add` only considers `roles-exclusive` rules, and `-roles rm` only considers `roles-inclusive` rules.

The rules are not considered outside of these interactions.

Thus, complex interactions between role groups may lead to an inconsistent state.

## Configuring

See the 'settings' module!!!
