# dsh-select-dict

DSH 桌面端最精简的「划词翻译」插件：选中文字 → 浮窗译文 → 🔊 听发音 → 自动进本机词本。

只做这三件事，没有记忆卡、考试、导出之类的附属功能。

## 用法

1. 在任意界面用鼠标选中一个词/短语/一句话（最多 500 字符）。
2. 选区下方弹出小卡片：先显示「翻译中…」，随后显示译文。
3. 译文一出来就自动存进本机词本，卡片右下角会提示「已存入词本 ✓」。
4. 卡片底部的「🔊 原词」「🔊 译文」用系统语音朗读；中文用 zh-CN、英文用 en-US。
5. 右下角「📒 词本」按钮打开词本：可搜索、朗读、删除单条、清空；同一词条按出现次数累加。

## 数据落盘

- 词本：`%USERPROFILE%\.dsh\select-dict\words.json`（可用环境变量 `DSH_SELECT_DICT_DIR` 改目录）
- 模型路由：默认用 DSH 当前的默认模型；也可用 `DSH_SELECT_DICT_PROVIDER` / `DSH_SELECT_DICT_MODEL` 指定。

## 实现要点

- 宿主侧 `lib/index.js` 只用 `node:` 内建模块，不 import 任何第三方包（profile 里 `@deepseek-ai/*` 的 junction 可能是断链）。
- 客户端 `lib/client.js` 是宿主客户端模块系统要求的惰性 CJS 包装（`window.__ModuleLoader__.load` + `factory`），内部只用 DOM API，**不需要 tsdown/React 构建**，也没有构建产物。
- 宿主接口（前缀路由 `/select-dict`）：
  - `POST /select-dict/translate` `{ text }` → `{ ok, text, translation, provider, model }`
  - `GET  /select-dict/words` → `{ ok, words: [...] }`
  - `POST /select-dict/words` `{ text, translation }` → `{ ok, word }`（按 text 去重，`count` 累加）
  - `POST /select-dict/words/delete` `{ id }`、`POST /select-dict/words/clear`

## 安装 / 卸载

安装（把仓库目录挂进 profile）：

```jsonc
// ~/.dsh/profiles/desktop/package.json
"dependencies": { "dsh-select-dict": "link:D:\\carl\\project\\ai_study\\dsh-select-dict" }
"dsh": { "profile": { "bundles": [ ..., "dsh-select-dict" ] } }
```

再让 `node_modules/dsh-select-dict` 指向本目录（junction 或 `pnpm install`），重启 DSH。

卸载：从 `dependencies` 与 `dsh.profile.bundles` 里删掉 `dsh-select-dict`，删除 `node_modules/dsh-select-dict`，重启 DSH。

## 测试

```powershell
node --check lib/index.js
node --check lib/client.js
node test/smoke.mjs        # 假 ctx：路由、翻译流组装、词本去重/落盘/删除
node test/client-shape.mjs # 客户端 bundle 注册形状与工厂导出
```
