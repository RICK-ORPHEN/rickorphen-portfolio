# RICK ORPHEN — portfolio

RICK ORPHEN のポートフォリオ。Vite + Three.js の静的サイト。

- 掲載する仕事は `src/data.js` の配列だけで決まる（名前・説明・リンク・スクリーンショット）
- 3D（クロームの目・軌道・ワイヤーフレームの地面・網点）は `src/scene.js`
- ギミック（訳わからなさダイヤル・文字化け・裏返し）は `src/main.js`
- 日本語フォントは `tools/fonts.mjs` が build のたびに使用文字だけへ絞る
- スクリーンショットの網点版は `tools/shots.py` で作る（`public/shots/*-ht.webp`）

```
npm install
npm run dev     # 手元で確認
npm run build   # dist/ に出力（Vercel はこれを実行する）
```
