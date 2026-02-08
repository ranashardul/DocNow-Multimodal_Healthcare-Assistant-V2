# response.py
import os
from gtts import gTTS
from dotenv import load_dotenv
load_dotenv()

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

def text_to_speech_gtts(input_text, output_filepath=None, lang='en'):
    """
    Convert text to speech using gTTS. Returns path to mp3.
    """
    import tempfile
    if output_filepath is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        output_filepath = tmp.name
        tmp.close()

    audioobj = gTTS(text=input_text, lang=lang, slow=False)
    audioobj.save(output_filepath)
    return output_filepath


def text_to_speech_elevenlabs(input_text, output_filepath=None):
    """
    Convert text to speech using ElevenLabs. Lazy-import and require API key.
    """
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY not configured in environment")

    from elevenlabs.client import ElevenLabs
    from elevenlabs import save
    import tempfile

    if output_filepath is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        output_filepath = tmp.name
        tmp.close()

    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    voice_id = "cgSgspJ2msm6clMCkdW9"

    audio = client.text_to_speech.convert(
        text=input_text,
        voice_id=voice_id,
        model_id="eleven_turbo_v2",
        output_format="mp3_44100_128"
    )

    save(audio, output_filepath)
    return output_filepath
