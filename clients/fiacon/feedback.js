/**
 * Valiant Feedback Layer v1.0
 * Drop ?review=true on any page to activate.
 * Comments stored in Supabase — readable by the agent via API.
 *
 * Usage: <script src="feedback.js"></script>
 * Config: window.FEEDBACK_CONFIG = { supabaseUrl, supabaseKey, pageId }
 */

(function () {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('review')) return

  const CONFIG = window.FEEDBACK_CONFIG || {}
  const SUPABASE_URL = CONFIG.supabaseUrl || ''
  const SUPABASE_KEY = CONFIG.supabaseKey || ''
  const PAGE_ID = CONFIG.pageId || window.location.pathname

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    .vf-toolbar {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #0F2D5E; color: #fff; border-radius: 999px;
      padding: 10px 20px; display: flex; align-items: center; gap: 16px;
      z-index: 99999; box-shadow: 0 8px 32px rgba(0,0,0,.35);
      font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;
      user-select: none; transition: opacity .2s;
    }
    .vf-toolbar .vf-logo { color: #60A5FA; font-weight: 800; letter-spacing: .5px; }
    .vf-toolbar .vf-sep { width: 1px; height: 20px; background: rgba(255,255,255,.2); }
    .vf-btn {
      background: none; border: 1.5px solid rgba(255,255,255,.25); color: #fff;
      border-radius: 6px; padding: 5px 14px; font-family: Inter, sans-serif;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s;
      display: flex; align-items: center; gap: 6px;
    }
    .vf-btn:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.5); }
    .vf-btn.active { background: #1A6FE8; border-color: #1A6FE8; }
    .vf-count {
      background: rgba(255,255,255,.12); border-radius: 999px;
      padding: 3px 10px; font-size: 12px; color: rgba(255,255,255,.7);
    }
    .vf-mode-label { font-size: 12px; color: #60A5FA; }

    body.vf-mode-pin { cursor: crosshair !important; }
    body.vf-mode-pin * { cursor: crosshair !important; }

    .vf-pin {
      position: absolute; width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: #1A6FE8; border: 2px solid #fff; transform: rotate(-45deg);
      cursor: pointer; z-index: 99998; transition: transform .15s;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
    }
    .vf-pin:hover { transform: rotate(-45deg) scale(1.15); }
    .vf-pin .vf-pin-num {
      position: absolute; top: 50%; left: 50%; transform: rotate(45deg) translate(-50%, -50%);
      font-size: 11px; font-weight: 800; color: #fff; font-family: Inter, sans-serif;
      margin-top: -1px;
    }
    .vf-pin.resolved { background: #16A34A; }

    .vf-bubble {
      position: absolute; z-index: 99999; width: 280px;
      background: #fff; border-radius: 12px; padding: 0;
      box-shadow: 0 8px 32px rgba(0,0,0,.2); border: 1px solid #E5E7EB;
      font-family: Inter, sans-serif; overflow: hidden;
    }
    .vf-bubble-header {
      background: #0F2D5E; padding: 10px 14px; display: flex;
      justify-content: space-between; align-items: center;
    }
    .vf-bubble-header span { font-size: 12px; font-weight: 700; color: #fff; }
    .vf-bubble-close {
      background: none; border: none; color: rgba(255,255,255,.7);
      cursor: pointer; font-size: 16px; line-height: 1; padding: 0;
    }
    .vf-bubble-body { padding: 12px; }
    .vf-bubble textarea {
      width: 100%; border: 1.5px solid #E5E7EB; border-radius: 8px;
      padding: 10px 12px; font-family: Inter, sans-serif; font-size: 13px;
      resize: none; outline: none; height: 80px; color: #1A1A2A;
      transition: border-color .15s;
    }
    .vf-bubble textarea:focus { border-color: #1A6FE8; }
    .vf-bubble-meta { font-size: 11px; color: #9CA3AF; margin-bottom: 8px; }
    .vf-bubble-actions { display: flex; gap: 8px; margin-top: 8px; }
    .vf-save-btn {
      flex: 1; background: #1A6FE8; color: #fff; border: none; border-radius: 6px;
      padding: 8px; font-family: Inter, sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background .15s;
    }
    .vf-save-btn:hover { background: #1558c0; }
    .vf-cancel-btn {
      background: #F3F4F6; color: #374151; border: none; border-radius: 6px;
      padding: 8px 14px; font-family: Inter, sans-serif; font-size: 13px;
      font-weight: 600; cursor: pointer;
    }
    .vf-resolve-btn {
      background: #DCFCE7; color: #166534; border: none; border-radius: 6px;
      padding: 8px 10px; font-family: Inter, sans-serif; font-size: 12px;
      font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .vf-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
      background: #16A34A; color: #fff; border-radius: 8px; padding: 10px 20px;
      font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;
      z-index: 999999; opacity: 0; transition: opacity .3s; pointer-events: none;
    }
    .vf-toast.show { opacity: 1; }
  `
  document.head.appendChild(style)

  // ── STATE ────────────────────────────────────────────────────────────────────
  let pinMode = false
  let comments = []
  let pinCounter = 0
  let activeBubble = null

  // ── TOOLBAR ──────────────────────────────────────────────────────────────────
  const toolbar = document.createElement('div')
  toolbar.className = 'vf-toolbar'
  toolbar.innerHTML = `
    <span class="vf-logo">VALIANT</span>
    <span class="vf-sep"></span>
    <span class="vf-mode-label" id="vf-mode-label">Review Mode</span>
    <span class="vf-sep"></span>
    <button class="vf-btn" id="vf-pin-btn">📌 Add Comment</button>
    <span class="vf-count" id="vf-count">0 comments</span>
    <button class="vf-btn" id="vf-export-btn">📋 Copy Report</button>
  `
  document.body.appendChild(toolbar)

  const pinBtn = document.getElementById('vf-pin-btn')
  const countEl = document.getElementById('vf-count')
  const modeLabel = document.getElementById('vf-mode-label')
  const exportBtn = document.getElementById('vf-export-btn')

  // ── TOAST ────────────────────────────────────────────────────────────────────
  const toast = document.createElement('div')
  toast.className = 'vf-toast'
  document.body.appendChild(toast)

  function showToast(msg) {
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2500)
  }

  // ── PIN MODE TOGGLE ───────────────────────────────────────────────────────────
  pinBtn.addEventListener('click', () => {
    pinMode = !pinMode
    document.body.classList.toggle('vf-mode-pin', pinMode)
    pinBtn.classList.toggle('active', pinMode)
    pinBtn.textContent = pinMode ? '✕ Cancel' : '📌 Add Comment'
    modeLabel.textContent = pinMode ? 'Click anywhere to pin' : 'Review Mode'
    if (activeBubble) { activeBubble.remove(); activeBubble = null }
  })

  // ── CLICK TO PIN ─────────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (!pinMode) return
    if (e.target.closest('.vf-toolbar') || e.target.closest('.vf-bubble') || e.target.closest('.vf-pin')) return

    const xPct = ((e.pageX / document.documentElement.scrollWidth) * 100).toFixed(2)
    const yPct = ((e.pageY / document.documentElement.scrollHeight) * 100).toFixed(2)

    pinMode = false
    document.body.classList.remove('vf-mode-pin')
    pinBtn.classList.remove('active')
    pinBtn.textContent = '📌 Add Comment'
    modeLabel.textContent = 'Review Mode'

    openNewBubble(e.pageX, e.pageY, parseFloat(xPct), parseFloat(yPct))
  })

  // ── NEW COMMENT BUBBLE ────────────────────────────────────────────────────────
  function openNewBubble(pageX, pageY, xPct, yPct) {
    if (activeBubble) { activeBubble.remove(); activeBubble = null }

    const bubble = document.createElement('div')
    bubble.className = 'vf-bubble'
    bubble.style.left = Math.min(pageX + 12, document.documentElement.scrollWidth - 300) + 'px'
    bubble.style.top = (pageY - 10) + 'px'
    bubble.innerHTML = `
      <div class="vf-bubble-header">
        <span>New Comment</span>
        <button class="vf-bubble-close">×</button>
      </div>
      <div class="vf-bubble-body">
        <div class="vf-bubble-meta">Position: ${xPct}% × ${yPct}%</div>
        <textarea placeholder="Describe the change needed..." autofocus></textarea>
        <div class="vf-bubble-actions">
          <button class="vf-cancel-btn">Cancel</button>
          <button class="vf-save-btn">Save Comment</button>
        </div>
      </div>
    `
    document.body.appendChild(bubble)
    activeBubble = bubble
    bubble.querySelector('textarea').focus()

    bubble.querySelector('.vf-bubble-close').onclick = () => { bubble.remove(); activeBubble = null }
    bubble.querySelector('.vf-cancel-btn').onclick = () => { bubble.remove(); activeBubble = null }
    bubble.querySelector('.vf-save-btn').onclick = () => {
      const text = bubble.querySelector('textarea').value.trim()
      if (!text) return
      saveComment({ xPct, yPct, text, pageX, pageY })
      bubble.remove()
      activeBubble = null
    }
  }

  // ── SAVE COMMENT ─────────────────────────────────────────────────────────────
  async function saveComment({ xPct, yPct, text, pageX, pageY }) {
    pinCounter++
    const comment = {
      id: Date.now(),
      num: pinCounter,
      page_id: PAGE_ID,
      page_url: window.location.href.split('?')[0],
      x_pct: xPct,
      y_pct: yPct,
      text,
      resolved: false,
      created_at: new Date().toISOString(),
    }
    comments.push(comment)
    renderPin(comment, pageX, pageY)
    updateCount()
    showToast('Comment saved ✓')

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/feedback_comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(comment),
        })
      } catch (err) {
        console.warn('Supabase save failed:', err)
      }
    }
  }

  // ── RENDER PIN ────────────────────────────────────────────────────────────────
  function renderPin(comment, pageX, pageY) {
    const pin = document.createElement('div')
    pin.className = 'vf-pin' + (comment.resolved ? ' resolved' : '')
    pin.style.left = (pageX - 14) + 'px'
    pin.style.top = (pageY - 28) + 'px'
    pin.innerHTML = `<span class="vf-pin-num">${comment.num}</span>`
    pin.dataset.id = comment.id
    document.body.appendChild(pin)

    pin.addEventListener('click', (e) => {
      e.stopPropagation()
      if (activeBubble) { activeBubble.remove(); activeBubble = null }
      openViewBubble(comment, pin, pageX, pageY)
    })
  }

  // ── VIEW COMMENT BUBBLE ───────────────────────────────────────────────────────
  function openViewBubble(comment, pin, pageX, pageY) {
    const bubble = document.createElement('div')
    bubble.className = 'vf-bubble'
    bubble.style.left = Math.min(pageX + 20, document.documentElement.scrollWidth - 300) + 'px'
    bubble.style.top = (pageY - 10) + 'px'
    bubble.innerHTML = `
      <div class="vf-bubble-header">
        <span>Comment #${comment.num}</span>
        <button class="vf-bubble-close">×</button>
      </div>
      <div class="vf-bubble-body">
        <div class="vf-bubble-meta">${new Date(comment.created_at).toLocaleString('en-AU')}</div>
        <div style="font-size:14px;color:#1A1A2A;line-height:1.6;padding:4px 0 12px">${comment.text}</div>
        <div class="vf-bubble-actions">
          ${!comment.resolved ? `<button class="vf-resolve-btn" data-id="${comment.id}">✓ Mark Resolved</button>` : '<span style="color:#16A34A;font-size:13px;font-weight:600">✓ Resolved</span>'}
        </div>
      </div>
    `
    document.body.appendChild(bubble)
    activeBubble = bubble

    bubble.querySelector('.vf-bubble-close').onclick = () => { bubble.remove(); activeBubble = null }

    const resolveBtn = bubble.querySelector('.vf-resolve-btn')
    if (resolveBtn) {
      resolveBtn.onclick = async () => {
        comment.resolved = true
        pin.classList.add('resolved')
        bubble.remove()
        activeBubble = null
        showToast('Marked as resolved')
        if (SUPABASE_URL && SUPABASE_KEY) {
          await fetch(`${SUPABASE_URL}/rest/v1/feedback_comments?id=eq.${comment.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify({ resolved: true }),
          })
        }
      }
    }
  }

  // ── COUNT ─────────────────────────────────────────────────────────────────────
  function updateCount() {
    const open = comments.filter(c => !c.resolved).length
    countEl.textContent = `${open} open · ${comments.length} total`
  }

  // ── EXPORT REPORT ─────────────────────────────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const open = comments.filter(c => !c.resolved)
    if (!open.length) { showToast('No open comments to export'); return }
    const report = open.map((c, i) =>
      `#${c.num} [${c.x_pct}%, ${c.y_pct}%]\n${c.text}`
    ).join('\n\n---\n\n')
    navigator.clipboard.writeText(`FEEDBACK REPORT — ${PAGE_ID}\n${new Date().toLocaleString('en-AU')}\n\n${report}`)
    showToast('Report copied to clipboard ✓')
  })

  // ── LOAD EXISTING COMMENTS FROM SUPABASE ─────────────────────────────────────
  async function loadComments() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback_comments?page_id=eq.${encodeURIComponent(PAGE_ID)}&order=created_at.asc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      )
      const data = await res.json()
      if (!Array.isArray(data)) return
      data.forEach(c => {
        comments.push(c)
        pinCounter = Math.max(pinCounter, c.num || 0)
        const pageX = (c.x_pct / 100) * document.documentElement.scrollWidth
        const pageY = (c.y_pct / 100) * document.documentElement.scrollHeight
        renderPin(c, pageX, pageY)
      })
      updateCount()
    } catch (err) {
      console.warn('Could not load comments:', err)
    }
  }

  loadComments()
})()
