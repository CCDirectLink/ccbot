import { expect } from 'chai';
import DynamicDataManager from '../src/dynamic-data';

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
