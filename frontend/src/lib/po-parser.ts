/**
 * Simple .po file parser for the frontend
 * Parses GNU gettext .po files and extracts translatable strings
 */

export interface PoEntry {
  index: number
  msgctxt?: string
  msgid: string
  msgstr: string
  flags: string[]
  occurrences: string[]
  tcomment?: string
}

export interface ParsedPo {
  filename: string
  metadata: {
    total_entries: number
    translated: number
    untranslated: number
    fuzzy: number
    completion_pct: number
  }
  all_entries: PoEntry[]
  untranslated: PoEntry[]
  po_headers: Record<string, string>
}

export function parsePoFile(content: string, filename: string): ParsedPo {
  const entries: PoEntry[] = []
  const headers: Record<string, string> = {}

  // Split into entries by double newline
  const blocks = content.split(/\n\s*\n/).filter(b => b.trim())

  let index = 0

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim())

    let msgctxt = ''
    let msgid = ''
    let msgstr = ''
    let flags: string[] = []
    let occurrences: string[] = []
    let tcomment = ''

    let currentField = ''
    let currentValue = ''
    let inMsgid = false
    let inMsgstr = false
    let inMsgctxt = false

    for (const line of lines) {
      // Comments
      if (line.startsWith('#')) {
        if (line.startsWith('#,')) {
          flags = line.slice(2).split(',').map(f => f.trim())
        } else if (line.startsWith('#:')) {
          occurrences.push(line.slice(2).trim())
        } else if (line.startsWith('#.')) {
          tcomment = line.slice(2).trim()
        }
        continue
      }

      // Empty line or non-entry line
      if (!line || line.startsWith('#')) continue

      // Parse msgctxt
      if (line.startsWith('msgctxt ')) {
        inMsgctxt = true
        inMsgid = false
        inMsgstr = false
        msgctxt = unquote(line.slice(8))
        continue
      }

      // Parse msgid
      if (line.startsWith('msgid ')) {
        inMsgid = true
        inMsgctxt = false
        inMsgstr = false
        msgid = unquote(line.slice(6))
        continue
      }

      // Parse msgstr
      if (line.startsWith('msgstr ')) {
        inMsgstr = true
        inMsgid = false
        inMsgctxt = false
        msgstr = unquote(line.slice(7))
        continue
      }

      // Continuation line
      if (line.startsWith('"')) {
        const unquoted = unquote(line)
        if (inMsgctxt) msgctxt += unquoted
        else if (inMsgid) msgid += unquoted
        else if (inMsgstr) msgstr += unquoted
      }
    }

    // Skip empty msgid (header entry)
    if (!msgid) {
      // Parse headers from msgstr
      if (msgstr) {
        const headerLines = msgstr.split('\n')
        for (const hl of headerLines) {
          const colonIdx = hl.indexOf(':')
          if (colonIdx > 0) {
            headers[hl.slice(0, colonIdx).trim()] = hl.slice(colonIdx + 1).trim()
          }
        }
      }
      continue
    }

    const entry: PoEntry = {
      index,
      msgctxt: msgctxt || undefined,
      msgid,
      msgstr,
      flags,
      occurrences,
      tcomment: tcomment || undefined,
    }

    entries.push(entry)
    index++
  }

  // Calculate stats
  const translated = entries.filter(e => e.msgstr && !e.flags.includes('fuzzy')).length
  const untranslated = entries.filter(e => !e.msgstr)
  const fuzzy = entries.filter(e => e.flags.includes('fuzzy')).length

  return {
    filename,
    metadata: {
      total_entries: entries.length,
      translated,
      untranslated: untranslated.length,
      fuzzy,
      completion_pct: entries.length > 0 ? Math.round((translated / entries.length) * 100) : 0,
    },
    all_entries: entries,
    untranslated: untranslated,
    po_headers: headers,
  }
}

function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1)
  }
  // Unescape
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

export function generatePoContent(
  entries: PoEntry[],
  headers: Record<string, string>
): string {
  let output = ''

  // Header entry
  output += '# Translation file header\n'
  output += 'msgid ""\n'
  output += 'msgstr ""\n'
  for (const [key, value] of Object.entries(headers)) {
    output += `"${key}: ${value}\\n"\n`
  }
  output += '\n'

  // Entries
  for (const entry of entries) {
    if (entry.tcomment) {
      output += `#. ${entry.tcomment}\n`
    }
    for (const occ of entry.occurrences) {
      output += `#: ${occ}\n`
    }
    if (entry.flags.length) {
      output += `#, ${entry.flags.join(', ')}\n`
    }
    if (entry.msgctxt) {
      output += `msgctxt "${escapePo(entry.msgctxt)}"\n`
    }
    output += `msgid "${escapePo(entry.msgid)}"\n`
    output += `msgstr "${escapePo(entry.msgstr)}"\n`
    output += '\n'
  }

  return output
}

function escapePo(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
}
