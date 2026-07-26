---
marp: true
paginate: true
transition: fade
theme: uncover
---

<!-- slide 1 -->
# ခေါင်းစဉ် (Title Slide)

## Ubuntu Localization Project
### Ubuntu ဗမာဘာသာပြန် စီမံကိန်း

- Ubuntu Open-Source Operating System ကို မြန်မာဘာသာသို့ ပြန်ဆိုခြင်း
- ပြင်ဆင်သူ: Ubuntu Myanmar Localization Team

![width:800](ubuntu-localization-banner.png)

---

<!-- slide 2 -->
# စီမံကိန်း၏ ရည်ရွယ်ချက် (Objectives)

## ဘာကြောင့် Ubuntu ကို ဗမာဘာသာပြန်ဆိုရသလဲ?

- နည်းပညာကို မြန်မာဘာသာဖြင့် လွယ်ကူစွာ အသုံးပြုနိုင်စေရန်
- Open-Source အသိုင်းအဝိုင်းတွင် မြန်မာစာ ပါဝင်မှုကို မြှင့်တင်ရန်
- နည်းပညာ ဝေါဟာရများကို စနစ်တကျ သတ်မှတ်အသုံးပြုနိုင်ရန်

![width:700](purpose-infographic.png)

---

<!-- slide 3 -->
# Launchpad Platform မိတ်ဆက်

## Ubuntu Launchpad အသုံးပြုခြင်း

- Canonical ၏ Launchpad platform မှတစ်ဆင့် ဘာသာပြန်ခြင်း
- Web browser မှတစ်ဆင့် လွယ်ကူစွာ ပါဝင်နိုင်မှု
- System strings, Desktop apps နှင့် Core utilities များ ပြန်ဆိုနိုင်ခြင်း

![width:700](launchpad-overview-demo.mp4)

---

<!-- slide 4 -->
# ဘာသာပြန် လုပ်ငန်းစဉ် (Translation Workflow)

## အဓိက အဆင့် ၄ ဆင့်

1. **Account ဖန်တီးခြင်း** — Launchpad အကောင့်ပြုလုပ်ခြင်း
2. **String ရွေးချယ်ခြင်း** — ပြန်ဆိုလိုသော App သို့မဟုတ် Module ရွေးချယ်ခြင်း
3. **Suggestion ပေးခြင်း** — ဘာသာပြန်ဆိုချက် စာသားများ ထည့်သွင်းခြင်း
4. **Review & Approve** — Reviewer များမှ စစ်ဆေးအတည်ပြုခြင်း

![width:700](workflow-diagram.png)

---

<!-- slide 5 -->
# နည်းပညာ ဝေါဟာရ စည်းမျဉ်းများ (Glossary & Rules)

## Standard Technical Terms

- မူရင်း အဓိပ္ပာယ် မပျောက်ပျက်စေရန် ဂရုပြုခြင်း
- လွယ်ကူရှင်းလင်းသော မြန်မာစကားလုံးများ အသုံးပြုခြင်း
- သတ်ပုံနှင့် ဝါကျဖွဲ့ထုံး ညီညွတ်မှု ရှိစေခြင်း (Consistency)

![width:700](glossary-table-sample.png)

---

<!-- slide 6 -->
# PO Files နှင့် Local Translation Tools

## Offline translation အသုံးပြုခြင်း

- `.po` / `.pot` file များကို Download ရယူ၍ ပြန်ဆိုခြင်း
- Poedit / Virtaal စသည့် Offline tools များ အသုံးပြုနိုင်မှု
- Git Repository သို့ပြန်လည် Commit/Push ပြုလုပ်ခြင်း

![width:700](poedit-usage-tutorial.mp4)

---

<!-- slide 7 -->
# စနစ်တကျ စမ်းသပ်ခြင်း (Testing & Verification)

## Local Machine တွင် စမ်းသပ်နည်း

- `.mo` (Binary Message Catalog) သို့ Compile လုပ်ခြင်း
- System / App တွင် Local environment အဖြစ် run ၍ စစ်ဆေးခြင်း
- Layout မပျက်စီးမှုနှင့် Font Rendering မှန်ကန်မှုကို စစ်ဆေးခြင်း

![width:700](testing-screenshot.png)

---

<!-- slide 8 -->
# အဓိက ပြန်ဆိုလျက်ရှိသော Modules များ

## Desktop & Core Components

- **System Settings & GNOME Control Center**
- **Core Utilities**: Systemd, Tracker-miners, Ubuntu-Pro
- **Applications**: Rhythmbox, Vino, PulseAudio စသည်တို့

![width:700](ubuntu-desktop-burmese.png)

---

<!-- slide 9 -->
# အသိုင်းအဝိုင်းနှင့် ပူးပေါင်းဆောင်ရွက်ခြင်း (Community)

## ပူးပေါင်းဆောင်ရွက်နိုင်မည့် နည်းလမ်းများ

- Translation Team တွင် ပါဝင်ကူညီခြင်း
- အမှားအယွင်းများ (Bugs / Typos) သတင်းပို့ခြင်း
- New Contributors များကို ကူညီလမ်းညွှန်ပေးခြင်း

![width:700](community-discussion-clip.mp4)

---

<!-- slide 10 -->
# နိဂုံးနှင့် ဖိတ်ခေါ်ချက် (Conclusion & Call to Action)

## အတူတကွ ပါဝင်ကြပါစို့

Ubuntu ကို မြန်မာစကားပြော ပြည်သူများအတွက် ပိုမိုနီးစပ်စေရန်

- **Website**: [https://ubuntu-localization.vercel.app/](https://ubuntu-localization.vercel.app/)
- **Launchpad Project**: Ubuntu Burmese Translators Team
