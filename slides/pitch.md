---
marp: true
paginate: true
transition: fade

# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.

auto-advance: 20
---

<!-- slide 1 -->

# Who's my person?

**Indigenous language translators** contributing to Ubuntu localization through Launchpad — Burmese, Shan, Mon, and Karen speakers who want their communities to use Linux in their native language. They face thousands of untranslated OS strings but lack AI-assisted tooling tailored to Ubuntu's technical context.

Launchpad မှတစ်ဆင့် Ubuntu OS ကို မိခင်ဘာသာစကားများအဖြစ် ပြောင်းလဲဖန်တီးပေးနေကြသည့် **ဘာသာပြန်ဆိုသူများ** — ဗမာ၊ ရှမ်း၊ မွန်၊ ကရင် စကားပြောဆိုသူများ ဖြစ်သည်။ ဘာသာပြန်ရန် ကျန်ရှိနေသေးသည့် စနစ်စာသားပေါင်း ထောင်နှင့်ချီရှိနေပြီး Ubuntu ၏ နည်းပညာဆိုင်ရာ နောက်ခံအကြောင်းအရာများနှင့် ကိုက်ညီမည့် AI အထောက်အကူပြု ကိရိယာများ မရှိဘဲ ဖြစ်နေကြရသည်။

---

<!-- slide 2 -->

# Their problem

Translating Ubuntu `.po` files by hand is slow and error-prone:

- **Placeholder breakage**: `%s`, `%d`, `\n` get mangled, breaking the UI
- **Technical term confusion**: Translators accidentally localize "Kernel", "sudo", "GNOME"
- **No QA guardrails**: One mistake ships broken strings to thousands of users
- **Launchpad friction**: Manual upload/download cycle is tedious

Ubuntu ၏ `.po` ဖိုင်များကို လက်ဖြင့် ဘာသာပြန်ဆိုခြင်းမှာ အချိန်ကြာမြင့်ပြီး အမှားအယွင်း ဖြစ်လွယ်စေသည် —

- **စာသားများ (Placeholders) ပျက်စီးခြင်း** — `%s`, `%d`, `\n` စသည့် စနစ်သင်္ကေတများ လွဲမှားသွားပြီး UI ကို ပျက်စီးစေနိုင်သည်
- **နည်းပညာစကားလုံးများ ရှုပ်ထွေးခြင်း** — "Kernel", "sudo", "GNOME" စသည့် စာလုံးများကိုပါ လိုက်လံဘာသာပြန်မိသဖြင့် စနစ်ပိုင်းဆိုင်ရာ လွဲမှားမှုများ ဖြစ်ပေါ်နိုင်သည်
- **QA စနစ် အားနည်းခြင်း** — စာသားအမှားတစ်ခုတည်းဖြင့် အသုံးပြုသူ ထောင်ပေါင်းများစွာထံ မှားယွင်းသော စာသားများ ရောက်ရှိသွားနိုင်သည်
- **လုပ်ငန်းစဉ် ရှုပ်ထွေးခြင်း** — ဖိုင်များကို ကိုယ်တိုင်ဒေါင်းလုဒ်ဆွဲပြီး ပြန်လည်အပ်နှံရသည့် လက်လုပ်လုပ်ငန်းစဉ်မှာ အလွန်ငြီးငွေ့ဖွယ်ကောင်းသည်

---

<!-- slide 3 -->

# What I built

**Ubuntu Localization Tool** — an AI-powered `.po` translation pipeline with adversarial QA:

- Upload `.po` files → auto-detect languages, extract untranslated strings
- Google Gemini batch translation with **strict placeholder + technical term preservation rules**
- **Triple-lens adversarial QA agent** (placeholders, context, structure) — 2/3 majority required per entry
- One-click browser download of translated `.po` file — pure file generation, no git required
- Web UI leaderboard tracking contributions across all 4 languages, per-contributor stats pages

**Ubuntu Localization Tool** — AI စနစ်ဖြင့် စစ်ဆေးအတည်ပြုသည့် `.po` ဘာသာပြန်စနစ် —

- `.po` ဖိုင်များကို တင်လိုက်ရုံဖြင့် ဘာသာစကားကို အလိုအလျောက်ခွဲခြားပြီး ဘာသာမပြန်ရသေးသည့် စာသားများကို ထုတ်ယူပေးခြင်း
- **နေရာယူစာသားများနှင့် နည်းပညာစကားလုံးများကို မပျက်မကွက် ထိန်းသိမ်းမည့် စည်းမျဉ်းများ**ဖြင့် Google Gemini ဘာသာပြန်စနစ်ကို အသုံးပြုခြင်း
- **ရှုထောင့်သုံးမျိုးပါ စစ်ဆေးရေးစနစ် (Triple-lens Adversarial QA Agent)** — နေရာယူစာသား၊ ရှေ့နောက်အကြောင်းအရာ၊ တည်ဆောက်ပုံ — ၃ မဲလျှင် ၂ မဲဖြင့် အတည်ပြုခြင်း
- ဘရောက်ဆာမှ တစ်ချက်တည်းနှိပ်၍ `.po` ဖိုင်ကို ဒေါင်းလုဒ်ဆွဲနိုင်ခြင်း
- ဘာသာစကား ၄ မျိုးလုံးအတွက် ပံ့ပိုးကူညီမှုများကို ခြေရာခံနိုင်သော Leaderboard နှင့် တစ်ဦးချင်းစာရင်းဇယား စာမျက်နှာများ

