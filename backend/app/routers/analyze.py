from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import os
import json
import logging

from app.services.brain_service import analyze_multimodal, encode_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["Analyze"])


@router.post("/")
async def analyze(
    text: str | None = Form(None),
    messages: str | None = Form(None),  # JSON string
    image: UploadFile | None = File(None),
):
    try:
        encoded_image = None
        parsed_messages = None

        # ───── Parse chat messages (if provided) ─────
        if messages:
            try:
                parsed_messages = json.loads(messages)
                if not isinstance(parsed_messages, list):
                    raise ValueError
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid messages format"
                )

        # ───── Normalize legacy text input ─────
        if text is not None:
            text = text.strip()
            if text == "" or text.lower() == "text":
                text = None

        # ───── Handle image upload ─────
        if image and image.filename:
            suffix = os.path.splitext(image.filename)[-1] or ".jpg"

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(await image.read())
                tmp_path = tmp.name

            try:
                encoded_image = encode_image(tmp_path)
            finally:
                os.unlink(tmp_path)

        # ───── Final validation ─────
        if not parsed_messages and text is None and encoded_image is None:
            raise HTTPException(
                status_code=400,
                detail="Provide messages, text, or an image"
            )

        # ───── Decide input mode ─────
        result = analyze_multimodal(
            messages=parsed_messages,
            text_query=text,
            encoded_image=encoded_image
        )

        return {
            "success": True,
            "response": result
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Analyze failed")
        raise HTTPException(status_code=500, detail=str(e))
