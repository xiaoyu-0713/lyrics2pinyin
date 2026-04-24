import { pinyin } from 'pinyin-pro';
import { common3500Set } from '../utils/common3500';

const pinyinToCharMap: Record<string, string> = {};

// Build strict mapping for tone-specific pinyins

// Pass 1: Strict match using only 3500 common characters
for (const char of Array.from(common3500Set)) {
    const charStr = String(char);
    const pyArr = pinyin(charStr, { multiple: true, type: 'array' });
    if (pyArr.length === 1) { // Must be non-polyphone
        const py = pyArr[0];
        // Keep the first one found (which is implicitly prioritized by whatever order, though Set order is insertion order)
        // Since we iterate common3500 string which is ordered by frequency, we should NOT overwrite
        if (!pinyinToCharMap[py]) {
            pinyinToCharMap[py] = charStr;
        }
    }
}

// Pass 2: Strict match fallback to all unicode chinese characters
for (let i = 0x4e00; i <= 0x9fa5; i++) {
    const char = String.fromCharCode(i);
    // Skip if it's already in common3500
    if (common3500Set.has(char)) continue;

    const pyArr = pinyin(char, { multiple: true, type: 'array' });
    if (pyArr.length === 1) { // Must be non-polyphone
        const py = pyArr[0];
        // Only set if a common character wasn't already found for this exact tone
        if (!pinyinToCharMap[py]) {
            pinyinToCharMap[py] = char;
        }
    }
}

export interface Token {
    char: string;
    isPolyphone: boolean;
    pinyin: string;
    polyphones?: string[];
    recommendedReplacement?: string;
}

export interface ProcessResult {
    text: string;
    tokens: Token[];
    stats: { 
        char: string; 
        totalCount: number; 
        pinyins: { pinyin: string; count: number; recommendedReplacement: string }[] 
    }[];
}

export function processText(text: string, targetPolyphones?: string[], customConfig?: Record<string, Record<string, any>>): ProcessResult {
    const tokens: Token[] = [];
    const statsMap: Record<string, { totalCount: number; pinyins: Record<string, { count: number; recommendedReplacement: string }> }> = {};

    const contextPinyin = pinyin(text, { type: 'array' });

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (!/[\u4e00-\u9fa5]/.test(char)) {
            tokens.push({
                char,
                isPolyphone: false,
                pinyin: ''
            });
            continue;
        }

        const multiplePinyins = pinyin(char, { multiple: true, type: 'array' });
        const currentPinyin = contextPinyin[i] || multiplePinyins[0];
        
        // Check if the character itself is ignored completely, or if this specific pronunciation is ignored
        const charConfig = customConfig?.[char] || {};
        const isCharIgnored = charConfig.__ignoreAll === true;
        const isPinyinIgnored = charConfig[currentPinyin]?.ignore === true;
        const isIgnored = isCharIgnored || isPinyinIgnored;

        const isRealPolyphone = multiplePinyins.length > 1;
        const isTarget = targetPolyphones ? targetPolyphones.includes(char) : true;
        const isPolyphone = isRealPolyphone && isTarget && !isIgnored;

        const token: Token = {
            char,
            isPolyphone,
            pinyin: currentPinyin,
        };

        if (isPolyphone) {
            token.polyphones = multiplePinyins;
            // Highest priority: customConfig
            let replacement = customConfig?.[char]?.[currentPinyin]?.replacement;
            
            // Fallback: exact tone match
            if (!replacement) {
                replacement = pinyinToCharMap[currentPinyin];
            }
            
            token.recommendedReplacement = replacement || '';
            
            if (!statsMap[char]) {
                statsMap[char] = { totalCount: 0, pinyins: {} };
            }
            statsMap[char].totalCount++;
            
            if (!statsMap[char].pinyins[currentPinyin]) {
                statsMap[char].pinyins[currentPinyin] = { count: 0, recommendedReplacement: token.recommendedReplacement || '' };
            }
            statsMap[char].pinyins[currentPinyin].count++;
        }

        tokens.push(token);
    }

    const stats = Object.entries(statsMap)
        .map(([char, data]) => {
            const pinyins = Object.entries(data.pinyins).map(([py, info]) => ({
                pinyin: py,
                count: info.count,
                recommendedReplacement: info.recommendedReplacement
            })).sort((a, b) => b.count - a.count);
            
            return { char, totalCount: data.totalCount, pinyins };
        })
        .sort((a, b) => b.totalCount - a.totalCount);

    return { text, tokens, stats };
}
