const { pinyin } = require('pinyin-pro');

const pinyinMap = {};
for (let i = 0x4e00; i <= 0x9fa5; i++) {
  const char = String.fromCharCode(i);
  const pyArr = pinyin(char, { multiple: true, type: 'array' });
  if (pyArr.length === 1) { // non-polyphone
    const py = pyArr[0];
    if (!pinyinMap[py]) {
      pinyinMap[py] = char;
    }
  }
}
console.log(pinyinMap['hé']);
console.log(pinyinMap['hè']);
console.log(pinyinMap['huó']);
console.log(pinyinMap['huò']);
