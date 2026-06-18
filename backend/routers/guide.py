"""Guide router — beginner-friendly user guide for the localization tool."""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from backend.services.ui_translations import get_ui_lang, t
from backend.templates_engine import templates

router = APIRouter(prefix="/guide", tags=["guide"])

# ── Chapter metadata per language ───────────────────────────────────────

GUIDE_META = {
    "my": {
        "guide_title": "အသုံးပြုသူ လမ်းညွှန်",
        "guide_quickref": "အမြန်ကိုးကားရန်",
        "chapters": [
            {"id": 1, "title": "What This Tool Does", "icon": "📖", "desc": "AI-powered .po ဘာသာပြန်ကိရိယာနှင့် ပံ့ပိုးထားသော ဘာသာစကားများ"},
            {"id": 2, "title": "Uploading a .po File", "icon": "📤", "desc": ".po ဖိုင်များ ရယူနည်းနှင့် တင်သွင်းနည်း"},
            {"id": 3, "title": "How Translation Works", "icon": "🤖", "desc": "Google Gemini AI၊ အုပ်စုလိုက်လုပ်ဆောင်ပုံနှင့် အရည်အသွေးစစ်ဆေးမှု"},
            {"id": 4, "title": "Editing Translations", "icon": "✏️", "desc": "ကိုယ်တိုင်တည်းဖြတ်ခြင်း၊ အလိုအလျောက်သိမ်းဆည်းခြင်းနှင့် AI အကြံပြုချက်များ ပြန်လည်သုံးသပ်ခြင်း"},
            {"id": 5, "title": "Exporting Your Work", "icon": "📦", "desc": "ဘာသာပြန်ထားသော .po ဖိုင်ကို ဒေါင်းလုဒ်လုပ်ပြီး ထုတ်ယူခြင်း"},
            {"id": 6, "title": "Tips for Best Results", "icon": "💡", "desc": "ဘာသာစကားအလိုက် အကြံပြုချက်များနှင့် အဖြစ်များသော အမှားများ"},
        ],
    },
    "en": {
        "guide_title": "User Guide",
        "guide_quickref": "Quick Reference",
        "chapters": [
            {"id": 1, "title": "What This Tool Does", "icon": "📖", "desc": "Overview of the AI-powered .po localization tool and supported languages"},
            {"id": 2, "title": "Uploading a .po File", "icon": "📤", "desc": "How to get and upload your translation files"},
            {"id": 3, "title": "How Translation Works", "icon": "🤖", "desc": "Google Gemini AI, batch processing, and quality checks"},
            {"id": 4, "title": "Editing Translations", "icon": "✏️", "desc": "Manual editing, auto-save, and reviewing AI suggestions"},
            {"id": 5, "title": "Exporting Your Work", "icon": "📦", "desc": "Download the translated .po file"},
            {"id": 6, "title": "Tips for Best Results", "icon": "💡", "desc": "Language-specific advice and common pitfalls to avoid"},
        ],
    },
    "shn": {
        "guide_title": "သိုဝ်ႇၸႂ်ႉတိုဝ်း",
        "guide_quickref": "ၶေႃႈၸီႉသင်ႇဝႆး",
        "chapters": [
            {"id": 1, "title": "What This Tool Does", "icon": "📖", "desc": "လွင်ႈၸွတ်ႇတူၺ်းၶိူင်ႈပိၼ်ႇၽႃႇသႃႇ .po AI"},
            {"id": 2, "title": "Uploading a .po File", "icon": "📤", "desc": "လၢႆးႁႃလႄႈလူတ်ႇၶိုၼ်ႈၾၢႆႇ .po"},
            {"id": 3, "title": "How Translation Works", "icon": "🤖", "desc": "Google Gemini AI၊ လွင်ႈပိၼ်ႇၸွမ်းၸုမ်း၊ လွင်ႈၸွတ်ႇၸၼ်ႉၸၢဝ်ႈ"},
            {"id": 4, "title": "Editing Translations", "icon": "✏️", "desc": "လွင်ႈမႄးထတ်းတူဝ်၊ သိမ်းႁင်းၶေႃ၊ တူၺ်းၶေႃႈၸီႉသင်ႇ AI"},
            {"id": 5, "title": "Exporting Your Work", "icon": "📦", "desc": "လူတ်ႇလူင်းၾၢႆႇ .po ဢၼ်ပိၼ်ႇယဝ်ႉ"},
            {"id": 6, "title": "Tips for Best Results", "icon": "💡", "desc": "ၶေႃႈၸီႉသင်ႇၸွမ်းၽႃႇသႃႇလႄႈ တူဝ်ယိူင်းဢၼ်ၸၢင်ႈပဵၼ်"},
        ],
    },
    "mnw": {
        "guide_title": "လၚ်ညးသုၚ်စောဲ",
        "guide_quickref": "အမြန်ကိုးကား",
        "chapters": [
            {"id": 1, "title": "What This Tool Does", "icon": "📖", "desc": "ဗီုပြၚ်ကရိယာပြန်ဘာသာ .po နကဵု AI ကဵုဘာသာမထံက်ပၚ"},
            {"id": 2, "title": "Uploading a .po File", "icon": "📤", "desc": "ဗီုဂွံဝှာင် .po ကဵုဗီုပၠောပ်"},
            {"id": 3, "title": "How Translation Works", "icon": "🤖", "desc": "Google Gemini AI၊ ဗီုကၠောန်နကဵုဂကောံ၊ စမ်ရံၚ် QA"},
            {"id": 4, "title": "Editing Translations", "icon": "✏️", "desc": "ပလေဝ်နကဵုတဲ၊ ဂိုၚ်အလဵုအလဵု၊ စမ်ရံၚ်ကသပ် AI"},
            {"id": 5, "title": "Exporting Your Work", "icon": "📦", "desc": "ဒေါင်လုဒ်ဝှာင် .po မပြန်တုဲ"},
            {"id": 6, "title": "Tips for Best Results", "icon": "💡", "desc": "ကသပ်ဂၞန်အတိုၚ်ဘာသာ ကဵုဗၠေတ်မပြာကတ်"},
        ],
    },
    "ksw": {
        "guide_title": "တၢ်ဟဲၢ်လိၣ်သူ",
        "guide_quickref": "တၢ်ကွဲးကျဲၤဂ့ၤ",
        "chapters": [
            {"id": 1, "title": "What This Tool Does", "icon": "📖", "desc": "တၢ်ကွၢ်လၢ်ၦဲၤပှၤကွဲးကျဲၤ .po AI ဒီးကျိာ်လၢမၤစၢၤ"},
            {"id": 2, "title": "Uploading a .po File", "icon": "📤", "desc": "ဒ်သိးကထံဃာ် ဒီးဒီထံ .po လံာ်"},
            {"id": 3, "title": "How Translation Works", "icon": "🤖", "desc": "Google Gemini AI၊ တၢ်ကွဲး ဒီး QA"},
            {"id": 4, "title": "Editing Translations", "icon": "✏️", "desc": "တၢ်သီထီၣ်၊ တၢ်သွဝဲ၊ ကွၢ်ကဒါ AI"},
            {"id": 5, "title": "Exporting Your Work", "icon": "📦", "desc": "ဒေါင်းလုဒ် .po လံာ်လၢအကဲးကျဲၤဝဲ"},
            {"id": 6, "title": "Tips for Best Results", "icon": "💡", "desc": "တၢ်ကူစါလၢကျိာ်အဂီၢ် ဒီးတၢ်ကမၢ"},
        ],
    },
}


