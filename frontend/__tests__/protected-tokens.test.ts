/**
 * Protection of technical identifiers, placeholders and markup.
 *
 * A translation must keep language codes, locale ids, printf specifiers,
 * placeholders, tags and Markdown byte-for-byte. Validation runs before a
 * draft is accepted, before a human can confirm an edit, and before export.
 */

import {
  compareProtectedTokens,
  describeTranslationIssues,
  extractProtectedTokens,
  verifyTranslation,
} from '../src/lib/translate'

describe('extractProtectedTokens — technical identifiers', () => {
  it('treats a source string that is only a language code as fully technical', () => {
    expect(extractProtectedTokens('ar')).toEqual(['ar'])
    expect(extractProtectedTokens('my')).toEqual(['my'])
    expect(extractProtectedTokens('shn')).toEqual(['shn'])
  })

  it('keeps locale identifiers embedded in a longer string', () => {
    const tokens = extractProtectedTokens('Set the locale to en_US and fall back to en_GB')
    expect(tokens).toEqual(expect.arrayContaining(['en_US', 'en_GB']))
  })

  it('protects every example locale from the requirements', () => {
    for (const id of ['en_US', 'en_GB', 'zh_CN', 'pt_BR']) {
      expect(extractProtectedTokens(`Format: ${id}`)).toContain(id)
    }
  })

  it('keeps a bare language code embedded in a longer string', () => {
    expect(extractProtectedTokens('Translate this message into ar')).toContain('ar')
    expect(extractProtectedTokens('Keyboard variant for shn')).toContain('shn')
  })

  it('does not mistake ordinary snake_case for a locale', () => {
    expect(extractProtectedTokens('Call pkg_name after setup')).toEqual([])
  })

  it('leaves everyday English words alone', () => {
    for (const msgid of [
      'Save as...',
      'Select your language to use',
      'Is this correct?',
      'My account',
      'Mr. Smith',
      'St. Paul',
      'No results found',
    ]) {
      expect(extractProtectedTokens(msgid)).toEqual([])
    }
  })

  it('still protects a colliding code when it is the whole source string', () => {
    expect(extractProtectedTokens('my')).toEqual(['my'])
    expect(extractProtectedTokens('to')).toEqual(['to'])
  })
})

describe('extractProtectedTokens — placeholders, markup and Markdown', () => {
  it('captures printf specifiers including the literal percent', () => {
    expect(extractProtectedTokens('%s %d %02d %(name)s %1$s %%')).toEqual(
      expect.arrayContaining(['%s', '%d', '%02d', '%(name)s', '%1$s', '%%']),
    )
  })

  it('captures brace placeholders', () => {
    expect(extractProtectedTokens('Hello {name}, balance ${amount} and {{1}}')).toEqual(
      expect.arrayContaining(['{name}', '${amount}', '{{1}}']),
    )
  })

  it('captures HTML/XML tags and entities', () => {
    const tokens = extractProtectedTokens('<strong>Bold</strong> &amp; &#160;')
    expect(tokens).toEqual(expect.arrayContaining(['<strong>', '</strong>', '&amp;', '&#160;']))
  })

  it('captures Markdown code spans and link targets', () => {
    expect(extractProtectedTokens('Run `apt update` or see [the guide](https://example.com)'))
      .toEqual(expect.arrayContaining(['`apt update`', '[the guide](https://example.com)']))
  })
})

describe('compareProtectedTokens', () => {
  it('reports an identifier the translation dropped', () => {
    expect(compareProtectedTokens('Language: ar', 'ဘာသာစကား')).toEqual({
      missing: ['ar'],
      extra: [],
    })
  })

  it('reports an identifier the translation altered', () => {
    const { missing, extra } = compareProtectedTokens('Locale en_US', 'Locale AR_US')
    expect(missing).toContain('en_US')
    expect(extra.length).toBeGreaterThanOrEqual(1)
  })

  it('reports nothing when every identifier survives', () => {
    expect(compareProtectedTokens('Locale en_US', 'စည်းမျဉ်း en_US')).toEqual({ missing: [], extra: [] })
    expect(compareProtectedTokens('ar', 'ar')).toEqual({ missing: [], extra: [] })
  })

  it('counts a dropped placeholder', () => {
    expect(compareProtectedTokens('%s and %d', '%s only').missing).toEqual(['%d'])
  })
})

describe('describeTranslationIssues — validation gate', () => {
  it('accepts a clean translation', () => {
    expect(describeTranslationIssues('Restart...', 'ပြန်စမည်...')).toBeNull()
    expect(describeTranslationIssues('ar', 'ar')).toBeNull()
    expect(describeTranslationIssues('Language: en_US', 'ဘာသာစကား: en_US')).toBeNull()
  })

  it('accepts an empty target instead of inventing a problem', () => {
    expect(describeTranslationIssues('Power Off', '')).toBeNull()
  })

  it('flags a lost language code', () => {
    const issue = describeTranslationIssues('Language: ar', 'ဘာသာစကား')
    expect(issue).toContain('Preserve: ar')
  })

  it('flags a lost format specifier with the existing message shape', () => {
    expect(describeTranslationIssues('%s has %d items', '%s items')).toBe('Missing: %d')
    expect(describeTranslationIssues('%s', '%s %d')).toBe('Extra: %d')
    expect(describeTranslationIssues('%s is %d', '%d is %s')).toBe('Placeholder order changed')
  })

  it('flags a lost placeholder alongside the format message', () => {
    const issue = describeTranslationIssues('Hello {name}', 'Hello')
    expect(issue).toContain('Preserve: {name}')
  })

  it('flags a lost HTML tag', () => {
    const issue = describeTranslationIssues('<b>Stop</b>', 'ရပ်')
    expect(issue).toContain('<b>')
    expect(issue).toContain('</b>')
  })

  it('flags a lost locale identifier', () => {
    expect(describeTranslationIssues('Keyboard layout: en_US', 'ကီးဘုတ် အနားစက်')).toContain('en_US')
  })
})

describe('verifyTranslation — QA rejects a damaged draft', () => {
  it('passes an intact translation', () => {
    const result = verifyTranslation('%s ready in %d s', '%s အဆင်သင့် %d s', 1)
    const format = result.checks.find(c => c.name === 'Format Specifiers')!
    const tokens = result.checks.find(c => c.name === 'Protected Tokens')!
    expect(format.passed).toBe(true)
    expect(tokens.passed).toBe(true)
    expect(result.passed).toBe(true)
  })

  it('fails when a protected token is dropped', () => {
    const result = verifyTranslation('Locale en_US', 'Locale', 2)
    const tokens = result.checks.find(c => c.name === 'Protected Tokens')!
    expect(tokens.passed).toBe(false)
    expect(tokens.detail).toContain('en_US')
    expect(result.passed).toBe(false)
  })

  it('fails when a language code is translated away', () => {
    const result = verifyTranslation('ar', 'အာရပ်', 3)
    const tokens = result.checks.find(c => c.name === 'Protected Tokens')!
    expect(tokens.passed).toBe(false)
    expect(result.passed).toBe(false)
  })

  it('fails when a format specifier disappears', () => {
    const result = verifyTranslation('%d files', 'files', 4)
    const format = result.checks.find(c => c.name === 'Format Specifiers')!
    expect(format.passed).toBe(false)
    expect(result.passed).toBe(false)
  })
})
