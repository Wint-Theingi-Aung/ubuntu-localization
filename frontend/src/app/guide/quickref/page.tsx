'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

export default function QuickReferencePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/guide"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Quick Reference</h1>
          <p className="text-white/50 mt-1">
            Essential rules for Ubuntu localization
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="ml-auto p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          title="Print"
        >
          <Printer size={20} />
        </button>
      </div>

      {/* Reference Card */}
      <div className="glass-card p-8 font-mono text-sm">
        <pre className="whitespace-pre-wrap text-white/80 leading-relaxed">
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
          <h3 className="font-semibold text-white mb-4">Common UI Patterns</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-white/50">File menu</p>
              <p className="text-white font-myanmar">ဖိုင်</p>
            </div>
            <div>
              <p className="text-white/50">Edit menu</p>
              <p className="text-white font-myanmar">တည်းဖြတ်</p>
            </div>
            <div>
              <p className="text-white/50">View menu</p>
              <p className="text-white font-myanmar">ကြည့်ရှု</p>
            </div>
            <div>
              <p className="text-white/50">Help menu</p>
              <p className="text-white font-myanmar">အကူအညီ</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Button Labels</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-white/50">OK / Apply</p>
              <p className="text-white font-myanmar">အိုကေ / အသုံးပြု</p>
            </div>
            <div>
              <p className="text-white/50">Cancel</p>
              <p className="text-white font-myanmar">ပယ်ဖျက်</p>
            </div>
            <div>
              <p className="text-white/50">Save</p>
              <p className="text-white font-myanmar">သိမ်းဆည်း</p>
            </div>
            <div>
              <p className="text-white/50">Close</p>
              <p className="text-white font-myanmar">ပိတ်</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
