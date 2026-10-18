# dsh-select-dict

DSH 桌面端最精简的「划词翻译」插件：选中文字 → 浮窗译文 → 🔊 听发音 → 自动进本机词本。

只做这三件事，没有记忆卡、考试、导出之类的附属功能。

## 安装

仓库：<https://github.com/kshixiang/dsh-select-dict>

```powershell
# 1. 取代码（放在任何你喜欢的目录）
git clone https://github.com/kshixiang/dsh-select-dict.git D:\tools\dsh-select-dict

# 2. 让 profile 认得它：在 ~/.dsh/profiles/desktop/package.json 里加两处
#    dependencies: "dsh-select-dict": "link:D:\\tools\\dsh-select-dict"
#    dsh.profile.bundles: [ ..., "dsh-select-dict" ]

# 3. 把包目录接到 node_modules（Windows junction，等价于 pnpm 的 link）
cmd /c mklink /J "%USERPROFILE%\.dsh\profiles\desktop\node_modules\dsh-select-dict" "D:\tools\dsh-select-dict"

# 4. 重启 DSH
```

装了全局 `dsh` CLI 的话，第 2–3 步可换成一条命令：

```powershell
dsh plugin --profile desktop add github:kshixiang/dsh-select-dict
```

本插件没有构建产物（客户端就是可直接运行的 CJS 包装），所以 clone 完即可用，不需要 `pnpm install` / 打包。

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

## 卸载

从 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 与 `dsh.profile.bundles` 里删掉 `dsh-select-dict`，删除 `node_modules\dsh-select-dict`，重启 DSH。词本文件不会被删（`%USERPROFILE%\.dsh\select-dict\words.json`），需要的话手动删。

## 许可

MIT，见 [LICENSE](LICENSE)。

## 测试

```powershell
node --check lib/index.js
node --check lib/client.js
node test/smoke.mjs        # 假 ctx：路由、翻译流组装、词本去重/落盘/删除
node test/client-shape.mjs # 客户端 bundle 注册形状与工厂导出
```