---

<!-- slide 4 -->

# How I built it

**MCP**: Launchpad Bridge MCP — custom `launchpadlib` wrapper (392 lines, 8 tools: profiles, karma, teams, translation groups, top contributors, progress, search, auth check) + Filesystem MCP (sandboxed file I/O)

**Skill**: 6 Claude Code slash commands — `po-upload`, `po-detect`, `po-translate`, `po-export` (translation pipeline) + `po-description` (file summaries), `pr-description` (PR generation)

**Agent**: `translate-batch` (Gemini-powered batch translator with language-specific script rules) + `qa-reviewer` (adversarial 3-lens verifier: placeholders → context → structure, majority vote required)

**Web UI**: FastAPI + Jinja2 + htmx — single-page translate pipeline (upload → AI/manual edit → browser download), multi-language user guide, leaderboard with per-contributor stats

**MCP**: Launchpad Bridge MCP — စိတ်ကြိုက်ပြင်ဆင်ထားသော `launchpadlib` wrapper (စာကြောင်းရေ ၃၉၂၊ ကိရိယာ ၈ ခု) + Filesystem MCP (sandboxed I/O)

**Skill**: Claude Code slash command ၆ ခု — `po-upload`, `po-detect`, `po-translate`, `po-export` (ဘာသာပြန် pipeline) + `po-description` (ဖိုင်အကျဉ်းချုပ်), `pr-description` (PR ဖော်ပြချက်)

**Agent**: `translate-batch` (ဘာသာစကားအလိုက် စည်းမျဉ်းများပါဝင်သော Gemini အခြေပြု Batch Translator) + `qa-reviewer` (ရှုထောင့်သုံးမျိုးဖြင့် အပြန်အလှန်စစ်ဆေးပေးသည့် စနစ် — နေရာယူစာသား → ရှေ့နောက်အကြောင်းအရာ → တည်ဆောက်ပုံ)

**Web UI**: FastAPI + Jinja2 + htmx — စာမျက်နှာတစ်ခုတည်းမှာပင် ဖိုင်တင်ခြင်းမှ AI ဘာသာပြန်ခြင်း၊ ကိုယ်တိုင်တည်းဖြတ်ခြင်း၊ ဒေါင်းလုဒ်ဆွဲခြင်းအထိ ပြုလုပ်နိုင်သည့် စနစ်

---

<!-- slide 5 -->

# Why it matters

- **4 indigenous languages** get AI-accelerated Ubuntu localization for the first time
- **QA pass rate > 95%** — adversarial verification catches placeholder errors before they ship
- **10× faster** than manual translate-review-upload cycle on Launchpad
- Every translated string makes Ubuntu accessible to someone who doesn't speak English — **digital inclusion, one .po file at a time**

- **တိုင်းရင်းသားဘာသာစကား ၄ ခု**အတွက် ပထမဆုံးအကြိမ်အဖြစ် AI စနစ်ဖြင့် Ubuntu ဘာသာပြန်ဆိုမှုကို ရရှိစေမည်
- **QA အောင်မြင်မှုနှုန်း ၉၅% ကျော်** — နေရာယူစာသား အမှားအယွင်းများကို အသုံးပြုသူထံမရောက်မီ ကြိုတင်ဖမ်းဆီးပေးနိုင်
- Launchpad ပေါ်တွင် လက်ဖြင့် ဘာသာပြန်-စစ်ဆေး-တင်ပို့ရသည့် သံသရာထက် **၁၀ ဆ ပိုမိုမြန်ဆန်**
- ပြန်ဆိုလိုက်သည့် စာသားတိုင်းက အင်္ဂလိပ်စာမတတ်သူများအတွက် Ubuntu ကို လွယ်ကူစွာ အသုံးပြုနိုင်စေမည် — **`.po` ဖိုင်တစ်ခုချင်းစီမှတစ်ဆင့် နည်းပညာကဏ္ဍတွင် အားလုံးပါဝင်လာနိုင်စေခြင်း (Digital Inclusion)**

---

<!-- slide 6 -->

# Done checklist

- [x] Repo public — https://github.com/Wint-Theingi-Aung/ubuntu-localization
- [x] MCP used — Launchpad Bridge MCP (8 tools) + Filesystem MCP
- [x] Skill used — 6 Claude Code slash commands (po-upload, po-detect, po-translate, po-export, po-description, pr-description)
- [x] Agent used — translate-batch (Gemini batch translator) + qa-reviewer (3-lens adversarial QA)
- [x] report.md in team repo
- [x] 6 PechaKucha slides (auto-advance 20s)
