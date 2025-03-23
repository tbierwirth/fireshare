import os
import json
import logging
from pathlib import Path
import datetime

from . import create_app, db, util
from .models import Video, VideoInfo, Game, Tag, VideoProcessingJob, ProcessingStatus

logger = logging.getLogger('fireshare.worker')

# In a production implementation, this would use Redis Queue (RQ)
# For now, we'll implement a simple direct processing function
# that can be called from the upload endpoint

def process_video(video_id, game_name, tags=None, owner_id=None):
    """
    Process a video after upload, handling thumbnails, metadata, etc.
    
    Args:
        video_id: The ID of the video to process
        game_name: The game to associate with the video
        tags: Optional comma-separated list of tags to apply
        owner_id: Optional user ID of the owner
    """
    app = create_app()
    with app.app_context():
        try:
            # Mark job as processing
            stmt = db.select(VideoProcessingJob).filter_by(video_id=video_id)
            job = db.session.execute(stmt).scalar_one_or_none()
            
            if not job:
                logger.error(f"No processing job found for video {video_id}")
                return {"success": False, "video_id": video_id, "error": "No processing job found"}
                
            job.status = ProcessingStatus.PROCESSING.value
            db.session.commit()
            logger.info(f"Processing started for video {video_id}")
            
            # Get video
            stmt = db.select(Video).filter_by(video_id=video_id)
            video = db.session.execute(stmt).scalar_one_or_none()
            if not video:
                job.status = ProcessingStatus.FAILED.value
                job.error_message = f"Video {video_id} not found"
                db.session.commit()
                raise ValueError(f"Video {video_id} not found")
            
            # Update progress - 25%
            job.progress = 25
            db.session.commit()
            
            # Set game
            if game_name:
                logger.info(f"Setting game '{game_name}' for video {video_id}")
                try:
                    video.set_game(game_name)
                except Exception as e:
                    logger.error(f"Error setting game for video {video_id}: {str(e)}")
            
            # Update progress - 50%
            job.progress = 50
            db.session.commit()
            
            # Add tags
            if tags:
                logger.info(f"Adding tags '{tags}' to video {video_id}")
                tag_list = tags.split(',')
                for tag_name in tag_list:
                    if tag_name.strip():
                        try:
                            video.add_tag(tag_name.strip())
                        except Exception as e:
                            logger.error(f"Error adding tag '{tag_name}' to video {video_id}: {str(e)}")
            
            # Update progress - 75%
            job.progress = 75
            db.session.commit()
            
            # Set owner
            if owner_id:
                video.owner_id = owner_id
                db.session.commit()
                logger.info(f"Updated owner for video {video_id} to user {owner_id}")
            
            # Generate thumbnails and metadata
            paths = app.config['PATHS']
            processed_root = Path(app.config['PROCESSED_DIRECTORY'])
            
            # Ensure video link exists
            video_link_path = Path(processed_root, "video_links", video.video_id + video.extension)
            if not video_link_path.exists():
                # Create video link
                src = Path((paths["video"] / video.path).absolute())
                dst = video_link_path
                video_links_dir = Path(processed_root, "video_links")
                if not video_links_dir.exists():
                    video_links_dir.mkdir(parents=True, exist_ok=True)
                
                # Create symlink
                if not dst.exists():
                    try:
                        logger.info(f"Creating symlink from {src} to {dst}")
                        dst.symlink_to(src)
                    except Exception as e:
                        logger.error(f"Error creating symlink for video {video_id}: {str(e)}")
            
            # Ensure derived directory exists
            derived_path = Path(processed_root, "derived", video.video_id)
            if not derived_path.exists():
                derived_path.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created derived directory at {str(derived_path)}")
            else:
                logger.info(f"Derived directory already exists at {str(derived_path)}")
            
            # Generate poster if needed
            poster_path = Path(derived_path, "poster.jpg")
            if not poster_path.exists():
                # Get thumbnail position
                thumbnail_skip = app.config.get('THUMBNAIL_VIDEO_LOCATION', 0)
                # Check if we have duration info
                stmt = db.select(VideoInfo).filter_by(video_id=video_id)
                video_info = db.session.execute(stmt).scalar_one_or_none()
                poster_time = 0
                if video_info and video_info.duration:
                    poster_time = int(video_info.duration * thumbnail_skip/100) if thumbnail_skip else 0
                    logger.info(f"Using thumbnail position {poster_time}s based on video duration {video_info.duration}")
                else:
                    logger.info(f"No duration info available, using default thumbnail position 0s")
                
                # Create poster
                try:
                    logger.info(f"Creating poster for video {video_id} at position {poster_time}s with path: {poster_path}")
                    util.create_poster(video_link_path, poster_path, poster_time)
                    
                    # Verify the poster was created
                    if poster_path.exists():
                        logger.info(f"Poster successfully created for video {video_id} at {poster_path}")
                    else:
                        logger.warning(f"Poster file not found after creation for video {video_id}")
                except Exception as e:
                    logger.error(f"Error creating poster for video {video_id}: {str(e)}")
            else:
                logger.info(f"Poster already exists at {poster_path}")
            
            # Generate preview animation if needed
            preview_path = Path(derived_path, "boomerang-preview.webm")
            if not preview_path.exists():
                try:
                    logger.info(f"Creating boomerang preview for video {video_id} at path: {preview_path}")
                    util.create_boomerang_preview(video_link_path, preview_path)
                    
                    # Verify the preview was created
                    if preview_path.exists():
                        logger.info(f"Boomerang preview successfully created for video {video_id} at {preview_path}")
                    else:
                        logger.warning(f"Boomerang preview file not found after creation for video {video_id}")
                except Exception as e:
                    logger.error(f"Error creating preview for video {video_id}: {str(e)}")
            else:
                logger.info(f"Boomerang preview already exists at {preview_path}")
            
            # Extract metadata if needed
            info_stmt = db.select(VideoInfo).filter_by(video_id=video_id)
            info = db.session.execute(info_stmt).scalar_one_or_none()
            
            if info and not info.info:
                try:
                    logger.info(f"Extracting metadata for video {video_id}")
                    media_info = util.get_media_info(video_link_path)
                    if media_info:
                        info.info = json.dumps(media_info)
                        vcodec = [i for i in media_info if i['codec_type'] == 'video'][0]
                        if 'duration' in vcodec:
                            info.duration = float(vcodec['duration'])
                        elif 'tags' in vcodec and 'DURATION' in vcodec['tags']:
                            info.duration = util.dur_string_to_seconds(vcodec['tags']['DURATION'])
                        else:
                            info.duration = 0
                            
                        info.width = int(vcodec.get('width', 0))
                        info.height = int(vcodec.get('height', 0))
                        db.session.commit()
                        logger.info(f"Updated metadata for video {video_id}: {info.duration}s, {info.width}x{info.height}")
                except Exception as e:
                    logger.error(f"Error extracting metadata for video {video_id}: {str(e)}")
            
            # Mark job as completed
            job.progress = 100
            job.status = ProcessingStatus.COMPLETED.value
            db.session.commit()
            logger.info(f"Processing completed for video {video_id}")
            
            return {"success": True, "video_id": video_id}
            
        except Exception as e:
            logger.error(f"Error processing video {video_id}: {str(e)}")
            # Try to update job status if possible
            try:
                job = VideoProcessingJob.query.filter_by(video_id=video_id).first()
                if job:
                    job.status = ProcessingStatus.FAILED.value
                    job.error_message = str(e)
                    db.session.commit()
            except:
                pass
            
            return {"success": False, "video_id": video_id, "error": str(e)}