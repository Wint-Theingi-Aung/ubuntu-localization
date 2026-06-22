"""UI translations for the web interface in 5 languages.

Languages: my (Burmese), en (English), shn (Shan), mnw (Mon), ksw (S'gaw Karen)
Default: my (Burmese / မြန်မာ)
"""

# ── Translation keys ────────────────────────────────────────────────────

TRANSLATIONS = {
    # ── Sidebar ──
    "sidebar.workflow": {
        "my": "အလုပ်လုပ်ဆောင်ချက်",
        "en": "Workflow",
        "shn": "လွင်ႈႁဵတ်းၵၢၼ်",
        "mnw": "ကမၠောန်",
        "ksw": "တၢ်မၤ",
    },
    "sidebar.home": {
        "my": "ပင်မစာမျက်နှာ",
        "en": "Home",
        "shn": "ၼႃႈလိၵ်ႈငဝ်ႈ",
        "mnw": "မုက်လိက်တမ်",
        "ksw": "ဟံၣ်လိၣ်",
    },
    "sidebar.guide": {
        "my": "လမ်းညွှန်",
        "en": "Guide",
        "shn": "သိုဝ်ႇၼႄ",
        "mnw": "လၚ်ညး",
        "ksw": "တၢ်ဟဲၢ်လိၣ်",
    },
    "sidebar.translate": {
        "my": "ဘာသာပြန်ရန်",
        "en": "Translate",
        "shn": "ပိၼ်ႇၽႃႇသႃႇ",
        "mnw": "ပြန်ဘာသာ",
        "ksw": "ကွဲးကျဲၤ",
    },
    "sidebar.more": {
        "my": "အခြား",
        "en": "More",
        "shn": "တၢင်ႇၸိူဝ်း",
        "mnw": "တၞဟ်",
        "ksw": "တၢ်ဂၢၢ်",
    },
    "sidebar.leaderboard": {
        "my": "အဆင့်သတ်မှတ်ချက်",
        "en": "Leaderboard",
        "shn": "သဵၼ်ႈၸၼ်ႉ",
        "mnw": "စရင်အဆင့်",
        "ksw": "တၢ်ပာ်ဖျၢၣ်",
    },
    "sidebar.history": {
        "my": "မှတ်တမ်း",
        "en": "History",
        "shn": "ပိုၼ်းမၢႆ",
        "mnw": "ဝင်",
        "ksw": "တၢ်ကတီၢ်",
    },

    # ── Dashboard ──
    "dashboard.title": {
        "my": "Ubuntu ဘာသာပြန် စနစ်",
        "en": "Ubuntu Localization",
        "shn": "Ubuntu ပိၼ်ႇၽႃႇသႃႇ",
        "mnw": "Ubuntu ပြန်ဘာသာ",
        "ksw": "Ubuntu တၢ်ကွဲးကျဲၤ",
    },
    "dashboard.subtitle": {
        "my": "AI အကူအညီဖြင့် Ubuntu ကို ဌာနေဘာသာစကားများသို့ ပြန်ဆိုခြင်း",
        "en": "AI-powered Ubuntu OS localization for indigenous languages",
        "shn": "AI ၸွႆႈထႅမ် Ubuntu ပိၼ်ႇၽႃႇသႃႇ",
        "mnw": "AI ထံက်ပၚ Ubuntu ပြန်ဘာသာ",
        "ksw": "AI မၤစၢၤ Ubuntu တၢ်ကွဲးကျဲၤ",
    },
    "dashboard.languages": {
        "my": "ပံ့ပိုးထားသော ဘာသာစကားများ",
        "en": "Supported Languages",
        "shn": "ၽႃႇသႃႇၵႂၢမ်းဢၼ်ၸွႆႈထႅမ်",
        "mnw": "ဘာသာ မထံက်ပၚ",
        "ksw": "ကျိာ်လၢအမၤစၢၤ",
    },
    "dashboard.lang_count": {
        "my": "ဘာသာစကား",
        "en": "Languages",
        "shn": "ၽႃႇသႃႇ",
        "mnw": "ဘာသာ",
        "ksw": "ကျိာ်",
    },
    "dashboard.ai_ready": {
        "my": "AI အဆင်သင့်",
        "en": "AI Ready",
        "shn": "AI ၸွမ်းႁႂ်ႈ",
        "mnw": "AI အဆင်",
        "ksw": "AI ဟဲ",
    },
    "dashboard.version": {
        "my": "ဗားရှင်း",
        "en": "Version",
        "shn": "ဗားရွင်း",
        "mnw": "ဗားရှင်",
        "ksw": "အဆၢ",
    },
    "dashboard.ai_warning": {
        "my": "Google API ကီး မသတ်မှတ်ထားပါ။ AI ဘာသာပြန်ရန် <code>GOOGLE_API_KEY</code> ကို <code>.env</code> တွင် ထည့်ပါ။",
        "en": "Google API key not configured. Set <code>GOOGLE_API_KEY</code> in <code>.env</code> to enable AI translation.",
        "shn": "Google API key ဢမ်ႇတႅမ်ႈဝႆႉ။ တႅမ်ႈ <code>GOOGLE_API_KEY</code> ၼႂ်း <code>.env</code>။",
        "mnw": "Google API key ဟွံစုတ်။ စုတ် <code>GOOGLE_API_KEY</code> ပ္ဍဲ <code>.env</code>။",
        "ksw": "Google API key တပာ်ဘၣ်။ ပာ် <code>GOOGLE_API_KEY</code> ဖဲ <code>.env</code>။",
    },

    # ── Translate Page ──
    "translate.title": {
        "my": ".po ဖိုင် ဘာသာပြန်ရန်",
        "en": "Translate .po Pipeline",
        "shn": "ပိၼ်ႇ .po ဖၢႆႇ",
        "mnw": "ပြန် .po ဖိုင်",
        "ksw": "ကွဲး .po လံာ်",
    },
    "translate.subtitle": {
        "my": "အပ်လုဒ် · ဘာသာပြန် · ထုတ်ယူ — အားလုံး တစ်နေရာတည်းတွင်",
        "en": "Upload · Translate · Export — all in one place",
        "shn": "လူတ်ႇၶိုၼ်ႈ · ပိၼ်ႇ · ဢွၵ်ႇ — တီႈလဵဝ်",
        "mnw": "ပၠောပ် · ပြန် · တိတ် — ပ္ဍဲဒၞာဲမွဲ",
        "ksw": "ဒီထံ · ကွဲး · ဟဲထ — ဖဲတခီမၤ",
    },
    "translate.upload_title": {
        "my": "📤 .po ဖိုင် အပ်လုဒ်လုပ်ရန်",
        "en": "📤 Upload .po File",
        "shn": "📤 လူတ်ႇၶိုၼ်ႈ .po ဖၢႆႇ",
        "mnw": "📤 ပၠောပ် .po ဖိုင်",
        "ksw": "📤 ဒီထံ .po လံာ်",
    },
    "translate.drop_text": {
        "my": ".po သို့မဟုတ် .pot ဖိုင်ကို ဤနေရာသို့ ဆွဲချပါ သို့မဟုတ် နှိပ်၍ ရွေးပါ",
        "en": "Drop .po or .pot file here or click to browse",
        "shn": "တူၵ်း .po .pot ဖၢႆႇတီႈၼႆႈ ဢမ်ႇၼၼ် ႁႂ်ႈလိူၵ်ႈ",
        "mnw": "ဓဟောတ် .po .pot ဖိုင် ပ္ဍဲဏံ ဟွံသေၚ် ဍဵုၜါတ်",
        "ksw": "ဟဲထ .po .pot လံာ် ဖဲအံၤ မူဒါ နဲၣ်ကွဲး",
    },
    "translate.file_types": {
        "my": "GNU gettext .po နှင့် .pot ဖိုင်များသာ · အများဆုံး 50 MB",
        "en": "GNU gettext .po and .pot files only · Max 50 MB",
        "shn": "GNU gettext .po .pot ၵူၺ်း · ၼမ်ႉသုင် 50 MB",
        "mnw": "GNU gettext .po .pot ဟေ · အိုတ် 50 MB",
        "ksw": "GNU gettext .po .pot လံာ်မး� · အါ 50 MB",
    },
    "translate.target_lang": {
        "my": "ဘာသာပြန်မည့် ဘာသာစကား",
        "en": "Target Language",
        "shn": "ၽႃႇသႃႇထႅင်ႈ",
        "mnw": "ဘာသာတၞဟ်",
        "ksw": "ကျိာ်တၢ်ကွဲး",
    },
    "translate.upload_btn": {
        "my": "📤 အပ်လုဒ်လုပ်၍ ဖတ်ရန်",
        "en": "📤 Upload & Parse",
        "shn": "📤 လူတ်ႇၶိုၼ်ႈလႄႈဢၢၼ်ႇ",
        "mnw": "📤 ပၠောပ်လေဝ်ဗှ်",
        "ksw": "📤 ဒီထံဒီးဖး",
    },
    "translate.file_hint": {
        "my": "GNU gettext <code>.po</code> / <code>.pot</code> ဖိုင်များ · UTF-8 · အများဆုံး 50 MB",
        "en": "Supports standard GNU gettext <code>.po</code> / <code>.pot</code> files · UTF-8 · Max 50 MB",
        "shn": "ၸွႆႈထႅမ် GNU gettext <code>.po</code> / <code>.pot</code> · UTF-8 · 50 MB",
        "mnw": "ထံက်ပၚ GNU gettext <code>.po</code> / <code>.pot</code> · UTF-8 · 50 MB",
        "ksw": "မၤစၢၤ GNU gettext <code>.po</code> / <code>.pot</code> · UTF-8 · 50 MB",
    },
    "translate.demo_title": {
        "my": "🧪 နမူနာဖိုင်ဖြင့် စမ်းသပ်ရန်",
        "en": "🧪 Try with Sample File",
        "shn": "🧪 ၸၢမ်းတူၺ်းတင်းၾၢႆႇတႅမ်ႈဝႆႉ",
        "mnw": "🧪 စမ်နကဵုဖိုင်နမူနာ",
        "ksw": "🧪 မၤသးဒီးလံာ်နမူနာ",
    },
    "translate.demo_desc": {
        "my": ".po ဖိုင် မရှိပါက နမူနာဖြင့် စမ်းသပ်ပါ။ Ubuntu GNOME Power Off menu မှ စာကြောင်း ၅ ကြောင်း: <strong>Power Off</strong>, <strong>Suspend</strong>, <strong>Restart...</strong>, <strong>Power Off...</strong>, <strong>Log Out...</strong>",
        "en": "No .po file? Test with a sample. 5 strings from Ubuntu GNOME Power Off menu: <strong>Power Off</strong>, <strong>Suspend</strong>, <strong>Restart...</strong>, <strong>Power Off...</strong>, <strong>Log Out...</strong>",
        "shn": "ဢမ်ႇမီး .po ၾၢႆႇ? ၸၢမ်းတူၺ်းတင်းၾၢႆႇတႅမ်ႈဝႆႉ။ Ubuntu GNOME Power Off menu ၼႃႈ ၵေႃႈ 5: <strong>Power Off</strong>, <strong>Suspend</strong>, <strong>Restart...</strong>, <strong>Power Off...</strong>, <strong>Log Out...</strong>",
        "mnw": "ဟွံမဲ .po ဖိုင်? စမ်နကဵုနမူနာ။ Ubuntu GNOME Power Off menu ကေ စာကြောင်း 5: <strong>Power Off</strong>, <strong>Suspend</strong>, <strong>Restart...</strong>, <strong>Power Off...</strong>, <strong>Log Out...</strong>",
        "ksw": "တမဲ .po လံာ်? မၤသးဒီးနမူနာ။ Ubuntu GNOME Power Off menu ဖဲ စာကြောင်း 5: <strong>Power Off</strong>, <strong>Suspend</strong>, <strong>Restart...</strong>, <strong>Power Off...</strong>, <strong>Log Out...</strong>",
    },
    "translate.demo_btn": {
        "my": "🧪 နမူနာ စာကြောင်းများ တင်ရန်",
        "en": "🧪 Load Demo Strings",
        "shn": "🧪 လူတ်ႇၶိုၼ်ႈ တူဝ်ယိူင်းထႅမ်း",
        "mnw": "🧪 ပၠောပ် နမူနာ",
        "ksw": "🧪 ဒီထံ နမူနာ",
    },

    # ── Translation Workspace ──
    "translate.workspace_title": {
        "my": "📝 ဘာသာပြန်ရန် — စာမျက်နှာ {page} / {total}",
        "en": "📝 Translate Strings — page {page} of {total}",
        "shn": "📝 ပိၼ်ႇၶေႃႈ — ၼႃႈ {page} ၼႂ်း {total}",
        "mnw": "📝 ပြန်လိက် — မုက် {page} နူ {total}",
        "ksw": "📝 ကွဲးလံာ် — ကဘျံ {page} ဖဲ {total}",
    },
    "translate.workspace_count": {
        "my": "{count} ခု ဘာသာမပြန်ရသေး",
        "en": "{count} untranslated total",
        "shn": "{count} ပႆႇပိၼ်ႇ",
        "mnw": "{count} ဟဗြန်ဏီ",
        "ksw": "{count} တကွဲးဘၣ်",
    },
    "translate.ai_title": {
        "my": "🤖 AI ဘာသာပြန်",
        "en": "🤖 AI Batch Translation",
        "shn": "🤖 AI ပိၼ်ႇၽႃႇသႃႇ",
        "mnw": "🤖 AI ပြန်ဘာသာ",
        "ksw": "🤖 AI ကွဲးကျဲၤ",
    },
    "translate.ai_page": {
        "my": "စာမျက်နှာ {page} / {total}",
        "en": "Page {page} of {total}",
        "shn": "ၼႃႈ {page} ၼႂ်း {total}",
        "mnw": "မုက် {page} နူ {total}",
        "ksw": "ကဘျံ {page} ဖဲ {total}",
    },
    "translate.ai_btn": {
        "my": "🤖 ဤစာမျက်နှာမှ စာကြောင်း {count} ခုကို ဘာသာပြန်ရန်",
        "en": "🤖 Translate Page ({count} strings)",
        "shn": "🤖 ပိၼ်ႇၼႃႈ ({count} ၶေႃႈ)",
        "mnw": "🤖 ပြန်မုက် ({count} လိက်)",
        "ksw": "🤖 ကွဲးကဘျံ ({count} လံာ်)",
    },
    "translate.ai_warning": {
        "my": "AI ဘာသာပြန်ခြင်း မရနိုင်ပါ။ <code>GOOGLE_API_KEY</code> ကို <code>.env</code> တွင် ထည့်ပါ။",
        "en": "AI translation not available. Set <code>GOOGLE_API_KEY</code> in <code>.env</code>.",
        "shn": "AI ပိၼ်ႇဢမ်ႇလႆႈ။ တႅမ်ႈ <code>GOOGLE_API_KEY</code> ၼႂ်း <code>.env</code>။",
        "mnw": "AI ပြန်ဟွံဂတာပ်။ စုတ် <code>GOOGLE_API_KEY</code> ပ္ဍဲ <code>.env</code>။",
        "ksw": "AI ကွဲးတဘၣ်။ ပာ် <code>GOOGLE_API_KEY</code> ဖဲ <code>.env</code>။",
    },
    "translate.all_done": {
        "my": "စာကြောင်းအားလုံး ဘာသာပြန်ပြီးပါပြီ။ ထုတ်ယူရန် အဆင်သင့်ဖြစ်ပါပြီ။",
        "en": "All strings are translated! You're ready to export.",
        "shn": "ၶေႃႈတင်းသဵင်ႈပိၼ်ႇယဝ်ႉ။ ဢွၵ်ႇလႆႈယဝ်ႉ။",
        "mnw": "လိက်သီုဖအိုတ်ပြန်တုဲ။ တိတ်ဂတာပ်။",
        "ksw": "လံာ်ခဲလၢၢ်ကွဲးဝဲ။ ဟဲထဂတာပ်။",
    },
    "translate.prev": {
        "my": "← ရှေ့သို့",
        "en": "← Previous",
        "shn": "← ၵႂႃႇ",
        "mnw": "← လက်ကရဴ",
        "ksw": "← လၢအီၣ်",
    },
    "translate.next": {
        "my": "နောက်သို့ →",
        "en": "Next →",
        "shn": "ထႅင်ႈ →",
        "mnw": "ဂတ →",
        "ksw": "အီၣ် →",
    },

    # ── Export ──
    "export.title": {
        "my": "📥 ဘာသာပြန်ချက်များ ထုတ်ယူရန်",
        "en": "📥 Export Translations",
        "shn": "📥 ဢွၵ်ႇၶေႃႈပိၼ်ႇ",
        "mnw": "📥 တိတ်လိက်ပြန်",
        "ksw": "📥 ဟဲထတၢ်ကွဲး",
    },
    "export.total": {
        "my": "စုစုပေါင်း",
        "en": "Total",
        "shn": "တင်းသဵင်ႈ",
        "mnw": "သီုဖအိုတ်",
        "ksw": "ခဲလၢၢ်",
    },
    "export.existing": {
        "my": "ရှိပြီး",
        "en": "Existing",
        "shn": "မီးဝႆႉ",
        "mnw": "မဲ",
        "ksw": "အဝဲ",
    },
    "export.new": {
        "my": "အသစ်",
        "en": "New",
        "shn": "မႂ်ႇ",
        "mnw": "တၟိ",
        "ksw": "သီ",
    },
    "export.qa_passed": {
        "my": "QA အောင်မြင်",
        "en": "QA Passed",
        "shn": "QA ၶိုင်မႃး",
        "mnw": "QA အောင်",
        "ksw": "QA ဟဲ",
    },
    "export.output_file": {
        "my": "ထုတ်ယူမည့်ဖိုင်",
        "en": "Output File",
        "shn": "ၾၢႆႇဢွၵ်ႇ",
        "mnw": "ဖိုင်တိတ်",
        "ksw": "လံာ်ဟဲထ",
    },
    "export.source": {
        "my": "ရင်းမြစ်",
        "en": "Source",
        "shn": "ငဝ်ႈ",
        "mnw": "တမ်",
        "ksw": "ထံထၢၣ်",
    },
    "export.btn": {
        "my": "📥 .po ဖိုင် ထုတ်ယူရန်",
        "en": "📥 Export .po File",
        "shn": "📥 ဢွၵ်ႇ .po ၾၢႆႇ",
        "mnw": "📥 တိတ် .po ဖိုင်",
        "ksw": "📥 ဟဲထ .po လံာ်",
    },
    "export.download_btn": {
        "my": "📥 .po ဖိုင် ဒေါင်းလုဒ်လုပ်ရန်",
        "en": "📥 Download .po file",
        "shn": "📥 လူတ်ႇလူင်း .po ၾၢႆႇ",
        "mnw": "📥 ဒေါင်လုဒ် .po ဖိုင်",
        "ksw": "📥 ဒေါင်းလုဒ် .po လံာ်",
    },
    "export.complete": {
        "my": "ထုတ်ယူမှု အောင်မြင်ပါသည်။",
        "en": "Export complete!",
        "shn": "ဢွၵ်ႇယဝ်ႉ။",
        "mnw": "တိတ်တုဲ။",
        "ksw": "ဟဲထဝဲ။",
    },
    "export.strings_count": {
        "my": "+{count} ခု ဘာသာပြန်အသစ်",
        "en": "+{count} new translations",
        "shn": "+{count} ၶေႃႈပိၼ်ႇမႂ်ႇ",
        "mnw": "+{count} လိက်ပြန်တၟိ",
        "ksw": "+{count} တၢ်ကွဲးသီ",
    },
    "export.completion": {
        "my": "ပြီးစီးမှု",
        "en": "Completion",
        "shn": "ယဝ်ႉတူဝ်ႈ",
        "mnw": "တုဲဒှ်",
        "ksw": "ဝဲဒၣ်",
    },

    # ── Showcase ──
    "showcase.title": {
        "my": "လက်တွေ့ ဘာသာပြန် အကျဉ်းချုပ်",
        "en": "Real-World Translation Preview",
        "shn": "ပိၼ်ႇၽႃႇသႃႇ လႆႈၵေႃႈႁဝ်း",
        "mnw": "ပြန်လိက် လက်တွေ့",
        "ksw": "ကွဲးကျဲၤ လက်တွေ့",
    },
    "showcase.subtitle": {
        "my": "Ubuntu GNOME menu များကို {target_lang} အသုံးပြုသူများအတွက် ဘာသာပြန်ပုံကို ကြည့်ပါ။",
        "en": "See how Ubuntu GNOME menus become localized for {target_lang} users.",
        "shn": "Ubuntu GNOME menu ၼႃႈ {target_lang} ၸႂ်ႉတိုၵ်းၸိူဝ်း။",
        "mnw": "Ubuntu GNOME menu ကေ {target_lang} သုင်ကေ ပြန်ဘာသာ။",
        "ksw": "Ubuntu GNOME menu ၶောမ် {target_lang} သုံၤကွဲးကျဲၤ။",
    },
    "showcase.before": {
        "my": "မတိုင်မီ",
        "en": "Before",
        "shn": "ၼိူင်ႁိမ်း",
        "mnw": "အရိ",
        "ksw": "မဲစိၣ်",
    },
    "showcase.after": {
        "my": "ပြီးနောက်",
        "en": "After",
        "shn": "ယဝ်ႉတီႈ",
        "mnw": "ဒှ်မဲ",
        "ksw": "ဒှဲ",
    },
    "showcase.english_interface": {
        "my": "အင်္ဂလိပ် Interface",
        "en": "English Interface",
        "shn": "အင်္ဂလိပ် Interface",
        "mnw": "အင်္ဂလိပ် Interface",
        "ksw": "အင်္ဂလိပ် Interface",
    },
    "showcase.target_interface": {
        "my": "{target_lang} Interface",
        "en": "{target_lang} Interface",
        "shn": "{target_lang} Interface",
        "mnw": "{target_lang} Interface",
        "ksw": "{target_lang} Interface",
    },
    "showcase.titlebar_en": {
        "my": "Power Off — အင်္ဂလိပ်",
        "en": "Power Off — English",
        "shn": "Power Off — အင်္ဂလိပ်",
        "mnw": "Power Off — အင်္ဂလိပ်",
        "ksw": "Power Off — အင်္ဂလိပ်",
    },
    "showcase.titlebar_target": {
        "my": "Power Off — {target_lang}",
        "en": "Power Off — {target_lang}",
        "shn": "Power Off — {target_lang}",
        "mnw": "Power Off — {target_lang}",
        "ksw": "Power Off — {target_lang}",
    },
    "showcase.footer_label": {
        "my": "အင်္ဂလိပ် → {target_lang}",
        "en": "English → {target_lang}",
        "shn": "အင်္ဂလိပ် → {target_lang}",
        "mnw": "အင်္ဂလိပ် → {target_lang}",
        "ksw": "အင်္ဂလိပ် → {target_lang}",
    },
    "showcase.footer_sub": {
        "my": "လက်တွေ့ Ubuntu GNOME menu ဘာသာပြန် နမူနာ",
        "en": "Real Ubuntu GNOME menu localization example",
        "shn": "Ubuntu GNOME menu ပိၼ်ႇၽႃႇသႃႇ ၸၢမ်း",
        "mnw": "Ubuntu GNOME menu ပြန်လိက် နမူနာ",
        "ksw": "Ubuntu GNOME menu ကွဲးကျဲၤ နမူနာ",
    },

    # ── Batch Results ──
    "batch.translated": {
        "my": "{count} ခု ဘာသာပြန်ပြီး",
        "en": "{count} strings translated",
        "shn": "{count} ၶေႃႈပိၼ်ႇယဝ်ႉ",
        "mnw": "{count} လိက်ပြန်တုဲ",
        "ksw": "{count} လံာ်ကွဲးဝဲ",
    },
    "batch.passed": {
        "my": "✔ အောင်မြင်",
        "en": "✔ Passed",
        "shn": "✔ ၶိုင်မႃး",
        "mnw": "✔ အောင်",
        "ksw": "✔ ဟဲ",
    },
    "batch.errors": {
        "my": "✔ အမှား ၀ ခု",
        "en": "✔ 0 errors",
        "shn": "✔ 0 တူဝ်ယိူင်း",
        "mnw": "✔ 0 ဗၠေတ်",
        "ksw": "✔ 0 တၢ်ကမၢ",
    },
    "batch.flagged": {
        "my": "⚠️ {count} ခု သတိပေး",
        "en": "⚠️ {count} flagged",
        "shn": "⚠️ {count} တူဝ်ယိူင်း",
        "mnw": "⚠️ {count} ဗၠေတ်",
        "ksw": "⚠️ {count} တၢ်ကမၢ",
    },
    "batch.ready_export": {
        "my": "ထုတ်ယူရန် အဆင်သင့်ဖြစ်ပါပြီ",
        "en": "Ready to export",
        "shn": "ဢွၵ်ႇလႆႈယဝ်ႉ",
        "mnw": "တိတ်ဂတာပ်",
        "ksw": "ဟဲထဂတာပ်",
    },
    "batch.saved": {
        "my": "✓ သိမ်းပြီး",
        "en": "✓ Saved",
        "shn": "✓ သိမ်းယဝ်ႉ",
        "mnw": "✓ သိမ်တုဲ",
        "ksw": "✓ သွဝဲ",
    },

    # ── Session ──
    "session.not_found": {
        "my": "ဆက်ရှင် မတွေ့ပါ",
        "en": "Session not found",
        "shn": "ဢမ်ႇႁၼ်သႅတ်းရွၼ်း",
        "mnw": "ဟွံဆဵု ဆက်ရှင်",
        "ksw": "တထံဘၣ် ဆက်ရှင်",
    },
    "session.done": {
        "my": "ပြီးပြီ",
        "en": "Done",
        "shn": "ယဝ်ႉ",
        "mnw": "တုဲ",
        "ksw": "ဝဲ",
    },
    "session.missing": {
        "my": "မရှိ",
        "en": "Missing",
        "shn": "ဢမ်ႇမီး",
        "mnw": "ဟွံမဲ",
        "ksw": "တမဲ",
    },
    "session.fuzzy": {
        "my": "မသေချာ",
        "en": "Fuzzy",
        "shn": "ဢမ်ႇၼိင်ႈ",
        "mnw": "ဟွံချိုတ်",
        "ksw": "တကယၤ",
    },
    "session.no_data": {
        "my": "စတင်ရန် .po ဖိုင် တစ်ခု အပ်လုဒ်လုပ်ပါ။",
        "en": "Upload a .po file to get started.",
        "shn": "လူတ်ႇၶိုၼ်ႈ .po ၾၢႆႇသေၸဵမ်းႁဵတ်း။",
        "mnw": "ပၠောပ် .po ဖိုင်သွက်စပြန်။",
        "ksw": "ဒီထံ .po လံာ်ဒ်သိးစမၤ။",
    },

    # ── Footer ──
    "footer.tagline": {
        "my": "Ubuntu ဘာသာပြန် ကိရိယာ v2.0 · Gemini AI စွမ်းအားဖြင့်",
        "en": "Ubuntu Localization Tool v2.0 · Powered by Gemini AI",
        "shn": "Ubuntu ပိၼ်ႇၽႃႇသႃႇ v2.0 · ႁႅင်း Gemini AI",
        "mnw": "Ubuntu ပြန်ဘာသာ v2.0 · နကဵု Gemini AI",
        "ksw": "Ubuntu တၢ်ကွဲးကျဲၤ v2.0 · ဒီး Gemini AI",
    },

    # ── Guide Page ──
    "guide.title": {
        "my": "📖 အသုံးပြုနည်း လမ်းညွှန်",
        "en": "📖 User Guide",
        "shn": "📖 သိုဝ်ႇၸႂ်ႉ",
        "mnw": "📖 လၚ်ညးသုင်",
        "ksw": "📖 တၢ်ဟဲၢ်လိၣ်",
    },
    # ── Guide Chapter Headings ──
    "guide.what_tool_does": {
        "my": "ဤကိရိယာက ဘာလုပ်ပေးနိုင်သလဲ",
        "en": "What This Tool Does",
        "shn": "ၶိူင်ႈၼႆႉ ႁဵတ်းသင်လႆႈ",
        "mnw": "ကရိယာဏံ ကၠောန်မာန်မု",
        "ksw": "ပှၤကွဲးကျဲၤအံၤ မၤတၢ်မနုၤလဲၣ်",
    },
    "guide.uploading_po": {
        "my": ".po ဖိုင်တစ်ခု တင်သွင်းခြင်း",
        "en": "Uploading a .po File",
        "shn": "လူတ်ႇၶိုၼ်ႈ ၾၢႆႇ .po",
        "mnw": "ပၠောပ်ဝှာင် .po",
        "ksw": "ဒီထံ .po လံာ်",
    },
    "guide.how_translation_works": {
        "my": "ဘာသာပြန်စနစ် အလုပ်လုပ်ပုံ",
        "en": "How Translation Works",
        "shn": "လွင်ႈပိၼ်ႇၽႃႇသႃႇ ႁဵတ်းသင်မၼ်း",
        "mnw": "ဗီုပြန်ဘာသာကၠောန်",
        "ksw": "တၢ်ကွဲးကျဲၤအံၤ မၤဝဲဒ်လဲၣ်",
    },
    "guide.editing_translations": {
        "my": "ဘာသာပြန်ချက်များကို ပြင်ဆင်တည်းဖြတ်ခြင်း",
        "en": "Editing Translations",
        "shn": "မႄးထတ်းၶေႃႈပိၼ်ႇ",
        "mnw": "ပလေဝ်လိက်ပြန်",
        "ksw": "သီထီၣ်လံာ်ကွဲးကျဲၤ",
    },
    "guide.exporting_work": {
        "my": "သင်၏ လုပ်ဆောင်ချက်များကို ထုတ်ယူခြင်း",
        "en": "Exporting Your Work",
        "shn": "ဢွၵ်ႇၾၢႆႇ",
        "mnw": "တိတ်ဝှာင်",
        "ksw": "ဟဲထလံာ်",
    },
    "guide.tips_best_results": {
        "my": "အကောင်းဆုံး ရလဒ်များရရှိရန် အကြံပြုချက်များ",
        "en": "Tips for Best Results",
        "shn": "ၶေႃႈၸီႉသင်ႇ တႃႇလႆႈၼမ်ႉၸႂ်ႉၶႅမ်ႉသုတ်း",
        "mnw": "ကသပ်ဂၞန် သွက်ကလိဂွံရလဒ်ခိုဟ်အိုတ်",
        "ksw": "တၢ်ကူစါဂ့ၤဂ့ၤ",
    },

    # ── Leaderboard ──
    "leaderboard.title": {
        "my": "🏆 အဆင့်သတ်မှတ်ချက်",
        "en": "🏆 Leaderboard",
        "shn": "🏆 သဵၼ်ႈၸၼ်ႉ",
        "mnw": "🏆 စရင်အဆင့်",
        "ksw": "🏆 တၢ်ပာ်ဖျၢၣ်",
    },

    # ── History ──
    "history.title": {
        "my": "📚 ထုတ်ယူမှု မှတ်တမ်း",
        "en": "📚 Export History",
        "shn": "📚 ပိုၼ်းဢွၵ်ႇ",
        "mnw": "📚 ဝင်တိတ်",
        "ksw": "📚 တၢ်ကတီၢ်ဟဲထ",
    },

    # ── Language Switcher ──
    "lang.switcher": {
        "my": "🌐 UI ဘာသာစကား",
        "en": "🌐 UI Language",
        "shn": "🌐 ၽႃႇသႃႇ UI",
        "mnw": "🌐 ဘာသာ UI",
        "ksw": "🌐 ကျိာ် UI",
    },
    "lang.my": {"my": "မြန်မာ", "en": "Myanmar", "shn": "မၢၼ်ႈ", "mnw": "မန်", "ksw": "မျန်"},
    "lang.en": {"my": "အင်္ဂလိပ်", "en": "English", "shn": "ဢင်းၵိတ်း", "mnw": "အၚ်လိက်", "ksw": "အံကလံ"},
    "lang.shn": {"my": "ရှမ်း", "en": "Shan", "shn": "တႆး", "mnw": "သေံ", "ksw": "ရှမ်း"},
    "lang.mnw": {"my": "မွန်", "en": "Mon", "shn": "မွၼ်း", "mnw": "မန်", "ksw": "မွန်"},
    "lang.ksw": {"my": "စကောကရင်", "en": "S'gaw Karen", "shn": "ယၢင်း", "mnw": "ကရေၚ်", "ksw": "ကညီ"},
}

# ── Default language ─────────────────────────────────────────────────────

DEFAULT_UI_LANG = "my"
UI_LANGS = ["my", "en", "shn", "mnw", "ksw"]


def get_ui_lang(request) -> str:
    """Get the UI language from cookie, defaulting to 'my' (Burmese)."""
    lang = request.cookies.get("ui_lang", DEFAULT_UI_LANG)
    if lang not in UI_LANGS:
        lang = DEFAULT_UI_LANG
    return lang


def t(key: str, lang: str = DEFAULT_UI_LANG, **kwargs) -> str:
    """Translate a UI key to the given language.

    Args:
        key: The translation key (e.g. 'sidebar.home')
        lang: Language code (my, en, shn, mnw, ksw)
        **kwargs: Format arguments (e.g. count=5)

    Returns:
        Translated string, or the key itself if not found.
    """
    entry = TRANSLATIONS.get(key)
    if not entry:
        return key
    text = entry.get(lang, entry.get("en", key))
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, ValueError):
            return text
    return text
