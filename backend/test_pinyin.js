const { pinyin } = require('pinyin-pro');
console.log(pinyin('和', { multiple: true, type: 'array' }));
console.log(pinyin('和平', { type: 'array' }));
