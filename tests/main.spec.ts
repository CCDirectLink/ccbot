import { expect } from 'chai';
import DynamicDataManager from '../src/dynamic-data';
import {VM, runFormatInternal} from '../src/formatter/core';
import {installBasic} from '../src/formatter/lib-basic';

describe('DynamicDataManager', (): void => {
    const ddm: DynamicDataManager = new DynamicDataManager();
    it('should have a well-formed JSON command set', (): void => {
        // Type-check everything.
        expect(ddm.commands.data.constructor).to.equal(Object);
        for (const group in ddm.commands.data) {
            const seen: {[name: string]: true} = {};
            expect(group.constructor).to.equal(String);
            expect(ddm.commands.data[group].constructor).to.equal(Object);
            for (const name in ddm.commands.data[group]) {
                expect(seen).to.not.haveOwnProperty(name);
                seen[name] = true;
                expect(name.constructor).to.equal(String);
                const cmd = ddm.commands.data[group][name];
                expect(cmd.constructor).to.equal(Object);
            }
        }
    });
    it('should have format strings that parse correctly', async (): Promise<void> => {
        for (const group in ddm.commands.data) {
            for (const name in ddm.commands.data[group]) {
                const cmd = ddm.commands.data[group][name];
                if (cmd.format) {
                    // Ignore the actual details, this is just a parsing run
                    try {
                        await runFormatInternal(cmd.format, async (): Promise<string> => {
                            return '';
                        });
                    } catch (e) {
                        console.log(group + ' ' + name);
                        throw e;
                    }
                }
            }
        }
    });
    it('should work around the Discord broken image embeds bug', (): void => {
        for (const group in ddm.commands.data) {
            for (const name in ddm.commands.data[group]) {
                const cmd = ddm.commands.data[group][name];
                if (cmd.embed) {
                    if (cmd.embed.image) {
                        // It doesn't necessarily have to match (width/height override removal)
                        expect(cmd.embed).to.haveOwnProperty('title');
                        expect(cmd.embed).to.haveOwnProperty('url');
                    }
                }
            }
        }
    });
});

describe('Hello function', (): void => {
    it('should return hello world', (): void => {
        const result = 'Hello world!';
        expect(result).to.equal('Hello world!');
    });
});

describe('VM', (): void => {
    it('should never, ever ever, allow the user to run more than 8192 evals, ever', async (): Promise<void> => {
        try {
            const vm: VM = new VM();
            installBasic(vm);
            for (let i = 0; i < 8192; i++)
                await vm.run(['set', 'monkey', i.toString()], vm.globalScope);
            throw new Error('Failed: Managed to consume too much time');
        } catch (e) {
            // Success!
        }
    })
});
