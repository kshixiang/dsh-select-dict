/**
 * dsh-select-dict — host half.
 *
 * 只做三件事：给浏览器端提供「翻译」「词本读写」两类接口。
 * 本文件刻意不 import 任何第三方包（profile 里 @deepseek-ai/* 的 junction
 * 可能是断链），只用 node: 内建模块，并全部通过 ctx 服务取能力。
 *
 * @module dsh-select-dict
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

/** 宿主侧插件名（与 package.json name 一致）。 */
export const name = 'select-dict'

/** 依赖的宿主服务：HTTP 路由表与模型调用服务。 */
export const inject = ['webServer', 'llm']

const ROUTE_PREFIX = '/select-dict'
const MAX_BODY_BYTES = 16 * 1024
const MAX_TEXT_CHARS = 500
const MAX_WORDS = 5000

const SYSTEM_PROMPT = [
  '你是一本紧凑的双语词典。',
  '用户会给你一个单词、短语或一小段文字。',
  '请把它翻译成中文；如果原文本身是中文，则翻译成英文。',
  '只输出译文本身：不要解释、不要例句、不要引号、不要加拼音、不要重复原文。',
  '若原文有多个常见义项，用「；」分隔，最多三个义项。',
].join('\n')

/** 词本落盘位置：可用 DSH_SELECT_DICT_DIR 覆盖。 */
function dataDir() {
  return process.env.DSH_SELECT_DICT_DIR || join(homedir(), '.dsh', 'select-dict')
}

/** 序列化写入，避免并发写坏文件。 */
let writeChain = Promise.resolve()

/** 读取整份词本；文件不存在或损坏时退回空词本。 */
async function readStore() {
  const file = join(dataDir(), 'words.json')
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    const words = Array.isArray(parsed?.words) ? parsed.words : []
    return words.filter(word => word !== null && typeof word === 'object' && typeof word.text === 'string')
  } catch {
    return []
  }
}

/** 原子写入整份词本。 */
async function writeStore(words) {
  const dir = dataDir()
  const file = join(dir, 'words.json')
  const tmp = join(dir, `words.${randomUUID()}.tmp`)
  const body = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), words }, null, 2)
  writeChain = writeChain.then(async () => {
    await mkdir(dir, { recursive: true })
    await writeFile(tmp, body, 'utf8')
    await rename(tmp, file)
  }).catch(() => {})
  return writeChain
}

/** 读取完整请求体并解析 JSON（限制大小）。 */
async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  return JSON.parse(text)
}

/** 写回一个 JSON 响应。 */
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(body)
}

/** 归一化用户选中的文本。 */
function normalizeText(value) {
  if (typeof value !== 'string') throw new Error('缺少要翻译的文字')
  const text = value.replace(/\s+/g, ' ').trim()
  if (text === '') throw new Error('没有选中文字')
  if (text.length > MAX_TEXT_CHARS) throw new Error(`一次最多翻译 ${MAX_TEXT_CHARS} 个字符`)
  return text
}

/** 语言猜测只用于发音与词本展示。 */
function guessLang(text) {
  return /[\u3400-\u9fff]/.test(text) ? 'zh' : 'en'
}

/**
 * 解析本次调用要用的模型路由：优先插件配置/环境变量，其次宿主默认模型。
 * @param ctx - 宿主上下文。
 * @returns provider 与 model；都拿不到时抛错。
 */
function resolveRoute(ctx) {
  const configuredProvider = process.env.DSH_SELECT_DICT_PROVIDER
  const configuredModel = process.env.DSH_SELECT_DICT_MODEL
  if (configuredProvider !== undefined && configuredModel !== undefined) {
    return { provider: configuredProvider, model: configuredModel }
  }
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
  if (selection !== undefined && typeof selection?.provider === 'string' && typeof selection?.model === 'string') {
    return { provider: selection.provider, model: selection.model }
  }
  throw new Error('没有可用的默认模型：请先在设置里选择模型，或配置 DSH_SELECT_DICT_PROVIDER / DSH_SELECT_DICT_MODEL')
}

/**
 * 用宿主默认模型做一次一次性翻译，只取纯文本增量。
 * @param ctx - 宿主上下文。
 * @param text - 已归一化的原文。
 * @returns 译文文本。
 */
async function translateText(ctx, text) {
  const route = resolveRoute(ctx)
  let output = ''
  const stream = ctx.llm.stream({
    provider: route.provider,
    model: route.model,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: [{ type: 'text', text }] }],
    maxTokens: 400,
    temperature: 0.2,
  })
  for await (const chunk of stream) {
    if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') {
      output += chunk.text
      continue
    }
    if (chunk?.type === 'finish') {
      const reason = chunk.reason
      if (reason?.kind === 'error' || reason?.kind === 'aborted') {
        const message = reason.failure?.message || '模型调用失败'
        const code = reason.failure?.code ? `（${reason.failure.code}）` : ''
        throw new Error(`${message}${code}`)
      }
    }
  }
  const translation = output.trim()
  if (translation === '') throw new Error('模型没有返回译文')
  return { translation, provider: route.provider, model: route.model }
}

/** 按 text 去重地写入一条词条。 */
async function upsertWord(text, translation) {
  const words = await readStore()
  const now = new Date().toISOString()
  const index = words.findIndex(word => word.text === text)
  if (index >= 0) {
    const previous = words[index]
    words[index] = {
      ...previous,
      translation,
      lang: guessLang(text),
      count: (typeof previous.count === 'number' ? previous.count : 1) + 1,
      lastAt: now,
    }
  } else {
    words.unshift({
      id: randomUUID(),
      text,
      translation,
      lang: guessLang(text),
      count: 1,
      createdAt: now,
      lastAt: now,
    })
    if (words.length > MAX_WORDS) words.length = MAX_WORDS
  }
  await writeStore(words)
  return words[0]
}

/** 组装一个路由处理器。 */
function createHandler(ctx) {
  return async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const pathname = url.pathname.slice(ROUTE_PREFIX.length) || '/'
    try {
      if (pathname === '/translate' && req.method === 'POST') {
        const body = await readJson(req)
        const text = normalizeText(body.text)
        const result = await translateText(ctx, text)
        sendJson(res, 200, { ok: true, text, ...result })
        return
      }
      if (pathname === '/words' && req.method === 'GET') {
        const words = await readStore()
        sendJson(res, 200, { ok: true, words })
        return
      }
      if (pathname === '/words' && req.method === 'POST') {
        const body = await readJson(req)
        const text = normalizeText(body.text)
        const translation = normalizeText(body.translation)
        const word = await upsertWord(text, translation)
        sendJson(res, 200, { ok: true, word })
        return
      }
      if (pathname === '/words/delete' && req.method === 'POST') {
        const body = await readJson(req)
        const id = typeof body.id === 'string' ? body.id : ''
        const words = await readStore()
        const kept = words.filter(word => word.id !== id)
        await writeStore(kept)
        sendJson(res, 200, { ok: true, removed: words.length - kept.length })
        return
      }
      if (pathname === '/words/clear' && req.method === 'POST') {
        await writeStore([])
        sendJson(res, 200, { ok: true })
        return
      }
      sendJson(res, 404, { ok: false, error: `未知接口 ${req.method} ${pathname}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      sendJson(res, message === '请求体过大' ? 413 : 400, { ok: false, error: message })
    }
  }
}

/**
 * 挂载插件：注册 /select-dict 前缀下的 HTTP 接口。
 * @param ctx - 宿主上下文。
 */
export function apply(ctx) {
  const handler = createHandler(ctx)
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }), 'select-dict: routes')
}
