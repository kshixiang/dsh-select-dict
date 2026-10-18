/**
 * dsh-select-dict — browser half.
 *
 * 刻意不走 tsdown/React：用的是宿主客户端模块系统要求的惰性 CJS 包装
 * （window.__ModuleLoader__.load + factory），内部只用 DOM API，
 * 因此不需要任何构建步骤，也不 require 平台模块。
 */
window.__ModuleLoader__.load({
  id: 'dsh-select-dict',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var ROOT_ID = 'dsd-root'
    var MAX_CHARS = 500
    var ENDPOINT = '/select-dict'

    var DEFAULT_SETTINGS = { triggerLanguage: 'any', autoSave: true }
    var LANGUAGE_OPTIONS = [
      { value: 'any', label: '任意语言' },
      { value: 'en', label: '仅英文' },
      { value: 'zh', label: '仅中文' },
      { value: 'ja', label: '仅日文' },
      { value: 'ko', label: '仅韩文' },
    ]

    var CSS = [
      '#dsd-root{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:13px/1.5 system-ui,"Segoe UI","Microsoft YaHei",sans-serif;color:#1f2328;--dsd-bg:#ffffff;--dsd-fg:#1f2328;--dsd-muted:#6b7280;--dsd-line:rgba(0,0,0,.1);--dsd-accent:#2f6feb;--dsd-soft:rgba(47,111,235,.08)}',
      '@media (prefers-color-scheme:dark){#dsd-root{color:#e6edf3;--dsd-bg:#22272e;--dsd-fg:#e6edf3;--dsd-muted:#9aa4b2;--dsd-line:rgba(255,255,255,.12);--dsd-accent:#6ea8ff;--dsd-soft:rgba(110,168,255,.14)}}',
      '.dsd-card{position:absolute;pointer-events:auto;min-width:200px;max-width:380px;background:var(--dsd-bg);color:var(--dsd-fg);border:1px solid var(--dsd-line);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px 12px;box-sizing:border-box}',
      '.dsd-head{display:flex;align-items:flex-start;gap:8px}',
      '.dsd-src{flex:1;min-width:0;font-weight:600;overflow-wrap:anywhere;color:var(--dsd-muted);font-size:12.5px}',
      '.dsd-close{border:none;background:transparent;color:var(--dsd-muted);font-size:15px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:6px}',
      '.dsd-close:hover{background:var(--dsd-soft);color:var(--dsd-fg)}',
      '.dsd-out{margin-top:6px;font-size:15px;overflow-wrap:anywhere;white-space:pre-wrap}',
      '.dsd-out.dsd-pending{color:var(--dsd-muted);font-size:12.5px}',
      '.dsd-out.dsd-error{color:#d1242f;font-size:12.5px}',
      '.dsd-foot{margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.dsd-btn{border:1px solid var(--dsd-line);background:transparent;color:var(--dsd-fg);border-radius:7px;padding:2px 8px;font-size:12px;cursor:pointer;line-height:18px}',
      '.dsd-btn:hover{border-color:var(--dsd-accent);color:var(--dsd-accent)}',
      '.dsd-btn:disabled{opacity:.55;cursor:default}',
      '.dsd-btn.dsd-primary{border-color:var(--dsd-accent);color:var(--dsd-accent)}',
      '.dsd-note{flex:1;font-size:11.5px;color:var(--dsd-muted);text-align:right}',
      '.dsd-dock{position:absolute;right:16px;bottom:16px;pointer-events:auto;display:flex;align-items:center;gap:8px}',
      '.dsd-chip{border:1px solid var(--dsd-line);background:var(--dsd-bg);color:var(--dsd-muted);border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.16)}',
      '.dsd-chip:hover{color:var(--dsd-accent);border-color:var(--dsd-accent)}',
      '.dsd-gear{width:28px;height:28px;padding:0;line-height:26px;text-align:center;border-radius:999px;border:1px solid var(--dsd-line);background:var(--dsd-bg);color:var(--dsd-muted);cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.16);font-size:13px}',
      '.dsd-gear:hover{color:var(--dsd-accent);border-color:var(--dsd-accent)}',
      '.dsd-panel{position:absolute;right:16px;bottom:60px;width:420px;max-width:calc(100vw - 32px);max-height:min(70vh,560px);display:none;flex-direction:column;pointer-events:auto;background:var(--dsd-bg);color:var(--dsd-fg);border:1px solid var(--dsd-line);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);overflow:hidden}',
      '.dsd-panel.dsd-open{display:flex}',
      '.dsd-panel-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsd-line)}',
      '.dsd-panel-title{font-weight:600;font-size:13px;flex:1}',
      '.dsd-search{border:1px solid var(--dsd-line);background:transparent;color:var(--dsd-fg);border-radius:7px;padding:3px 8px;font-size:12px;width:150px;outline:none}',
      '.dsd-search:focus{border-color:var(--dsd-accent)}',
      '.dsd-list{overflow:auto;padding:4px 0}',
      '.dsd-row{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsd-line)}',
      '.dsd-row:last-child{border-bottom:none}',
      '.dsd-row-main{flex:1;min-width:0}',
      '.dsd-row-src{font-weight:600;overflow-wrap:anywhere}',
      '.dsd-row-dst{color:var(--dsd-muted);font-size:12.5px;overflow-wrap:anywhere;margin-top:2px}',
      '.dsd-row-meta{color:var(--dsd-muted);font-size:11px;margin-top:3px}',
      '.dsd-empty{padding:24px 12px;text-align:center;color:var(--dsd-muted);font-size:12.5px}',
      '.dsd-icon{border:none;background:transparent;cursor:pointer;font-size:13px;line-height:1;padding:3px 5px;border-radius:6px;color:var(--dsd-muted)}',
      '.dsd-icon:hover{background:var(--dsd-soft);color:var(--dsd-accent)}',
      '.dsd-setting{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--dsd-line)}',
      '.dsd-setting-label{flex:1;font-size:12.5px}',
      '.dsd-setting-label small{display:block;color:var(--dsd-muted);font-size:11px;font-weight:400;margin-top:2px}',
      '.dsd-select{border:1px solid var(--dsd-line);background:var(--dsd-bg);color:var(--dsd-fg);border-radius:7px;padding:3px 6px;font-size:12px;outline:none;min-width:110px}',
      '.dsd-select:focus{border-color:var(--dsd-accent)}',
      '.dsd-hint{padding:10px 12px;color:var(--dsd-muted);font-size:11.5px;line-height:1.6}',
    ].join('\n')

    function el(tag, className, text) {
      var node = document.createElement(tag)
      if (className) node.className = className
      if (text !== undefined && text !== null) node.textContent = String(text)
      return node
    }

    /** 判断一段选中文字的主语言，用于「只翻译某种语言」的筛选。 */
    function detectLanguage(text) {
      var sample = String(text || '')
      if (/[\u3040-\u30ff]/.test(sample)) return 'ja'
      if (/[\uac00-\ud7af]/.test(sample)) return 'ko'
      if (/[\u3400-\u9fff]/.test(sample)) return 'zh'
      if (/[A-Za-z]/.test(sample)) return 'en'
      return 'other'
    }

    function isChinese(text) {
      return detectLanguage(text) === 'zh'
    }

    function speak(text) {
      try {
        var synth = window.speechSynthesis
        if (!synth) return
        synth.cancel()
        var utter = new SpeechSynthesisUtterance(text)
        var lang = isChinese(text) ? 'zh-CN' : 'en-US'
        utter.lang = lang
        utter.rate = isChinese(text) ? 1 : 0.9
        var voices = synth.getVoices() || []
        var prefix = lang.slice(0, 2)
        for (var i = 0; i < voices.length; i += 1) {
          var voice = voices[i]
          if (voice && typeof voice.lang === 'string' && voice.lang.toLowerCase().indexOf(prefix) === 0) {
            utter.voice = voice
            break
          }
        }
        synth.speak(utter)
      } catch (error) {
        /* 发音失败不影响翻译 */
      }
    }

    async function api(path, options) {
      var response = await fetch(ENDPOINT + path, {
        method: options && options.method ? options.method : 'GET',
        headers: options && options.body ? { 'content-type': 'application/json' } : undefined,
        body: options && options.body ? JSON.stringify(options.body) : undefined,
      })
      var payload = null
      try {
        payload = await response.json()
      } catch (error) {
        payload = null
      }
      if (!response.ok || (payload && payload.ok === false)) {
        throw new Error((payload && payload.error) || ('请求失败 ' + response.status))
      }
      return payload || {}
    }

    function mount(ctx) {
      if (document.getElementById(ROOT_ID)) return
      var style = document.createElement('style')
      style.id = ROOT_ID + '-style'
      style.textContent = CSS
      document.head.appendChild(style)

      var root = el('div')
      root.id = ROOT_ID
      document.body.appendChild(root)

      // ---- 划词卡片 ----
      var card = el('div', 'dsd-card')
      card.style.display = 'none'
      var head = el('div', 'dsd-head')
      var src = el('div', 'dsd-src')
      var closeBtn = el('button', 'dsd-close', '×')
      closeBtn.title = '关闭'
      head.appendChild(src)
      head.appendChild(closeBtn)
      var out = el('div', 'dsd-out')
      var foot = el('div', 'dsd-foot')
      var speakSrc = el('button', 'dsd-btn', '🔊 原词')
      var speakOut = el('button', 'dsd-btn', '🔊 译文')
      var addBtn = el('button', 'dsd-btn dsd-primary', '＋ 词本')
      addBtn.style.display = 'none'
      addBtn.title = '把这个词加进词本'
      var note = el('div', 'dsd-note')
      foot.appendChild(speakSrc)
      foot.appendChild(speakOut)
      foot.appendChild(addBtn)
      foot.appendChild(note)
      card.appendChild(head)
      card.appendChild(out)
      card.appendChild(foot)
      root.appendChild(card)

      // ---- 右下角按钮 ----
      var dock = el('div', 'dsd-dock')
      var chip = el('button', 'dsd-chip', '📒 词本')
      var gear = el('button', 'dsd-gear', '⚙')
      gear.title = '插件设置'
      dock.appendChild(chip)
      dock.appendChild(gear)
      root.appendChild(dock)

      // ---- 词本面板 ----
      var panel = el('div', 'dsd-panel')
      var panelHead = el('div', 'dsd-panel-head')
      var panelTitle = el('div', 'dsd-panel-title', '词本')
      var search = el('input', 'dsd-search')
      search.placeholder = '搜索…'
      var clearBtn = el('button', 'dsd-icon', '🗑')
      clearBtn.title = '清空词本'
      var panelClose = el('button', 'dsd-close', '×')
      panelHead.appendChild(panelTitle)
      panelHead.appendChild(search)
      panelHead.appendChild(clearBtn)
      panelHead.appendChild(panelClose)
      var list = el('div', 'dsd-list')
      panel.appendChild(panelHead)
      panel.appendChild(list)
      root.appendChild(panel)

      // ---- 设置面板 ----
      var settingsPanel = el('div', 'dsd-panel')
      var settingsHead = el('div', 'dsd-panel-head')
      var settingsTitle = el('div', 'dsd-panel-title', '设置')
      var settingsClose = el('button', 'dsd-close', '×')
      settingsHead.appendChild(settingsTitle)
      settingsHead.appendChild(settingsClose)

      var langRow = el('div', 'dsd-setting')
      var langLabel = el('div', 'dsd-setting-label')
      langLabel.textContent = '只翻译哪种语言'
      langLabel.appendChild(el('small', null, '选中的是其他语言时不弹卡片'))
      var langSelect = el('select', 'dsd-select')
      LANGUAGE_OPTIONS.forEach(function (option) {
        var node = el('option', null, option.label)
        node.value = option.value
        langSelect.appendChild(node)
      })
      langRow.appendChild(langLabel)
      langRow.appendChild(langSelect)

      var saveRow = el('div', 'dsd-setting')
      var saveLabel = el('div', 'dsd-setting-label')
      saveLabel.textContent = '收词方式'
      saveLabel.appendChild(el('small', null, '手动模式下由你点「＋ 词本」才收录'))
      var saveSelect = el('select', 'dsd-select')
      var autoOption = el('option', null, '自动存入词本')
      autoOption.value = 'auto'
      var manualOption = el('option', null, '手动点击加入')
      manualOption.value = 'manual'
      saveSelect.appendChild(autoOption)
      saveSelect.appendChild(manualOption)
      saveRow.appendChild(saveLabel)
      saveRow.appendChild(saveSelect)

      var hint = el('div', 'dsd-hint', '改动即时生效并记在本机。')

      settingsPanel.appendChild(settingsHead)
      settingsPanel.appendChild(langRow)
      settingsPanel.appendChild(saveRow)
      settingsPanel.appendChild(hint)
      root.appendChild(settingsPanel)

      var words = []
      var settings = { triggerLanguage: DEFAULT_SETTINGS.triggerLanguage, autoSave: DEFAULT_SETTINGS.autoSave }
      var current = { text: '', translation: '', saved: false }

      function hideCard() {
        card.style.display = 'none'
        current = { text: '', translation: '', saved: false }
      }

      function placeCard(rect) {
        card.style.visibility = 'hidden'
        card.style.display = 'block'
        var width = card.offsetWidth
        var height = card.offsetHeight
        var margin = 8
        var left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin)
        var top = rect.bottom + margin
        if (top + height > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - height - margin)
        }
        card.style.left = left + 'px'
        card.style.top = top + 'px'
        card.style.visibility = 'visible'
      }

      function setNote(text) {
        note.textContent = text || ''
      }

      function updateChip() {
        chip.textContent = '📒 词本' + (words.length > 0 ? ' · ' + words.length : '')
      }

      function renderSettings() {
        langSelect.value = settings.triggerLanguage
        saveSelect.value = settings.autoSave ? 'auto' : 'manual'
      }

      function shouldTranslate(text) {
        if (settings.triggerLanguage === 'any') return true
        return detectLanguage(text) === settings.triggerLanguage
      }

      async function loadSettings() {
        try {
          var result = await api('/settings')
          if (result.settings) settings = result.settings
        } catch (error) {
          /* 用默认值 */
        }
        renderSettings()
      }

      async function applySettings(patch) {
        try {
          var result = await api('/settings', { method: 'POST', body: patch })
          if (result.settings) settings = result.settings
        } catch (error) {
          /* 保存失败时保留本地值，仅本次会话生效 */
        }
        renderSettings()
      }

      async function saveWord(text, translation) {
        try {
          await api('/words', { method: 'POST', body: { text: text, translation: translation } })
          current.saved = true
          setNote('已存入词本 ✓')
          if (!settings.autoSave) {
            addBtn.textContent = '已加入 ✓'
            addBtn.disabled = true
          }
          if (panel.classList.contains('dsd-open')) void refreshWords()
        } catch (error) {
          setNote('存词本失败')
        }
      }

      function resetAddButton() {
        addBtn.textContent = '＋ 词本'
        addBtn.disabled = false
        addBtn.style.display = settings.autoSave ? 'none' : ''
      }

      async function translateSelection(text, rect) {
        current = { text: text, translation: '', saved: false }
        src.textContent = text
        out.textContent = '翻译中…'
        out.className = 'dsd-out dsd-pending'
        setNote('')
        resetAddButton()
        placeCard(rect)
        try {
          var result = await api('/translate', { method: 'POST', body: { text: text } })
          current.translation = result.translation || ''
          out.textContent = current.translation
          out.className = 'dsd-out'
          placeCard(rect) // 译文变高后重新定位，避免溢出视口
          if (settings.autoSave) {
            await saveWord(text, current.translation)
          } else {
            setNote('要收录就点「＋ 词本」')
          }
        } catch (error) {
          out.textContent = error && error.message ? error.message : '翻译失败'
          out.className = 'dsd-out dsd-error'
          setNote('')
        }
      }

      function selectionText() {
        var selection = window.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
        var text = String(selection.toString()).replace(/\s+/g, ' ').trim()
        if (text === '' || text.length > MAX_CHARS) return null
        var node = selection.anchorNode
        if (node && root.contains(node.nodeType === 1 ? node : node.parentElement)) return null
        var range = selection.getRangeAt(0)
        var rect = range.getBoundingClientRect()
        if (!rect || (rect.width === 0 && rect.height === 0)) return null
        return { text: text, rect: rect }
      }

      function onMouseUp(event) {
        if (event.button !== 0) return
        if (root.contains(event.target)) return
        window.setTimeout(function () {
          var picked = selectionText()
          if (!picked || !shouldTranslate(picked.text)) {
            if (card.style.display !== 'none') hideCard()
            return
          }
          if (picked.text === current.text) return
          void translateSelection(picked.text, picked.rect)
        }, 20)
      }

      function onKeyUp(event) {
        if (event.key !== 'Shift' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        if (card.style.display !== 'none') return
        var picked = selectionText()
        if (!picked || !shouldTranslate(picked.text)) return
        void translateSelection(picked.text, picked.rect)
      }

      async function refreshWords() {
        try {
          var result = await api('/words')
          words = Array.isArray(result.words) ? result.words : []
        } catch (error) {
          words = []
        }
        renderWords()
        updateChip()
      }

      function renderWords() {
        list.textContent = ''
        var keyword = search.value.trim().toLowerCase()
        var shown = keyword === ''
          ? words
          : words.filter(function (word) {
            return (word.text || '').toLowerCase().indexOf(keyword) >= 0
              || (word.translation || '').toLowerCase().indexOf(keyword) >= 0
          })
        panelTitle.textContent = '词本 · ' + words.length
        if (shown.length === 0) {
          list.appendChild(el('div', 'dsd-empty', words.length === 0 ? '还没有词条：选中文字就会自动收进来。' : '没有匹配的词条。'))
          return
        }
        shown.forEach(function (word) {
          var row = el('div', 'dsd-row')
          var main = el('div', 'dsd-row-main')
          main.appendChild(el('div', 'dsd-row-src', word.text))
          main.appendChild(el('div', 'dsd-row-dst', word.translation))
          var created = word.createdAt ? String(word.createdAt).slice(0, 16).replace('T', ' ') : ''
          var meta = '出现 ' + (word.count || 1) + ' 次'
          main.appendChild(el('div', 'dsd-row-meta', created === '' ? meta : meta + ' · ' + created))
          var speakWord = el('button', 'dsd-icon', '🔊')
          speakWord.title = '朗读原词'
          speakWord.addEventListener('click', function () { speak(word.text) })
          var speakDst = el('button', 'dsd-icon', '🗣')
          speakDst.title = '朗读译文'
          speakDst.addEventListener('click', function () { speak(word.translation) })
          var remove = el('button', 'dsd-icon', '✕')
          remove.title = '删除词条'
          remove.addEventListener('click', async function () {
            try {
              await api('/words/delete', { method: 'POST', body: { id: word.id } })
            } catch (error) {
              /* 忽略删除失败 */
            }
            await refreshWords()
          })
          row.appendChild(main)
          row.appendChild(speakWord)
          row.appendChild(speakDst)
          row.appendChild(remove)
          list.appendChild(row)
        })
      }

      closeBtn.addEventListener('click', hideCard)
      speakSrc.addEventListener('click', function () { if (current.text) speak(current.text) })
      speakOut.addEventListener('click', function () { if (current.translation) speak(current.translation) })
      addBtn.addEventListener('click', function () {
        if (current.saved || current.translation === '') return
        void saveWord(current.text, current.translation)
      })

      chip.addEventListener('click', function () {
        var open = !panel.classList.contains('dsd-open')
        settingsPanel.classList.remove('dsd-open')
        panel.classList.toggle('dsd-open', open)
        if (open) void refreshWords()
      })
      gear.addEventListener('click', function () {
        var open = !settingsPanel.classList.contains('dsd-open')
        panel.classList.remove('dsd-open')
        settingsPanel.classList.toggle('dsd-open', open)
      })
      gear.title = '插件设置'
      panelClose.addEventListener('click', function () { panel.classList.remove('dsd-open') })
      settingsClose.addEventListener('click', function () { settingsPanel.classList.remove('dsd-open') })
      search.addEventListener('input', renderWords)
      langSelect.addEventListener('change', function () {
        void applySettings({ triggerLanguage: langSelect.value })
      })
      saveSelect.addEventListener('change', function () {
        void applySettings({ autoSave: saveSelect.value === 'auto' })
      })
      clearBtn.addEventListener('click', async function () {
        try {
          await api('/words/clear', { method: 'POST', body: {} })
        } catch (error) {
          /* 忽略清空失败 */
        }
        await refreshWords()
      })

      document.addEventListener('mouseup', onMouseUp, true)
      document.addEventListener('keyup', onKeyUp, true)

      void loadSettings()
      void refreshWords()

      ctx.effect(function () {
        return function () {
          document.removeEventListener('mouseup', onMouseUp, true)
          document.removeEventListener('keyup', onKeyUp, true)
          try { window.speechSynthesis && window.speechSynthesis.cancel() } catch (error) { /* noop */ }
          root.remove()
          style.remove()
        }
      }, 'select-dict: 划词界面')
    }

    exports.name = 'select-dict-client'
    exports.inject = []
    exports.__internal = { detectLanguage: detectLanguage }

    exports.apply = function apply(ctx) {
      if (typeof document === 'undefined') return
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', function () { mount(ctx) }, { once: true })
        return
      }
      mount(ctx)
    }

    return module.exports
  },
})
