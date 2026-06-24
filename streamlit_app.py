import os
import json
import polib
import pandas as pd
import streamlit as st
from datetime import datetime
from dotenv import load_dotenv

from google import genai
from google.genai import types

# --- Load Environment ---
load_dotenv()

st.set_page_config(
    page_title="Ubuntu Localization Tool",
    page_icon="🐧",
    layout="wide"
)

# --- UI Styling ---
st.markdown("""
    <style>
    .stTextArea textarea {
        font-size: 14px !important;
        border-radius: 10px !important;
    }
    .stButton button {
        border-radius: 12px !important;
        font-weight: bold !important;
        height: 3em;
    }
    .ubuntu-orange {
        color: #E95420;
        font-weight: bold;
    }
    .header-text {
        font-size: 12px;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    </style>
""", unsafe_allow_html=True)


# --- AI CLIENT ---
@st.cache_resource
def get_ai_client():
    try:
        return genai.Client()
    except Exception as e:
        st.sidebar.error(f"AI Client Init Failed: {e}")
        return None


ai_client = get_ai_client()


# --- TRANSLATION ENGINE ---
def translate_engine(texts, target_lang):
    if not ai_client:
        st.error("Missing GOOGLE_API_KEY or AI client not initialized")
        return []

    try:
        prompt = f"""
You are a professional Ubuntu Linux localization engine.

Target Language: {target_lang}

Rules:
- Keep placeholders like %s, %d, {{0}} unchanged
- Only translate natural language
- Maintain OS/software context
- Return ONLY JSON array of strings

Input:
{json.dumps(texts, ensure_ascii=False)}
"""

        response = ai_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(type=types.Type.STRING),
                ),
                temperature=0.2,
            ),
        )

        # --- SAFE PARSE ---
        try:
            result = json.loads(response.text)
        except:
            st.error("Failed to parse AI response JSON")
            return []

        if not isinstance(result, list):
            return []

        # align length safety
        result = result[:len(texts)]
        if len(result) < len(texts):
            result += texts[len(result):]

        return result

    except Exception as e:
        st.error(f"Translation Error: {e}")
        return []


# --- SESSION STATE ---
if "df" not in st.session_state:
    st.session_state.df = None
if "po" not in st.session_state:
    st.session_state.po = None
if "page" not in st.session_state:
    st.session_state.page = 0
if "filename" not in st.session_state:
    st.session_state.filename = ""


# --- SIDEBAR ---
with st.sidebar:
    st.title("Settings")

    target_lang = st.selectbox(
        "Target Language",
        ["Myanmar", "Shan", "Mon", "S'gaw Karen"]
    )

    st.divider()

    if st.session_state.df is not None:
        total = len(st.session_state.df)
        translated = st.session_state.df["Translation"].str.strip().ne("").sum()

        st.write(f"Progress: {translated}/{total}")
        st.progress(translated / total if total else 0)

        st.divider()

        if st.button("Apply & Export", use_container_width=True):
            for _, row in st.session_state.df.iterrows():
                st.session_state.po[row["ID"]].msgstr = row["Translation"]

            current_time = datetime.now().strftime("%Y%m%d_%H%M")
            base_name = os.path.splitext(st.session_state.filename)[0]
            final_filename = f"translated_{target_lang}_{base_name}_{current_time}.po"

            st.download_button(
                "Download .po",
                data=str(st.session_state.po),
                file_name=final_filename,
                use_container_width=True
            )


# --- MAIN UI ---
st.title("Ubuntu OS Localization Tool")

st.write(
    f"Translating for Ubuntu Linux using "
    f"<span class='ubuntu-orange'>{target_lang}</span>",
    unsafe_allow_html=True
)

file = st.file_uploader("Upload .po file", type=["po"])

# --- LOAD PO FILE ---
if file:
    if st.session_state.po is None or file.name != st.session_state.filename:

        po_data = polib.pofile(file.getvalue().decode("utf-8"))

        st.session_state.po = po_data
        st.session_state.filename = file.name

        entries = [
            {"ID": i, "Original": e.msgid, "Translation": e.msgstr}
            for i, e in enumerate(po_data)
            if not e.msgstr.strip()
        ]

        st.session_state.df = pd.DataFrame(entries)
        st.session_state.page = 0


# --- TABLE UI ---
if st.session_state.df is not None:

    df = st.session_state.df

    if df.empty:
        st.success("Everything is translated!")
    else:
        items_per_page = 10
        start = st.session_state.page * items_per_page
        end = min(start + items_per_page, len(df))

        st.markdown("""
        <div style="display:flex; justify-content:space-between;">
            <div class="header-text">SOURCE</div>
            <div class="header-text">TARGET</div>
        </div>
        """, unsafe_allow_html=True)

        for i in range(start, end):
            c1, c2 = st.columns(2)

            c1.text_area(
                f"src_{i}",
                df.at[i, "Original"],
                height=90,
                disabled=True,
                label_visibility="collapsed"
            )

            val = c2.text_area(
                f"tgt_{i}",
                df.at[i, "Translation"],
                height=90,
                label_visibility="collapsed"
            )

            st.session_state.df.at[i, "Translation"] = val

        st.divider()

        col1, col2, col3 = st.columns([2, 1, 1])


        # --- TRANSLATE PAGE ---
        with col1:
            if st.button("Translate Page", use_container_width=True):
                batch = df.iloc[start:end]
                targets = batch[batch["Translation"].str.strip() == ""]

                if not targets.empty:
                    with st.spinner("Translating with Gemini..."):

                        results = translate_engine(
                            targets["Original"].tolist(),
                            target_lang
                        )

                        for idx, val in zip(targets.index, results):
                            st.session_state.df.at[idx, "Translation"] = val

                        st.success("Translation completed!")
                        st.rerun()
                else:
                    st.info("No untranslated strings")

        # --- NAVIGATION ---
        with col2:
            if st.button("Previous", disabled=(st.session_state.page == 0)):
                st.session_state.page -= 1
                st.rerun()

        with col3:
            if st.button("Next", disabled=(end >= len(df))):
                st.session_state.page += 1
                st.rerun()