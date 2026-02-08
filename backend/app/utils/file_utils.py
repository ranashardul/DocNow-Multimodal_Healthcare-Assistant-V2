# backend/app/utils/file_utils.py
import os
import shutil
import tempfile
from fastapi import UploadFile

TMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tmp_files"))
os.makedirs(TMP_DIR, exist_ok=True)

def save_upload_file_tmp(upload_file: UploadFile, dst_dir: str = TMP_DIR) -> str:
    """
    Save an UploadFile to a temporary file in TMP_DIR. Returns the file path.
    """
    filename = upload_file.filename or "upload"
    # sanitize suffix
    suffix = os.path.splitext(filename)[1] or ""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=dst_dir)
    tmp_path = tmp.name
    tmp.close()

    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    try:
        upload_file.file.close()
    except Exception:
        pass
    return tmp_path

def make_temp_filename(suffix: str = ".mp3", dst_dir: str = TMP_DIR) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=dst_dir)
    path = tmp.name
    tmp.close()
    return path

def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass
