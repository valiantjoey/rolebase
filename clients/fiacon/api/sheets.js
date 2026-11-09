// Google Sheets Proxy + Rolebase portal feed — Fiacon
//
// 1. Sends the application to the role's Google Sheet, which scores it.
// 2. If the role is linked to a Rolebase order (api/_rolebase-feed.js), forwards it
//    with the sheet's score so it shows in the client's portal. Best effort: the
//    sheet is the backup and is never held up by this.

import FEED from './_rolebase-feed.js'

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwhCY7s0yVWKfT6qF6KBah3Q0NFEXb-PPzUsLdz1uQGtmHfDc_OgQM5fHEyQUgRjV4i/exec'

// Roles with their own spreadsheet. Empty string = not wired yet (skip, never fall back to Narellan's sheet).
const ROLE_SHEETS = {
  'northern-beaches': 'https://script.google.com/macros/s/AKfycbwCicbi2W6Q6atZ-w5QXR26gNA7W9HrXUzyXgx7BUD2YMf_cx1I-0HyfMnaBftl7-Qm6A/exec',
  // Lawn & Garden Technician (moved from fiacon-sydney.vercel.app); Rocco's original applicant sheet
  'lawn-garden': 'https://script.google.com/macros/s/AKfycbxqsSOFRIeuAU-MnsS1m9lBSUc-60a02efm9MUy0kQWpEC_2BUeQehIXF1FW9N20fEGWw/exec',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const data = req.body || {}
  const role = data.role_path
  const url = role in ROLE_SHEETS ? ROLE_SHEETS[role] : SHEET_URL
  let text = '', upstream = null, sheetError = null
  if (url) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        redirect: 'follow',
      })
      text = await response.text()
      try { upstream = JSON.parse(text) } catch {}
    } catch (err) {
      sheetError = err
      console.error('Sheets proxy error:', err)
    }
  }

  const link = FEED[role]
  if (link && link.key) {
    const send = fetch(link.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Rolebase-Key': link.key },
      body: JSON.stringify({ order: link.order, campaign: link.campaign, data, questions: link.questions,
        score: upstream && upstream.score, disqualified: upstream && upstream.disqualified === true }),
    }).catch((err) => console.error('Rolebase feed error:', err))
    await Promise.race([send, new Promise((r) => setTimeout(r, 3000))])
  }

  if (sheetError && !link) return res.status(500).json({ ok: false, error: sheetError.message })
  if (!url) return res.status(200).json({ ok: true, skipped: 'sheet not wired for ' + role })
  res.status(200).json({ ok: true, upstream: text })
}
