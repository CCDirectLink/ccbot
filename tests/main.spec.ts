import { expect } from 'chai';
import DynamicDataManager from '../src/dynamic-data';

describe('DynamicDataManager', (): void => {
    const ddm: DynamicDataManager = new DynamicDataManager();
    it('should have a well-formed JSON command set', (): void => {
        const seen: {[name: string]: true} = {};
        // Type-check everything.
        expect(ddm.commands.data.constructor).to.equal(Object);
        for (const group in ddm.commands.data) {
            expect(group.constructor).to.equal(String);
            expect(ddm.commands.data[group].constructor).to.equal(Object);
            for (const name in ddm.commands.data[group]) {
                expect(seen).to.not.haveOwnProperty(name);
                seen[name] = true;
                expect(name.constructor).to.equal(String);
                const cmd = ddm.commands.data[group][name];
                expect(cmd.constructor).to.equal(Object);
                // Confirm embeds exist.
                if (cmd.embed)
                    expect(ddm.embeds.data).to.haveOwnProperty(cmd.embed);
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
