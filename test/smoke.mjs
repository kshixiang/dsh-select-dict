/**
 * 宿主侧冒烟测试（不需要 DSH 运行）：用假 ctx 校验路由、翻译流组装与词本落盘。
 * 运行：node test/smoke.mjs
 */
import { Readable } from 'node:stream'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../lib/index.js'

const dir = await mkdtemp(join(tmpdir(), 'dsd-'))
process.env.DSH_SELECT_DICT_DIR = dir

let registered = null
const disposers = []

const ctx = {
  get(name) {
    if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'demo-provider', model: 'demo-model' }) }
    return undefined
  },
  effect(factory) {
    const off = factory()
    if (typeof off === 'function') disposers.push(off)
  },
  webServer: {
    register(route) {
      registered = route
      return () => {}
    },
  },
  llm: {
    stream(options) {
      if (options.provider !== 'demo-provider' || options.model !== 'demo-model') {
        throw new Error('路由不对：' + options.provider + '/' + options.model)
      }
      const input = options.messages[0].content[0].text
      const reply = '译文<' + input + '>'
      return (async function* () {
        yield { type: 'block-start', index: 0, blockType: 'text' }
        for (const piece of reply.match(/.{1,3}/gs) ?? []) yield { type: 'text-delta', index: 0, text: piece }
        yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  },
}

apply(ctx)
if (registered === null) throw new Error('没有注册路由')
if (registered.kind !== 'prefix' || registered.path !== '/select-dict') throw new Error('路由形状不对')

function request(method, url, body) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')])
  req.method = method
  req.url = url
  const chunks = []
  const res = {
    statusCode: 0,
    headers: {},
    writeHead(status, headers) { this.statusCode = status; this.headers = headers ?? {} },
    end(payload) { chunks.push(payload ?? '') },
  }
  return { req, res, read: () => ({ status: res.statusCode, body: JSON.parse(chunks.join('') || 'null') }) }
}

async function call(method, url, body) {
  const { req, res, read } = request(method, url, body)
  await registered.handler(req, res)
  return read()
}

const translated = await call('POST', '/select-dict/translate', { text: '  hello   world ' })
console.log('translate ->', translated)
if (translated.status !== 200) throw new Error('翻译应当成功')
if (translated.body.translation !== '译文<hello world>') throw new Error('译文不对：' + translated.body.translation)

const saved = await call('POST', '/select-dict/words', { text: 'hello world', translation: translated.body.translation })
if (saved.status !== 200) throw new Error('存词条失败')

const again = await call('POST', '/select-dict/words', { text: 'hello world', translation: '第二次译文' })
if (again.body.word.count !== 2) throw new Error('同一词条的 count 应当累加，实际 ' + again.body.word.count)

const listed = await call('GET', '/select-dict/words')
console.log('list ->', JSON.stringify(listed.body).slice(0, 160))
if (listed.body.words.length !== 1) throw new Error('应当只有一条词条（按 text 去重）')

const onDisk = JSON.parse(await readFile(join(dir, 'words.json'), 'utf8'))
if (!Array.isArray(onDisk.words) || onDisk.words[0].text !== 'hello world') throw new Error('落盘内容不对')

const removed = await call('POST', '/select-dict/words/delete', { id: listed.body.words[0].id })
if (removed.body.removed !== 1) throw new Error('删除失败')

const empty = await call('GET', '/select-dict/words')
if (empty.body.words.length !== 0) throw new Error('删除后不该还有词条')

const tooLong = await call('POST', '/select-dict/translate', { text: 'x'.repeat(900) })
if (tooLong.status !== 400) throw new Error('超长文本应当被拒绝')

const missing = await call('GET', '/select-dict/nope')
if (missing.status !== 404) throw new Error('未知接口应当 404')

for (const off of disposers) off()
await rm(dir, { recursive: true, force: true })
console.log('SMOKE OK')
