// Copyright (C) 2019-2020 CCDirectLink members
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import {VM, VMScope, asBoolean, asInteger, asString, asList, wrapFunc, Value, falseValue, trueValue} from './core';
import {checkIntegerResult} from '../utils';
const vmConcatCharacterTime = 1;
//const vmLetTime = 1;

export function setFunc(targetRaw: Value, sourceRaw: Value, scope: VMScope): void {
    if (typeof targetRaw === 'string') {
        const target = asString(targetRaw);
        const source = asString(sourceRaw);
        const sourceFn = scope.getFunction(source);
        if (!sourceFn) {
            throw new Error(`Attempted function copy, but ${source} did not exist`);
        } else {
            scope.addFunction(target, sourceFn, false);
        }
        return;
    }
    const signature = asList(targetRaw);
    if (signature.length < 1)
        throw new Error('set-func signature list needs to have a name in it.');
    const name = asString(signature[0]);
    const arg: string[] = [];
    for (let i = 1; i < signature.length; i++)
        arg.push(asString(signature[i]));
    scope.addFunction(name, wrapFunc(name, arg.length, async (runArgs: Value[]): Promise<Value> => {
        const subScope = scope.extend();
        for (let i = 0; i < arg.length; i++)
            subScope.addFunction(arg[i], wrapFunc(`arg ${arg[i]}`, 0, async (): Promise<Value> => runArgs[i]), true);
        return scope.vm.run(sourceRaw, subScope);
    }), false);
}

export function installBasic(vm: VM): void {
    /// As of the latest iteration, I'm no longer trying to make it like LISP,
    /// but more like it's own thing only roughly based on LISP ideas.
    /// I'm also trying to avoid it going too computationally far -
    /// 'if' exists as a concession to the need to display errors or special-case outputs.
    /// Those who disagree with this policy can go see the Overpowered Command Set.
    vm.install({
        // Meta
        '\'': async (args: Value[]): Promise<Value> => {
            if (args.length != 2)
                throw new Error('Incorrect form for \'');
            return args[1];
        },
        // Tests
        'number?': wrapFunc('number?', 1, async (args: Value[]): Promise<Value> => {
            try {
                asInteger(args[0]);
                return trueValue;
            } catch (e) {
                return falseValue;
            }
        }),
        '==': wrapFunc('==', 2, async (args: Value[]): Promise<Value> => {
            // String equivalence.
            // Since numbers are strings here, things probably work out.
            // This is a built-in and we don't trust built-ins to handle recursive functions if we can help it
            if (Array.isArray(args[0]) || Array.isArray(args[1]))
                throw new Error('Not allowed to check equality of lists with \'=\'');
            return (args[0] === args[1]) ? trueValue : falseValue;
        }),
        '>=': wrapFunc('>=', 2, async (args: Value[]): Promise<Value> => {
            // The only one of the relative comparison operators that's actually needed.
            return (asInteger(args[0]) >= asInteger(args[1])) ? trueValue : falseValue;
        }),
        // Maths
        'random': wrapFunc('random', 1, async (args: Value[]): Promise<Value> => {
            const size = asInteger(args[0]);
            return Math.floor(Math.random() * size).toString();
        }),
        '+': wrapFunc('+', 2, async (args: Value[]): Promise<Value> => {
            let acc = 0;
            for (const val of args)
                acc += asInteger(val);
            checkIntegerResult(acc);
            return acc.toString();
        }),
        '*': wrapFunc('*', 2, async (args: Value[]): Promise<Value> => {
            let acc = 1;
            for (const val of args)
                acc *= asInteger(val);
            checkIntegerResult(acc);
            return acc.toString();
        }),
        // Operations
        'length': wrapFunc('length', 1, async (args: Value[]): Promise<Value> => {
            const res = args[0];
            if (Array.isArray(res) || typeof res === 'string')
                return res.length.toString();
            throw new Error('Attempted to get length of non-list');
        }),
        'nth': wrapFunc('nth', 2, async (args: Value[]): Promise<Value> => {
            const index = asInteger(args[0]);
            const res = args[1];
            if (Array.isArray(res) || (typeof res === 'string')) {
                if ((index >= 0) && (index < res.length))
                    return res[index];
            }
            throw new Error(`Index out of bounds for nth: ${res.toString()}[${index}]`);
        }),
        'list': wrapFunc('list', -1, async (args: Value[]): Promise<Value> => {
            return args;
        }),
        'strcat': async (args: Value[], scope: VMScope): Promise<Value> => {
            let first = true;
            const workspace = [];
            for (const value of args) {
                if (first) {
                    first = false;
                    continue;
                }
                const content = asString(await vm.run(value, scope));
                // WARNING! THIS ACTS AS A MEMORY LIMITER. DO NOT, REPEAT, DO NOT, REMOVE.
                vm.consumeTime(content.length * vmConcatCharacterTime);
                workspace.push(content);
            }
            return workspace.join('');
        },
        // Functions, Variables & Scopes
        'set': async (args: Value[], scope: VMScope): Promise<Value> => {
            if (args.length != 3)
                throw new Error('Incorrect form for set');
            const name = asString(await vm.run(args[1], scope));
            const value = await vm.run(args[2], scope);
            scope.addFunction(name, wrapFunc(`set ${name}`, 0, async (): Promise<Value> => {
                return value;
            }), false);
            return value;
        },
        'set-func': async (createArgs: Value[], scope: VMScope): Promise<Value> => {
            // (set-func (test a b c) ())
            // (set-func target source)
            if (createArgs.length != 3)
                throw new Error('Incorrect form for set-func');
            setFunc(createArgs[1], createArgs[2], scope);
            return falseValue;
        },
        // Control Flow
        'if': async (args: Value[], scope: VMScope): Promise<Value> => {
            if ((args.length != 3) && (args.length != 4))
                throw new Error('Incorrect form for if');
            const res = await vm.run(args[1], scope);
            if (!asBoolean(res)) {
                if (args.length != 4)
                    return res;
                return await vm.run(args[3], scope);
            }
            return await vm.run(args[2], scope);
        }
    });
    // Stuff that's written in the language itself to reduce the amount of code we have to worry about.
    setFunc(['random-element', 'array'], ['nth', ['random', ['length', ['array']]], ['array']], vm.globalScope);
    setFunc(['not', 'a'], ['if', ['a'], falseValue, trueValue], vm.globalScope);
    setFunc(['!=', 'a', 'b'], ['not', ['=', ['a'], ['b']]], vm.globalScope);
    setFunc(['>', 'a', 'b'], ['not', [['>='], ['b'], ['a']]], vm.globalScope);
    setFunc(['<', 'a', 'b'], ['not', [['>='], ['a'], ['b']]], vm.globalScope);
    setFunc(['<=', 'a', 'b'], ['>=', ['b'], ['a']], vm.globalScope);
    setFunc(['-', 'a', 'b'], ['+', ['a'], ['*', '-1', ['b']]], vm.globalScope);
}

