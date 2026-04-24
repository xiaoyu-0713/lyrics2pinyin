const { pinyin, customPinyin } = require('pinyin-pro');
console.log(pinyin('把我的愿望还给我', { type: 'array' }));
customPinyin({ '还给我': 'huán gěi wǒ' });
console.log(pinyin('把我的愿望还给我', { type: 'array' }));
