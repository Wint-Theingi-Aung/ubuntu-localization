'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

export default function QuickReferencePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/guide"
          className="p-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-card-hover)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">Quick Reference</h1>
          <p className="text-[var(--tx-dim)] mt-1">
            Essential rules for Ubuntu localization
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto p-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-card-hover)] transition-colors"
          title="Print"
        >
          <Printer size={20} />
        </button>
      </div>

      {/* Reference Card */}
      <div className="glass-card p-8 font-mono text-sm">
        <pre className="whitespace-pre-wrap text-[var(--tx-secondary)] leading-relaxed">
{`╔══════════════════════════════════════════════════════════════╗
║          UBUNTU LOCALIZATION QUICK REFERENCE CARD           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. PRESERVE PLACEHOLDERS                                    ║
║  ─────────────────────────────────────────────────────────── ║
║  ✓ %s, %d, %f, %u      Positional placeholders              ║
║  ✓ %(name)s, %(count)d  Named placeholders                   ║
║  ✓ {0}, {1}, {item}     Template placeholders                ║
║                                                              ║
║  Source: "Found %d files in %s"                              ║
║  ✓ OK:  "ဖိုင် %d ခုကို %s တွင် တွေ့ရှိပါသည်"                ║
║  ✗ BAD: "ဖိုင်များကို တွေ့ရှိပါသည်"                            ║
║                                                              ║
║  2. PRESERVE HTML TAGS                                       ║
║  ─────────────────────────────────────────────────────────── ║
║  Source: "Click <b>here</b> to continue"                     ║
║  ✓ OK:  "ဆက်လက်ရန် <b>ဤနေရာ</b> ကိုနှိပ်ပါ"                   ║
║  ✗ BAD: "ဆက်လက်ရန် ဤနေရာကို နှိပ်ပါ" (missing <b> tag)       ║
║                                                              ║
║  3. KEEP TECHNICAL TERMS UNTRANSLATED                        ║
║  ─────────────────────────────────────────────────────────── ║
║  Kernel, GNOME, sudo, apt, repository, GRUB                 ║
║  X11, Wayland, ext4, Btrfs, LVM, DHCP, DNS                 ║
║  SSH, VPN, TCP, systemd, dbus, PulseAudio                   ║
║  PipeWire, AppArmor, Ubuntu, Canonical, Debian              ║
║  Firefox, LibreOffice, Thunderbird                           ║
║                                                              ║
║  4. PRESERVE NEWLINES                                        ║
║  ─────────────────────────────────────────────────────────── ║
║  Count \\n in source = count \\n in translation              ║
║                                                              ║
║  5. LENGTH RATIO: 0.3x – 4.0x of source                     ║
║  ─────────────────────────────────────────────────────────── ║
║  Source: 20 chars → Translation: 6-80 chars OK              ║
║                                                              ║
║  6. SCRIPT RULES                                             ║
║  ─────────────────────────────────────────────────────────── ║
║  Myanmar: Always Unicode, NEVER Zawgyi                      ║
║  Shan:    Use Shan Unicode block                             ║
║  Mon:     Use Mon Unicode block                              ║
║  Karen:   Use S'gaw Karen Unicode block                      ║
║                                                              ║
║  7. CONTEXT-SPECIFIC                                         ║
║  ─────────────────────────────────────────────────────────── ║
║  Menu items:     Concise imperative form                     ║
║  Help text:      Natural explanatory language                ║
║  Error messages: Clear, actionable, respectful               ║
║  Buttons:        Short, action-oriented                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝`}
        </pre>
      </div>

      {/* Common Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-[var(--tx-primary)] mb-4">Common UI Patterns</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[var(--tx-dim)]">File menu</p>
              <p className="text-[var(--tx-primary)] font-myanmar">ဖိုင်</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">Edit menu</p>
              <p className="text-[var(--tx-primary)] font-myanmar">တည်းဖြတ်</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">View menu</p>
              <p className="text-[var(--tx-primary)] font-myanmar">ကြည့်ရှု</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">Help menu</p>
              <p className="text-[var(--tx-primary)] font-myanmar">အကူအညီ</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-[var(--tx-primary)] mb-4">Button Labels</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[var(--tx-dim)]">OK / Apply</p>
              <p className="text-[var(--tx-primary)] font-myanmar">အိုကေ / အသုံးပြု</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">Cancel</p>
              <p className="text-[var(--tx-primary)] font-myanmar">ပယ်ဖျက်</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">Save</p>
              <p className="text-[var(--tx-primary)] font-myanmar">သိမ်းဆည်း</p>
            </div>
            <div>
              <p className="text-[var(--tx-dim)]">Close</p>
              <p className="text-[var(--tx-primary)] font-myanmar">ပိတ်</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
