from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os

import logging
logger = logging.getLogger(__name__)

from app.services.voice_service import transcribe_audio_groq

router = APIRouter(prefix="/transcribe", tags=["Transcribe"])


@router.post("/")
async def transcribe(
    audio: UploadFile = File(...)
):
    try:
        # Basic validation
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")

        suffix = os.path.splitext(audio.filename)[-1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        try:
            text = transcribe_audio_groq(
                stt_model="whisper-large-v3",
                audio_file_path=tmp_path
            )
        finally:
            os.unlink(tmp_path)

        return {
            "success": True,
            "transcription": text
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