// <editor-fold defaultstate="collapsed" desc="OVERPOWERED! Don't use these">
/*
function installOverpowered(vm: VM): void {
    // Things we don't need now that we might want later.
    // Not fully tested.
    vm.install({
        'string?': wrapFunc('string?', 1, async (args: Value[]): Promise<Value> => {
            // (string? V) -> bool
            try {
                asString(args[0]);
                return trueValue;
            } catch (e) {
                return falseValue;
            }
        }),
        'list?': wrapFunc('list?', 1, async (args: Value[]): Promise<Value> => {
            // (list? V) -> bool
            try {
                asList(args[0]);
                return trueValue;
            } catch (e) {
                return falseValue;
            }
        }),
        'let': async (args: Value[], scope: VMScope): Promise<Value> => {
            // (let (names...) stmt) -> return value
            // (let (names...) values stmt) -> return value
            // second form does run values expr; intended to be used for, say: (let (a b c) (args) (code))
            if ((args.length != 3) && (args.length != 4))
                throw new Error('Incorrect form for let');
            const names = asList(args[1]);
            const values: Value[] | null = (args.length == 4) ? asList(await vm.run(args[2], scope)) : null;
            if (values && (values.length != names.length))
                throw new Error('Expected ' + names.length + ' values, got ' + values.length);
            const newScope = scope.extend();
            let index = 0;
            for (const name of names) {
                vm.consumeTime(vmLetTime);
                const nameStr = asString(name);
                newScope.addFunction(nameStr, wrapFunc('let ' + nameStr, 0, async (): Promise<Value> => {
                    if (values) {
                        return values[index];
                    } else {
                        throw new Error('Unassigned local variable ' + nameStr);
                    }
                }), true);
                index++;
            }
            return await vm.run(args[args.length - 1], newScope);
        },
        'run': wrapFunc('run', 1, async (args: Value[], scope: VMScope): Promise<Value> => {
            // (run X) : evaluates twice rather than just once!
            return await vm.run(args[0], scope);
        })
    });
}*/
// </editor-fold>
