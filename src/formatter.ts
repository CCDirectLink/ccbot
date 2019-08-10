import * as formatterCore from './formatter/core';
import {installBasic} from './formatter/lib-basic';
import {VMContext, installDiscord} from './formatter/lib-discord';

// This file serves as a wrapper to minimize the used API of the formatter.
// The formatter itself is customizable for code structure reasons.

export type VMContext = VMContext;

export class VM extends formatterCore.VM {
    public readonly context: VMContext;
    public constructor(context: VMContext) {
        super();
        this.context = context;
        installBasic(this);
        installDiscord(this, context);
    }
}

/**
 * Runs a line of the bot's format-syntax.
 * Credit for the theory behind the design goes in part to LISP, PHP, and in part to (er, Lanterns, what's the name of your group again?)'s bot '42'.
 *
 * Essentially, this is like PHP & 42 in operating principles;
 *  without proper encapsulation, text goes to 'standard output'.
 * The return value of the function is the text,
 *  which also makes any formatting directive implicitly usable in other ways if the system gets more complex.
 *
 * The VM within that, above, is LISP-style (different data structure though).
 * 
 * The special sequences are:
 * %: Escape character. Will escape anything, except ( outside of a list system.
 * %%: How to write '%'.
 * %(...):
 *  Execute custom format insertion. The contents of this are a recursive list.
 *  Within this, a separate set of syntax rules are defined.
 *  All that really matters here is that %(emote leaCheese) gives you <:leaCheese:257888171772215296>.
 *  Any value can be prefixed with ' to wrap it as so: (%' list)
 *  Also, " is pretty much a togglable escape.
 * /leaCheese/: Shows the leaCheese emote. For compatibility with old .cc say
 * //: Repeated verbatim, escapes text until next space. Used to keep URLs happy
 */
export const runFormat = formatterCore.runFormat;
