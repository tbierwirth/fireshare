import os
from pathlib import Path
from flask import current_app
from sqlalchemy import select
from ... import db
from ...models import Video

def get_video_path(id, subid=None):
    """Get the file path for a video by ID"""
    stmt = select(Video).filter_by(video_id=id)
    video = db.session.execute(stmt).scalar_one_or_none()
    if not video:
        raise Exception(f"No video found for {id}")
    paths = current_app.config['PATHS']
    subid_suffix = f"-{subid}" if subid else ""
    ext = ".mp4" if subid else video.extension
    video_path = paths["processed"] / "video_links" / f"{id}{subid_suffix}{ext}"
    return str(video_path)
