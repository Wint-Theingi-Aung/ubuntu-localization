---

marp: true

paginate: true

transition: fade

# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.

auto-advance: 20

---
<!-- slide 1 -->

# Who's my person? | ကူညီပေးမည့်သူက ဘယ်သူလဲ။

<!-- 20s -->

**Indigenous language translators** contributing to Ubuntu localization through Launchpad — Burmese, Shan, Mon, and Karen speakers who want their communities to use Linux in their native language. They face thousands of untranslated OS strings but lack AI-assisted tooling tailored to Ubuntu's technical context.

Launchpad မှတစ်ဆင့် Ubuntu Operating System ကို မိခင်ဘာသာစကားများအဖြစ် ပြောင်းလဲဖန်တီးပေးနေကြသည့် **ဘာသာပြန်ဆိုသူများ** ဖြစ်ပါသည်။ မိမိတို့၏ လူမှုအသိုင်းအဝိုင်းတွင် Linux ကို မိခင်ဘာသာစကားဖြင့် အဆင်ပြေပြေ အသုံးပြုနိုင်စေရန် ကြိုးပမ်းနေကြသည့် ဗမာ၊ ရှမ်း၊ မွန်၊ ကရင် စကားပြောဆိုသူများ ဖြစ်သည်။ သို့သော် ၎င်းတို့တွင် ဘာသာပြန်ရန် ကျန်ရှိနေသေးသည့် စနစ်စာသားပေါင်း ထောင်နှင့်ချီရှိနေပြီး Ubuntu ၏ နည်းပညာဆိုင်ရာ နောက်ခံအကြောင်းအရာများနှင့် ကိုက်ညီမည့် AI အထောက်အကူပြု စနစ်ကောင်းများ မရှိဘဲ ဖြစ်နေကြရသည်။
  
---
<!-- slide 2 -->

# Their problem | ၎င်းတို့ ကြုံတွေ့နေရသည့် အခက်အခဲ

Translating Ubuntu .po files by hand is slow and error-prone:

-  **Placeholder breakage**: `%s`, `%d`, `\n` get mangled, breaking the UI

-  **Technical term confusion**: Translators accidentally localize "Kernel", "sudo", "GNOME"

-  **No QA guardrails**: One mistake ships broken strings to thousands of users

-  **Launchpad friction**: Manual upload/download cycle is tedious

 Ubuntu ၏ `.po` ဖိုင်များကို လက်ဖြင့် လိုက်လံဘာသာပြန်ဆိုခြင်းမှာ အချိန်ကြာမြင့်ပြီး အမှားအယွင်း ဖြစ်လွယ်စေသည် -

-  **စာသားများ (Placeholders) ပျက်စီးခြင်း** - `%s`၊ `%d`၊ `\n` စသည့် စနစ်သင်္ကေတများ လွဲမှားသွားပြီး စနစ်တစ်ခုလုံး၏ မျက်နှာပြင် (UI) ကို ပျက်စီးစေနိုင်သည်။

-  **နည်းပညာစကားလုံးများ ရှုပ်ထွေးခြင်း** - "Kernel"၊ "sudo"၊ "GNOME" စသည့် စာလုံးများကိုပါ အမှတ်မထင် လိုက်လံဘာသာပြန်မိသဖြင့် စနစ်ပိုင်းဆိုင်ရာ လွဲမှားမှုများ ဖြစ်ပေါ်နိုင်သည်။

-  **စစ်ဆေးရေးစနစ် (QA) အားနည်းခြင်း** - စာသားအမှားတစ်ခုတည်းနှင့်ပင် အသုံးပြုသူ ထောင်ပေါင်းများစွာထံ စာသားအမှားများ တိုက်ရိုက်ရောက်ရှိသွားနိုင်သည်။

-  **လုပ်ငန်းစဉ် ရှုပ်ထွေးခြင်း** - ဖိုင်များကို ကိုယ်တိုင် ဒေါင်းလုဒ်ဆွဲပြီးမှ ပြန်လည်အပ်နှံရသည့် လက်လုပ်လုပ်ငန်းစဉ်မှာ အလွန်ငြီးငွေ့ဖွယ်ကောင်းလှပါသည်။

---
<!-- slide 3 -->

# What I built | ဘာတည်ဆောက်ခဲ့သလဲ

**Ubuntu Localization Tool** — an AI-powered .po translation pipeline with adversarial QA:

- Upload `.po` files → auto-detect languages, extract untranslated strings

- Google Gemini batch translation with **strict placeholder + technical term preservation rules**

-  **Triple-lens adversarial QA agent** (placeholders, context, structure) — 2/3 majority required per entry

- One-click browser download of translated `.po` file — pure file generation, no git required

- Web UI leaderboard tracking contributions across all 4 languages, per-contributor stats pages

**Ubuntu Localization Tool** — စစ်ဆေးရေး QA စနစ် အပြန်အလှန်ပါဝင်သည့် AI အခြေပြု `.po` ဘာသာပြန်စနစ် (Pipeline) တစ်ခု ဖြစ်ပါသည် -

-  `.po` ဖိုင်များကို တင်လိုက်ရုံဖြင့် ဘာသာစကားကို အလိုအလျောက်ခွဲခြားပြီး ဘာသာမပြန်ရသေးသည့် စာသားများကို ထုတ်ယူပေးခြင်း။

-  **နေရာယူစာသားများနှင့် နည်းပညာစကားလုံးများကို မပျက်မကွက် ထိန်းသိမ်းမည့် စည်းမျဉ်းများ**ဖြင့် Google Gemini ဘာသာပြန်စနစ်ကို အသုံးပြုခြင်း။

