// 日本語フォントを、このサイトで実際に使っている文字だけに絞る。
// build の前に毎回走るので、文面を変えても字が欠けない。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import subsetFont from 'subset-font';

const sources = ['index.html', 'src/data.js', 'src/main.js'];
let text = '';
for (const f of sources) text += await readFile(f, 'utf8');
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set(ascii + text.replace(/[\u0000-\u007f]/g, '') + '、。「」（）・ー〜…—')].join('');

const fonts = [
  ['shippori-800', 'node_modules/@expo-google-fonts/shippori-mincho-b1/800ExtraBold/ShipporiMinchoB1_800ExtraBold.ttf'],
  ['zenkaku-400', 'node_modules/@expo-google-fonts/zen-kaku-gothic-new/400Regular/ZenKakuGothicNew_400Regular.ttf'],
  ['zenkaku-700', 'node_modules/@expo-google-fonts/zen-kaku-gothic-new/700Bold/ZenKakuGothicNew_700Bold.ttf'],
];
await mkdir('src/fonts', { recursive: true });
for (const [name, path] of fonts) {
  const out = await subsetFont(await readFile(path), chars, { targetFormat: 'woff2' });
  await writeFile(`src/fonts/${name}.woff2`, out);
  console.log(`${name}.woff2  ${(out.length / 1024).toFixed(1)} kB  (${chars.length} glyphs)`);
}
