# voice.py
import logging
import tempfile
import os
from dotenv import load_dotenv
load_dotenv()

import speech_recognition as sr
from groq import Groq

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def record_audio_simple(file_path=None, timeout=20, phrase_time_limit=None, pause_threshold=1.0):
    """
    Record audio (microphone) and save as WAV. Returns file path or None.
    """
    recognizer = sr.Recognizer()
    recognizer.dynamic_energy_threshold = True
    recognizer.energy_threshold = 300
    recognizer.pause_threshold = pause_threshold

    try:
        with sr.Microphone() as source:
            logging.info("Adjusting for ambient noise...")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            logging.info("Recording audio (speak now)...")
            audio_data = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
            logging.info("Recording complete.")
            wav_data = audio_data.get_wav_data()

            if file_path is None:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                wav_path = tmp.name
                tmp.close()
            else:
                wav_path = file_path if file_path.lower().endswith(".wav") else file_path

            with open(wav_path, "wb") as f:
                f.write(wav_data)

            logging.info(f"Audio saved as WAV at: {wav_path}")
            return wav_path

    except sr.WaitTimeoutError:
        logging.error("No speech detected within timeout.")
        return None
    except Exception as e:
        logging.error(f"An error occurred while recording audio: {e}", exc_info=True)
        return None


GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
def transcribe_audio_groq(stt_model, audio_file_path, GROQ_API_KEY=GROQ_API_KEY):
    """
    Transcribe local audio file using Groq audio transcription. Returns transcription text.
    """
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set in environment")

    client = Groq(api_key=GROQ_API_KEY)

    with open(audio_file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            model=stt_model,
            file=audio_file,
            language="en"
        )

    try:
        return transcription.text
    except Exception:
        return str(transcription)