@router.get("/", response_class=HTMLResponse)
async def guide_page(request: Request, chapter: int = 0):
    """Show the beginner-friendly user guide. chapter=0 shows all chapters."""

    ui_lang = get_ui_lang(request)
    meta = GUIDE_META.get(ui_lang, GUIDE_META["my"])

    # Build guide chapter headings from centralized translations
    heading_keys = [
        "guide.what_tool_does",
        "guide.uploading_po",
        "guide.how_translation_works",
        "guide.editing_translations",
        "guide.exporting_work",
        "guide.tips_best_results",
    ]
    short_names = [
        "what_tool_does",
        "uploading_po",
        "how_translation_works",
        "editing_translations",
        "exporting_work",
        "tips_best_results",
    ]
    guide_headings = {short: t(full, ui_lang) for short, full in zip(short_names, heading_keys)}

    return templates.TemplateResponse(
        request,
        "guide.html",
        {
            "guide_title": meta["guide_title"],
            "guide_quickref": meta["guide_quickref"],
            "chapters": meta["chapters"],
            "active_chapter": chapter,
            "guide_headings": guide_headings,
        },
    )


@router.get("/quickref", response_class=HTMLResponse)
async def quick_reference(request: Request):
    """Show the quick reference card."""
    return templates.TemplateResponse(request, "quickref.html")
