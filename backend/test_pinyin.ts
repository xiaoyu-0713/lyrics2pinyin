import { pinyin, customPinyin, html } from 'pinyin-pro';
console.log(pinyin('和', { multiple: true }));
console.log(pinyin('和平', { type: 'array', polyphonic: true })); // polyphonic: true might not exist