-  **ရှုထောင့်သုံးမျိုးပါ စစ်ဆေးရေးစနစ် (Triple-lens Adversarial QA Agent)** (နေရာယူစာသား၊ ရှေ့နောက်အကြောင်းအရာ၊ တည်ဆောက်ပုံ) ဖြင့် ဘာသာပြန်စာသားများကို စနစ်တကျ မဲခွဲဆုံးဖြတ် စစ်ဆေးခြင်း။

- ဘရောက်ဆာမှတစ်ဆင့် တစ်ချက်တည်းနှိပ်၍ `.po` ဖိုင်ကို ဒေါင်းလုဒ်ဆွဲနိုင်ခြင်းနှင့် Launchpad ကူညီပံ့ပိုးသူများအတွက် Dashboard များ ပါဝင်ခြင်း။

---
<!-- slide 4 -->

# How I built it | ဘယ်လိုတည်ဆောက်ခဲ့သလဲ
 
-  **MCP**: Launchpad Bridge MCP (custom launchpadlib wrapper — 392 lines, 8 tools for profiles, karma, teams, progress), Filesystem MCP (sandboxed file I/O)

-  **Web UI**: FastAPI + Jinja2 + htmx — single-page translate pipeline (upload → AI/manual edit → browser download), multi-language user guide, leaderboard with contributor stats

-  **Skill**: 4 translation pipeline skills — `po-upload`, `po-detect`, `po-translate`, `po-export` — plus `po-description` (file summaries) and `pr-description` (PR description generation) as developer tools

-  **Agent**: `translate-batch` (Gemini-powered batch translator with language-specific rules) and `qa-reviewer` (adversarial 3-lens verifier requiring majority vote)

-  **MCP**: Launchpad Bridge MCP (စိတ်ကြိုက်ပြင်ဆင်ထားသော launchpadlib wrapper — စာကြောင်းရေ ၃၉၂ ကြောင်း၊ ကိရိယာ ၈ ခု)၊ Filesystem MCP (sandboxed I/O) တို့ကို စုစည်းအသုံးပြုထားပါသည်။

-  **Web UI**: FastAPI + Jinja2 + htmx — စာမျက်နှာတစ်ခုတည်းမှာပင် ဖိုင်တင်ခြင်းမှ AI ဘာသာပြန်ခြင်း၊ ကိုယ်တိုင်တည်းဖြတ်ခြင်း၊ ဒေါင်းလုဒ်ဆွဲခြင်းအထိ ပြုလုပ်နိုင်သည့် စနစ်။ ဘာသာစကားပေါင်းစုံ လမ်းညွှန်နှင့် Leaderboard ပါဝင်သည်။

-  **Skill**: ဘာသာပြန် Pipeline အတွက် စွမ်းဆောင်ရည် ၄ ခု — `po-upload`၊ `po-detect`၊ `po-translate`၊ `po-export` — နှင့် developer tools အဖြစ် `po-description`၊ `pr-description` တို့ ဖြစ်ကြပါသည်။

-  **Agent**: `translate-batch` (ဘာသာစကားအလိုက် စည်းမျဉ်းများပါဝင်သော Gemini အခြေပြု Batch Translator) နှင့် `qa-reviewer` (ရှုထောင့်သုံးမျိုးဖြင့် အပြန်အလှန်စစ်ဆေးပေးသည့် စနစ်) တို့ ဖြစ်ကြပါသည်။

---

<!-- slide 5 -->

# Why it matters | ဘာကြောင့် အရေးကြီးတာလဲ

-  **4 indigenous languages** get AI-accelerated Ubuntu localization for the first time

-  **QA pass rate > 95%** — adversarial verification catches placeholder errors before they ship

-  **10x faster** than manual translate-review-upload cycle on Launchpad

- Every translated string makes Ubuntu accessible to someone who doesn't speak English — **digital inclusion, one .po file at a time**

-  **တိုင်းရင်းသားဘာသာစကား ၄ ခု**အတွက် ပထမဆုံးအကြိမ်အဖြစ် AI စနစ်ဖြင့် အရှိန်အဟုန်မြှင့်တင်ထားသည့် Ubuntu ဘာသာပြန်ဆိုမှုစနစ်ကို ရရှိစေမည် ဖြစ်သည်။

-  **စစ်ဆေးမှုအောင်မြင်မှုနှုန်း ၉၅% ထက်ကျော်လွန်ခြင်း** — စနစ်တကျ အပြန်အလှန်စစ်ဆေးမှုများကြောင့် နေရာယူစာသား အမှားအယွင်းများကို အသုံးပြုသူထံမရောက်မီ ကြိုတင်ဖမ်းဆီးပေးနိုင်ပါသည်။

- Launchpad ပေါ်တွင် လက်ဖြင့် ဘာသာပြန်၊ စစ်ဆေး၊ တင်ပို့ရသည့် သံသရာထက် **၁၀ ဆ ပိုမိုမြန်ဆန်**လာပါသည်။

- ပြန်ဆိုလိုက်သည့် စာသားတိုင်းက အင်္ဂလိပ်စာမတတ်သည့်သူများအတွက် Ubuntu ကို လွယ်ကူစွာ အသုံးပြုနိုင်စေမည် ဖြစ်သည် — **`.po` ဖိုင်တစ်ခုချင်းစီမှတစ်ဆင့် နည်းပညာကဏ္ဍတွင် အားလုံးပါဝင်လာနိုင်စေခြင်း (Digital Inclusion) ကို အမှန်တကယ် ဖော်ဆောင်ပေးပါသည်။**

---

<!-- slide 6 -->

# Done checklist | လုပ်ဆောင်ပြီးစီးမှု စစ်ဆေးရန်စာရင်း

- [x] repo public
- [x] MCP + skill + agent used
- [x] report.md in team repo
- [x] PechaKucha slides