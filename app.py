import os, polib, pandas as pd, streamlit as st
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime  # ဒေါင်းလုဒ်ဖိုင်နာမည်အတွက် လိုအပ်သည်

# --- Load Environment ---
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

st.set_page_config(
    page_title="Ubuntu Localization Tool",
    page_icon="🐧",
    layout="wide"
)

# --- Professional UI Styling ---
st.markdown("""
    <style>
    .stTextArea textarea { font-size: 14px !important; border-radius: 10px !important; border: 1px solid #30363d !important; }
    .stButton button { border-radius: 12px !important; font-weight: bold !important; height: 3em; }
    .header-text { font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .ubuntu-orange { color: #E95420; font-weight: bold; }
    </style>
""", unsafe_allow_html=True)

# --- AI Initialization ---
@st.cache_resource
def get_ai_model():
    if not API_KEY:
        return None
    try:
        genai.configure(api_key=API_KEY)
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        return 'models/gemini-1.5-flash' if 'models/gemini-1.5-flash' in models else models[0]
    except:
        return None

MODEL_ID = get_ai_model()

import json

def translate_engine(texts, target_lang):
    if not MODEL_ID: return []
    try:
        model = genai.GenerativeModel(MODEL_ID)
        
        # JSON format နဲ့ ပြန်ပေးဖို့ Prompt ကို ပြင်ပါ
        prompt = f"""
        Task: Professional Software Localization for Ubuntu Linux OS.
        Target Language: {target_lang}
        
        Return the translations in a JSON array of strings. 
        The array MUST have exactly {len(texts)} elements.
        
        Rules:
        - If a line has a command (e.g. 'set-port - '), ONLY translate the description after '-'.
        - Keep placeholders like %s, %d.
        
        Input Strings:
        {json.dumps(texts)}
        """
        
        response = model.generate_content(prompt)
        
        if response and response.text:
            # Markdown တွေကို ဖယ်ပြီး JSON parsing လုပ်ပါ
            json_str = response.text.replace('```json', '').replace('```', '').strip()
            translated_list = json.loads(json_str)
            
            # အရေအတွက် ကိုက်၊ မကိုက် စစ်ဆေးပါ
            if len(translated_list) == len(texts):
                return translated_list
            else:
                # မကိုက်ရင် error မတက်အောင် မူရင်းစာသားတွေပဲ ပြန်ထည့်ပေးထားမယ်
                return [translated_list[i] if i < len(translated_list) else texts[i] for i in range(len(texts))]
                
    except Exception as e:
        st.error(f"Error: {e}")
        return []

# --- Session Management ---
if "df" not in st.session_state: st.session_state.df = None
if "po" not in st.session_state: st.session_state.po = None
if "page" not in st.session_state: st.session_state.page = 0
if "filename" not in st.session_state: st.session_state.filename = ""

# --- Sidebar ---
with st.sidebar:
    st.title("Settings")
    target_lang = st.selectbox("Target Language", ["Burmese", "Shan", "Mon", "S'gaw Karen"])
    st.divider()
    
    if st.session_state.df is not None:
        total = len(st.session_state.df)
        translated = st.session_state.df["Translation"].str.strip().ne("").sum()
        st.write(f"Progress: {translated} / {total}")
        st.progress(translated/total if total > 0 else 0)
        
        st.divider()
        if st.button("Apply & Export", use_container_width=True, type="primary"):
            # Update PO object
            for _, row in st.session_state.df.iterrows():
                st.session_state.po[row["ID"]].msgstr = row["Translation"]
            
            # ဖိုင်နာမည်ကို မူရင်းနာမည် + ဘာသာစကား + အချိန် တွဲပေးခြင်း
            current_time = datetime.now().strftime("%Y%m%d_%H%M")
            # Extension ဖယ်ထုတ်ရန် (ဥပမာ messages.po မှ messages ကိုယူရန်)
            base_name = os.path.splitext(st.session_state.filename)[0] if st.session_state.filename else "file"
            final_filename = f"translated_{target_lang.lower()}_{base_name}_{current_time}.po"
            
            st.download_button(
                label="Download .po", 
                data=st.session_state.po.__str__(), 
                file_name=final_filename, 
                use_container_width=True
            )

