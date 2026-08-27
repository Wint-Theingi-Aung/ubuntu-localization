/**
 * Regression test: Launchpad PO round-trip compatibility.
 *
 * Verifies that parsing a Launchpad-style PO file and re-generating it
 * preserves all Launchpad-specific headers, entry metadata (flags,
 * occurrences, msgctxt, translator comments), and content integrity.
 */

import { parsePoFile, generatePoContent, type PoEntry } from '../src/lib/po-parser'

// A realistic Launchpad-exported PO snippet with:
//   - Launchpad-specific headers
//   - msgctxt entries
//   - #, fuzzy flags
//   - #: source references
//   - #. translator comments
//   - multi-line msgstr
const LAUNCHPAD_PO = `# Myanmar (Burmese) translation for Ubuntu Installer
# Copyright (C) 2024 Free Software Foundation, Inc.
# This file is distributed under the same license as the Ubuntu Installer package.
#
msgid ""
msgstr ""
"Project-Id-Version: ubuntu-installer 2.0.0beta1\\n"
"Report-Msgid-Bugs-To: https://bugs.launchpad.net/ubuntu/+filebug\\n"
"POT-Creation-Date: 2024-06-15 10:30+0000\\n"
"PO-Revision-Date: 2024-07-01 14:22+0630\\n"
"Last-Translator: Launchpad User <user@launchpad.net>\\n"
"Language: my\\n"
"Language-Team: Myanmar\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Launchpad-Export-Version: 1\\n"
"Launchpad-Revision-Date: 2024-07-01 14:22:00+0000\\n"
"Plural-Forms: nplurals=1; plural=0;\\n"

#: ../src/install.c:42
#. Welcome message shown at boot
#, fuzzy
msgid "Welcome to Ubuntu"
msgstr "Ubuntu ကို ကြိုဆိုပါတယ်"

#: ../src/network.c:101
#: ../src/network.c:150
msgid "Connect to a network"
msgstr "ကွန်ယက်တစ်ခုသို့ ချိတ်ဆက်ပါ"

#: ../src/disk.c:88
msgctxt "partition"
msgid "Erase disk and install Ubuntu"
msgstr "ဒစ်ဂျစ်တယ်ကို ဖျက်ပြီး Ubuntu ကို ထည့်သွင်းပါ"

#: ../src/disk.c:92
msgctxt "partition"
msgid "Install Ubuntu alongside existing OS"
msgstr "ရှိပြီးသား OS နှင့်အတူ Ubuntu ကို ထည့်သွင်းပါ"

#: ../src/user.c:20
msgid "Who are you?"
msgstr ""
`

describe('Launchpad PO round-trip compatibility', () => {
  const parsed = parsePoFile(LAUNCHPAD_PO, 'my.po')
  const regenerated = generatePoContent(parsed.all_entries, parsed.po_headers)

  describe('Header preservation', () => {
    it('preserves Launchpad-Export-Version header', () => {
      expect(regenerated).toContain('Launchpad-Export-Version: 1')
    })

    it('preserves Launchpad-Revision-Date header', () => {
      expect(regenerated).toContain('Launchpad-Revision-Date: 2024-07-01 14:22:00+0000')
    })

    it('preserves Report-Msgid-Bugs-To header', () => {
      expect(regenerated).toContain('Report-Msgid-Bugs-To: https://bugs.launchpad.net/ubuntu/+filebug')
    })

    it('preserves Project-Id-Version header', () => {
      expect(regenerated).toContain('Project-Id-Version: ubuntu-installer 2.0.0beta1')
    })

    it('preserves Language header', () => {
      expect(regenerated).toContain('Language: my')
    })

    it('preserves PO-Revision-Date header', () => {
      expect(regenerated).toContain('PO-Revision-Date: 2024-07-01 14:22+0630')
    })

    it('preserves Last-Translator header', () => {
      expect(regenerated).toContain('Last-Translator: Launchpad User <user@launchpad.net>')
    })

    it('preserves Content-Type header', () => {
      expect(regenerated).toContain('Content-Type: text/plain; charset=UTF-8')
    })

    it('preserves Plural-Forms header', () => {
      expect(regenerated).toContain('Plural-Forms: nplurals=1; plural=0;')
    })

    it('does not overwrite headers with defaults', () => {
      expect(regenerated).not.toContain('Last-Translator: Ubuntu Localization Tool')
    })
  })

  describe('Entry metadata preservation', () => {
    it('preserves fuzzy flag', () => {
      expect(regenerated).toContain('#, fuzzy')
    })

    it('preserves source references', () => {
      expect(regenerated).toContain('#: ../src/install.c:42')
      expect(regenerated).toContain('#: ../src/network.c:101')
    })

    it('preserves multiple source references per entry', () => {
      expect(regenerated).toContain('#: ../src/network.c:101\n#: ../src/network.c:150')
    })

    it('preserves translator comments', () => {
      expect(regenerated).toContain('#. Welcome message shown at boot')
    })

    it('preserves msgctxt', () => {
      expect(regenerated).toContain('msgctxt "partition"')
    })

    it('preserves untranslated entries (empty msgstr)', () => {
      expect(regenerated).toContain('msgid "Who are you?"\nmsgstr ""')
    })
  })

  describe('Content integrity', () => {
    it('preserves all original msgid strings', () => {
      expect(regenerated).toContain('msgid "Welcome to Ubuntu"')
      expect(regenerated).toContain('msgid "Connect to a network"')
      expect(regenerated).toContain('msgid "Erase disk and install Ubuntu"')
      expect(regenerated).toContain('msgid "Install Ubuntu alongside existing OS"')
      expect(regenerated).toContain('msgid "Who are you?"')
    })

    it('preserves all original msgstr translations', () => {
      expect(regenerated).toContain('msgstr "Ubuntu ကို ကြိုဆိုပါတယ်"')
      expect(regenerated).toContain('msgstr "ကွန်ယက်တစ်ခုသို့ ချိတ်ဆက်ပါ"')
    })

    it('has the correct number of entries (not counting header)', () => {
      expect(parsed.all_entries).toHaveLength(5)
    })

    it('detects untranslated entries', () => {
      expect(parsed.untranslated).toHaveLength(1)
      expect(parsed.untranslated[0].msgid).toBe('Who are you?')
    })

    it('detects fuzzy entries', () => {
      expect(parsed.metadata.fuzzy).toBe(1)
    })
  })
})
