import os
import base64
from dotenv import load_dotenv
load_dotenv()

import filetype
from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


def encode_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    with open(image_path, "rb") as f:
        data = f.read()

    kind = filetype.guess(data)
    mime = kind.mime if kind and kind.mime and kind.mime.startswith("image/") else "image/jpeg"

    b64 = base64.b64encode(data).decode("utf-8")
    return mime, b64


def analyze_multimodal(
    messages=None,
    text_query=None,
    encoded_image=None,
    model="meta-llama/llama-4-scout-17b-16e-instruct"
    # model="meta-llama/llama-4-maverick-17b-128e-instruct" - Model Deprecated
):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")

    client = Groq(api_key=GROQ_API_KEY)

    # ───── System prompt ─────
    system_prompt = {
    "role": "system",
    "content": (
        "You are a calm, friendly health assistant talking to a regular person.\n"
        "Use simple, everyday language.\n\n"

        "Main Goal:\n"
        "- Help the person understand what might be happening in a clear and simple way.\n"
        "- Briefly explain possible common reasons for their symptoms.\n\n"

        "Rules:\n"
        "- Do NOT give medical diagnoses\n"
        "- Do NOT say you cannot explain what is happening\n"
        "- Avoid technical or medical jargon\n"
        "- Use soft language like 'might', 'could', 'sometimes'\n"
        "- Be reassuring, not alarming\n"
        "- If symptoms are common and mild, say so calmly\n"
        "- Suggest gentle next steps (rest, fluids, sleep, monitoring symptoms)\n"
        "- Mention seeing a doctor only if symptoms worsen or feel severe\n"
        "- If an image is provided, describe only what is visible\n"
        "- You are not a replacement for a doctor\n\n"

        "Tone:\n"
        "- Sound like a knowledgeable, caring friend\n"
        "- Be clear and direct, but gentle\n"
        "- Never sound dismissive or vague\n"
    )
}

    final_messages = [system_prompt]

    # ───── Chat-based mode ─────
    if messages:
        for i, msg in enumerate(messages):
            role = msg.get("role")
            content = msg.get("content")

            if role not in {"user", "assistant"}:
                continue

            # Attach image ONLY to last user message
            if (
                encoded_image
                and role == "user"
                and i == len(messages) - 1
            ):
                mime, b64 = encoded_image
                content = [
                    {"type": "text", "text": content},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{b64}"
                        }
                    }
                ]

            final_messages.append({
                "role": role,
                "content": content
            })

    # ───── Legacy single-input mode ─────
    else:
        content_items = []

        if text_query:
            content_items.append({
                "type": "text",
                "text": text_query
            })

        if encoded_image:
            mime, b64 = encoded_image
            content_items.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{b64}"
                }
            })

        final_messages.append({
            "role": "user",
            "content": content_items
        })

    # ───── Groq call ─────
    completion = client.chat.completions.create(
        model=model,
        messages=final_messages
    )

    try:
        return completion.choices[0].message.content.strip()
    except Exception:
        return str(completion)