# --- Main UI ---
st.title("Ubuntu OS Localization Tool")
st.write(f"Translating for Ubuntu Linux using <span class='ubuntu-orange'>{target_lang}</span> context.", unsafe_allow_html=True)

file = st.file_uploader("Upload .po source file", type=["po"], label_visibility="collapsed")

if file:
    # ဖိုင်အသစ်တင်တိုင်း session update လုပ်ရန်
    if st.session_state.po is None or file.name != st.session_state.filename:
        po_data = polib.pofile(file.getvalue().decode("utf-8"))
        st.session_state.po = po_data
        st.session_state.filename = file.name
        entries = [{"ID": i, "Original": e.msgid, "Translation": e.msgstr} 
                   for i, e in enumerate(po_data) if not e.msgstr.strip()]
        st.session_state.df = pd.DataFrame(entries)
        st.session_state.page = 0

if st.session_state.df is not None:
    df = st.session_state.df
    if df.empty:
        st.success("Everything is translated!")
    else:
        items_per_page = 10
        total_items = len(df)
        start_idx = st.session_state.page * items_per_page
        end_idx = min(start_idx + items_per_page, total_items)
        
        st.markdown(f"""
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div class="header-text" style="width: 48%;">UBUNTU SOURCE (EN)</div>
                <div class="header-text" style="width: 48%;">TARGET ({target_lang.upper()})</div>
            </div>
        """, unsafe_allow_html=True)

        for i in range(start_idx, end_idx):
            c1, c2 = st.columns(2)
            c1.text_area(f"O_{i}", df.at[i, "Original"], height=90, disabled=True, label_visibility="collapsed")
            res = c2.text_area(f"T_{i}", value=df.at[i, "Translation"], height=90, label_visibility="collapsed")
            st.session_state.df.at[i, "Translation"] = res

        st.divider()
        ac1, ac2, ac3 = st.columns([2, 1, 1])
        with ac1:
            if st.button(f"Translate to {target_lang}", use_container_width=True, type="primary"):
                # ၁။ targets ကို အရင် သတ်မှတ်ပေးရပါမယ်
                batch = df.iloc[start_idx:end_idx]
                targets = batch[batch["Translation"].str.strip() == ""]
                
                # ၂။ အကယ်၍ ဘာသာပြန်ရန် ကျန်နေသေးလျှင်
                if not targets.empty:
                    with st.spinner(f"Gemini is translating for Ubuntu ({target_lang})..."):
                        original_texts = targets["Original"].tolist()
                        results = translate_engine(original_texts, target_lang)
                        
                        # ၃။ ရလာတဲ့ result တွေကို စစ်ဆေးပြီး DataFrame ထဲ ထည့်မယ်
                        if results and len(results) == len(original_texts):
                            for idx, val in zip(targets.index, results):
                                st.session_state.df.at[idx, "Translation"] = val
                            st.success(f"Successfully translated {len(results)} lines!")
                        elif results:
                            st.warning(f"Translation mismatch: Expected {len(original_texts)} but got {len(results)}.")
                            for i, idx in enumerate(targets.index):
                                if i < len(results):
                                    st.session_state.df.at[idx, "Translation"] = results[i]
                        else:
                            st.error("AI returned no results.")
                        
                        # UI ကို Refresh လုပ်မယ်
                        st.rerun()
                else:
                    st.info("No untranslated strings on this page.")
        
        with ac2:
            if st.button("Previous", disabled=(st.session_state.page == 0), use_container_width=True):
                st.session_state.page -= 1
                st.rerun()
        with ac3:
            if st.button("Next", disabled=(end_idx >= total_items), use_container_width=True):
                st.session_state.page += 1
                st.rerun()