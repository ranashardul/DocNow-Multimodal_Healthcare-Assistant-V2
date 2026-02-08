from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import FileResponse
import os
import logging

from app.services.response_service import (
    text_to_speech_gtts,
    text_to_speech_elevenlabs
)

router = APIRouter(prefix="/tts", tags=["Text-to-Speech"])

logger = logging.getLogger(__name__)


@router.post("/")
async def tts(
    text: str = Form(...)
):
    try:
        text = text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        audio_path = None
        engine_used = None

        # 1️⃣ Try ElevenLabs first
        try:
            audio_path = text_to_speech_elevenlabs(text)
            engine_used = "elevenlabs"
        except Exception as e:
            logger.warning(f"ElevenLabs failed, falling back to gTTS: {e}")

        # 2️⃣ Fallback to gTTS
        if audio_path is None:
            audio_path = text_to_speech_gtts(text)
            engine_used = "gtts"

        return FileResponse(
            audio_path,
            media_type="audio/mpeg",
            filename=os.path.basename(audio_path),
            headers={
                "X-TTS-Engine": engine_used
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
