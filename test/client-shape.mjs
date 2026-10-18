/**
 * 客户端 bundle 形状测试：确认包装脚本按宿主客户端模块系统的约定注册，
 * 且工厂返回值是带 apply 的插件对象（不需要浏览器）。
 * 运行：node test/client-shape.mjs
 */
const registrations = []

globalThis.window = {
  __ModuleLoader__: {
    load(registration) {
      registrations.push(registration)
    },
  },
}

await import('../lib/client.js')

if (registrations.length !== 1) throw new Error('应当只注册一个客户端模块，实际 ' + registrations.length)
const registration = registrations[0]
if (registration.id !== 'dsh-select-dict') throw new Error('模块 id 必须是包名，实际 ' + registration.id)
if (typeof registration.factory !== 'function') throw new Error('缺少 factory')

const exportsObj = registration.factory(() => {
  throw new Error('本插件不应 require 任何平台模块')
})
if (typeof exportsObj.apply !== 'function') throw new Error('工厂必须导出 apply')
if (!Array.isArray(exportsObj.inject)) throw new Error('工厂必须导出 inject 数组')
if (exportsObj.inject.length !== 0) throw new Error('本插件不依赖客户端服务')
if (typeof exportsObj.name !== 'string') throw new Error('工厂必须导出 name')

// ---- 语言判定（「只翻译某种语言」用的就是它）----
const detectLanguage = exportsObj.__internal && exportsObj.__internal.detectLanguage
if (typeof detectLanguage !== 'function') throw new Error('缺少 __internal.detectLanguage')
const cases = [
  ['quant', 'en'],
  ['Hello world', 'en'],
  ['量化分析师', 'zh'],
  ['こんにちは', 'ja'],
  ['안녕하세요', 'ko'],
  ['こんにちは世界', 'ja'],
  ['12345 !!!', 'other'],
  ['', 'other'],
]
for (const [input, expected] of cases) {
  const actual = detectLanguage(input)
  if (actual !== expected) throw new Error('detectLanguage(' + JSON.stringify(input) + ') 应为 ' + expected + '，实际 ' + actual)
}

console.log('CLIENT SHAPE OK', JSON.stringify({ id: registration.id, name: exportsObj.name, inject: exportsObj.inject }))
