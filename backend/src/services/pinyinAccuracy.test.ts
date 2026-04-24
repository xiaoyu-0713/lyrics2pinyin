import { processText } from './pinyinService';

describe('pinyinService Accuracy', () => {
    it('should correctly parse tricky polyphone sentences', () => {
        const sentences = [
            { text: '人要是行，干一行行一行', expects: ['xíng', 'háng', 'xíng', 'háng'] },
            { text: '银行行长', expects: ['háng', 'háng', 'zhǎng'] },
            { text: '长春市长', expects: ['cháng', 'zhǎng'] }
        ];

        // 1.
        const res1 = processText(sentences[0].text);
        const poly1 = res1.tokens.filter(t => t.char === '行').map(t => t.pinyin);
        expect(poly1).toEqual(['xíng', 'háng', 'xíng', 'háng']);

        // 2.
        const res2 = processText(sentences[1].text);
        const poly2 = res2.tokens.filter(t => t.char === '行' || t.char === '长').map(t => t.pinyin);
        expect(poly2).toEqual(sentences[1].expects);

        // 3.
        const res3 = processText(sentences[2].text);
        const poly3 = res3.tokens.filter(t => t.char === '长').map(t => t.pinyin);
        expect(poly3).toEqual(sentences[2].expects);
    });
});
