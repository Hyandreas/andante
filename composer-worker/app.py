import base64
import glob
import hmac
import ipaddress
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from music21 import converter


class ComposerJobRequest(BaseModel):
    jobId: str
    sessionId: str
    sourceRecordingId: str
    audioUrl: str
    targetFormat: list[str] = ["musicxml", "midi"]


app = FastAPI(title="Andante Composer Worker")

MAX_AUDIO_BYTES = int(os.environ.get("MAX_AUDIO_BYTES", str(50 * 1024 * 1024)))
ALLOWED_AUDIO_HOST_SUFFIXES = tuple(
    suffix.strip().lower()
    for suffix in os.environ.get("ALLOWED_AUDIO_HOST_SUFFIXES", ".supabase.co,.supabase.in").split(",")
    if suffix.strip()
)


def require_worker_auth(authorization: str | None) -> None:
    secret = os.environ.get("COMPOSER_WORKER_SECRET")
    if not secret:
        raise HTTPException(status_code=503, detail="Worker auth is not configured.")

    expected = f"Bearer {secret}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized.")


def validate_audio_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Audio URL must be HTTPS.")

    host = parsed.hostname.lower()
    try:
        ipaddress.ip_address(host)
        raise HTTPException(status_code=400, detail="Audio URL host is not allowed.")
    except ValueError:
        pass

    allowed = any(
        host == suffix.lstrip(".") or host.endswith(suffix)
        for suffix in ALLOWED_AUDIO_HOST_SUFFIXES
    )
    if not allowed:
        raise HTTPException(status_code=400, detail="Audio URL host is not allowed.")


def download_audio(url: str, destination: Path) -> None:
    validate_audio_url(url)
    with requests.get(url, timeout=(10, 120), stream=True) as response:
        if not response.ok:
            raise HTTPException(status_code=502, detail=f"Could not download audio: {response.status_code}")

        total = 0
        with destination.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_AUDIO_BYTES:
                    raise HTTPException(status_code=413, detail="Audio file is too large.")
                output.write(chunk)


def find_first_midi(output_dir: Path) -> Path:
    matches = glob.glob(str(output_dir / "**" / "*.mid"), recursive=True)
    matches.extend(glob.glob(str(output_dir / "**" / "*.midi"), recursive=True))
    if not matches:
        raise HTTPException(status_code=500, detail="Basic Pitch did not produce a MIDI file.")
    return Path(matches[0])


@app.post("/")
def transcribe(job: ComposerJobRequest, authorization: str | None = Header(default=None)):
    require_worker_auth(authorization)
    with tempfile.TemporaryDirectory(prefix=f"andante-{job.jobId}-") as workspace:
        root = Path(workspace)
        source_path = root / "source.webm"
        output_dir = root / "basic-pitch"
        output_dir.mkdir(parents=True, exist_ok=True)

        download_audio(job.audioUrl, source_path)

        try:
            subprocess.run(
                ["basic-pitch", str(output_dir), str(source_path)],
                check=True,
                capture_output=True,
                text=True,
                timeout=int(os.environ.get("BASIC_PITCH_TIMEOUT_SEC", "900")),
            )
        except subprocess.CalledProcessError as exc:
            raise HTTPException(status_code=500, detail=exc.stderr[-2000:] or "Basic Pitch failed.") from exc
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="Basic Pitch timed out.") from exc

        midi_path = find_first_midi(output_dir)
        score_path = root / "score.musicxml"

        try:
            score = converter.parse(str(midi_path))
            score.write("musicxml", fp=str(score_path))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"MusicXML conversion failed: {exc}") from exc

        return {
            "workerRunId": f"basic-pitch:{job.jobId}",
            "title": "Composer Mode sketch",
            "musicXml": score_path.read_text(encoding="utf-8"),
            "midiBase64": base64.b64encode(midi_path.read_bytes()).decode("ascii"),
        }


@app.get("/health")
def health():
    return {"ok": True}
