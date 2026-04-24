import pinyinDict from './pinyin_dict_notone';

// Collect all characters from the pinyin_dict_notone dictionary
// This dictionary contains 6763 common Chinese characters
const chars: string[] = [];
for (const val of Object.values(pinyinDict)) {
    for (const char of val) {
        chars.push(char);
    }
}

export const common3500Set = new Set(chars);