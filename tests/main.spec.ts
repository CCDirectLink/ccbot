import { expect } from 'chai';

describe('Hello function', (): void => {
    it('should return hello world', (): void => {
        const result = 'Hello world!';
        expect(result).to.equal('Hello world!');
    });
});
