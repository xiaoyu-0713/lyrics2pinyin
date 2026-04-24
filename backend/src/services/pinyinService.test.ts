import { processText } from './pinyinService';

describe('pinyinService', () => {
    it('should detect polyphones correctly', () => {
        const result = processText('银行行走');
        expect(result.tokens.length).toBe(4);
        
        // "银" is not polyphone
        expect(result.tokens[0].char).toBe('银');
        expect(result.tokens[0].isPolyphone).toBe(false);
        
        // "行" in "银行" is háng
        expect(result.tokens[1].char).toBe('行');
        expect(result.tokens[1].isPolyphone).toBe(true);
        expect(result.tokens[1].pinyin).toBe('háng');
        
        // "行" in "行走" is xíng
        expect(result.tokens[2].char).toBe('行');
        expect(result.tokens[2].isPolyphone).toBe(true);
        expect(result.tokens[2].pinyin).toBe('xíng');
    });

    it('should handle non-chinese characters', () => {
        const result = processText('hello, 银行!');
        const polyTokens = result.tokens.filter(t => t.isPolyphone);
        expect(polyTokens.length).toBe(1);
        expect(polyTokens[0].char).toBe('行');
    });

    it('should generate stats', () => {
        const result = processText('行不行，自行车行不行');
        // '行' has two pronunciations here: xíng and xíng
        const xingXingStat = result.stats.find(s => s.char === '行' && s.pinyin === 'xíng');
        expect(xingXingStat?.count).toBe(2);
    });

    it('should provide recommended replacement', () => {
        const result = processText('银行');
        const token = result.tokens.find(t => t.char === '行');
        expect(token?.recommendedReplacement).toBeDefined();
        expect(typeof token?.recommendedReplacement).toBe('string');
    });
});
