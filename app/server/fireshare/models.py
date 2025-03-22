import json
import datetime
import enum
import re
from flask_login import UserMixin
from sqlalchemy import select, update, func
from . import db

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    
class UserStatus(enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password = db.Column(db.String(255))
    display_name = db.Column(db.String(100), nullable=True)
    role = db.Column(db.String(20), default=UserRole.USER.value)
    status = db.Column(db.String(20), default=UserStatus.ACTIVE.value)
    admin = db.Column(db.Boolean, default=False)  
    ldap = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def is_admin(self):
        return self.role == UserRole.ADMIN.value or self.admin
    
    def is_active(self):
        return self.status == UserStatus.ACTIVE.value
    
    def json(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "display_name": self.display_name or self.username,
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }

class InviteCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(255), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    used_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    used_by = db.relationship('User', foreign_keys=[used_by_id])
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    used_at = db.Column(db.DateTime, nullable=True)
    
    @property
    def is_expired(self):
        return self.expires_at and self.expires_at < datetime.datetime.utcnow()
    
    @property
    def is_used(self):
        return self.used_at is not None
    
    @property
    def status(self):
        if self.is_used:
            return "used"
        if self.is_expired:
            return "expired"
        return "valid"
    
    def json(self):
        return {
            "id": self.id,
            "code": self.code,
            "email": self.email,
            "created_by": self.created_by.username if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "status": self.status
        }

class Game(db.Model):
    __tablename__ = "game"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)  
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    
    folder = db.relationship('Folder', backref='game', uselist=False)
    videos = db.relationship('Video', backref=db.backref('game', lazy=True))
    
    def __repr__(self):
        return f"<Game {self.name}>"
    
    @classmethod
    def generate_slug(cls, name):
        
        
        
        return re.sub(r'[^a-z0-9\-\._]', '', name.lower().replace(' ', '-'))
    
    @classmethod
    def find_or_create(cls, name):
        
        slug = cls.generate_slug(name)
        
        
        stmt = select(cls).filter_by(slug=slug)
        game = db.session.execute(stmt).scalar_one_or_none()
        
        if not game:
            game = cls(name=name, slug=slug)
            db.session.add(game)
            db.session.commit()
            
            
            Folder.for_game(game)
            
        return game
    
    def json(self):
        
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "folder_id": self.folder.id if self.folder else None,
            "video_count": 0  
        }

class Tag(db.Model):
    __tablename__ = "tag"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)  
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f"<Tag {self.name}>"
    
    @classmethod
    def generate_slug(cls, name):
        
        
        
        return re.sub(r'[^a-z0-9\-\._]', '', name.lower().replace(' ', '-'))
    
    @classmethod
    def find_or_create(cls, name):
        
        slug = cls.generate_slug(name)
        
        
        stmt = select(cls).filter_by(slug=slug)
        tag = db.session.execute(stmt).scalar_one_or_none()
        
        if not tag:
            tag = cls(name=name, slug=slug)
            db.session.add(tag)
            db.session.commit()
        return tag
    
    def json(self):
        
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "video_count": 0  
        }

class Folder(db.Model):
    __tablename__ = "folder"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=True)
    tag_id = db.Column(db.Integer, db.ForeignKey('tag.id'), nullable=True, unique=True)
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=True, unique=True)
    folder_type = db.Column(db.String(20), default="tag")  
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    
    parent = db.relationship('Folder', remote_side=[id], backref=db.backref('children', lazy='dynamic'))
    videos = db.relationship('Video', backref=db.backref('folder', lazy=True), foreign_keys="[Video.folder_id]")
    
    def __repr__(self):
        return f"<Folder {self.name}>"
    
    @classmethod
    def for_tag(cls, tag_name):
        
        tag = Tag.find_or_create(tag_name)
        
        
        stmt = select(cls).filter_by(tag_id=tag.id)
        folder = db.session.execute(stmt).scalar_one_or_none()
        
        if not folder:
            folder = cls(
                name=tag.name,
                slug=tag.slug,
                description=f"Videos tagged with {tag.name}",
                tag_id=tag.id,
                folder_type="tag"
            )
            db.session.add(folder)
            db.session.commit()
        return folder
    
    @classmethod
    def for_game(cls, game):
        
        
        stmt = select(cls).filter_by(game_id=game.id)
        folder = db.session.execute(stmt).scalar_one_or_none()
        
        if not folder:
            folder = cls(
                name=game.name,
                slug=game.slug,
                description=f"Videos from {game.name}",
                game_id=game.id,
                folder_type="game"
            )
            db.session.add(folder)
            db.session.commit()
        return folder
    
    def json(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "parent_id": self.parent_id,
            "folder_type": self.folder_type,
            "tag": self.tag.name if hasattr(self, 'tag') and self.tag else None,
            "game": self.game.name if hasattr(self, 'game') and self.game else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "video_count": 0  
        }


video_tags = db.Table('video_tags',
    db.Column('video_id', db.String(32), db.ForeignKey('video.video_id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.datetime.utcnow)
)

class Video(db.Model):
    __tablename__ = "video"

    id        = db.Column(db.Integer, primary_key=True)
    video_id  = db.Column(db.String(32), index=True, nullable=False)
    extension = db.Column(db.String(8), nullable=False)
    path      = db.Column(db.String(2048), index=True, nullable=False)
    available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(), default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime(), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    
    game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=True)  
    
    
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    
    info = db.relationship("VideoInfo", back_populates="video", uselist=False, lazy="joined")
    owner = db.relationship('User', backref=db.backref('videos', lazy='dynamic'))
    tags = db.relationship('Tag', secondary=video_tags, backref=db.backref('videos', lazy='dynamic'))
    
    def set_game(self, game_name):
        
        import logging
        logger = logging.getLogger('fireshare')
        
        logger.info(f"Setting game for video {self.video_id} to '{game_name}'")
        
        
        
        
        
        game = Game.find_or_create(game_name)
        logger.info(f"Game found/created with ID: {game.id}, name: {game.name}")
        
        
        folder = Folder.for_game(game)
        logger.info(f"Folder for game: {folder.id} - {folder.name}")
        
        
        try:
            
            stmt = update(Video).where(Video.video_id == self.video_id).values(
                game_id=game.id, 
                folder_id=folder.id
            )
            db.session.execute(stmt)
            logger.info(f"Explicitly updated video {self.video_id} with game_id={game.id} and folder_id={folder.id}")
            
            
            db.session.commit()
            logger.info(f"Changes committed for video {self.video_id}")
            
            
            
            self.game_id = game.id
            self.folder_id = folder.id
            
            
            stmt = select(Video).filter_by(video_id=self.video_id)
            video = db.session.execute(stmt).scalar_one_or_none()
            logger.info(f"After commit, video {video.video_id} has game_id={video.game_id}")
            
            return game
        except Exception as e:
            logger.error(f"Error updating video: {str(e)}")
            db.session.rollback()
            raise e
    
    def add_tag(self, tag_name):
        
        import logging
        logger = logging.getLogger('fireshare')
        
        logger.info(f"Adding tag '{tag_name}' to video {self.video_id}")
        
        
        try:
            
            tag = Tag.find_or_create(tag_name)
            logger.info(f"Tag found/created with ID: {tag.id}, name: {tag.name}")
            
            
            
            stmt = select(video_tags).where(
                (video_tags.c.video_id == self.video_id) & 
                (video_tags.c.tag_id == tag.id)
            )
            existing = db.session.execute(stmt).first()
            
            if not existing:
                
                logger.info(f"Adding association between video {self.video_id} and tag {tag.name}")
                
                
                stmt = video_tags.insert().values(
                    video_id=self.video_id,
                    tag_id=tag.id
                )
                db.session.execute(stmt)
                db.session.commit()
                logger.info(f"Successfully added tag {tag.name} to video {self.video_id}")
            else:
                logger.info(f"Video {self.video_id} already has tag {tag.name}")
                
            return tag
        except Exception as e:
            logger.error(f"Error adding tag to video: {str(e)}")
            db.session.rollback()
            raise e
    
    def json(self):
        j = {
            "video_id": self.video_id,
            "extension": self.extension,
            "path": self.path,
            "available": self.available,
            "info": self.info.json(),
            "folder_id": self.folder_id,
            "folder_name": self.folder.name if self.folder else None,
            "game": self.game.name if self.game else None,
            "game_id": self.game_id,
            "owner": self.owner.username if self.owner else None,
            "tags": [tag.name for tag in self.tags]
        }
        return j

    def __repr__(self):
        return "<Video {}>".format(self.video_id)

class VideoInfo(db.Model):
    __tablename__ = "video_info"

    id          = db.Column(db.Integer, primary_key=True)
    video_id    = db.Column(db.String(32), db.ForeignKey("video.video_id"), nullable=False)
    title       = db.Column(db.String(256), index=True)
    description = db.Column(db.String(2048))
    info        = db.Column(db.Text)
    duration    = db.Column(db.Float)
    width       = db.Column(db.Integer)
    height      = db.Column(db.Integer)
    private     = db.Column(db.Boolean, default=True)

    video       = db.relationship("Video", back_populates="info", uselist=False, lazy="joined")

    @property
    def vcodec(self):
        info = json.loads(self.info) if self.info else None
        vcodec = [i for i in info if i["codec_type"] == "video"][0] if info else None
        return vcodec

    @property
    def acodec(self):
        info = json.loads(self.info) if self.info else None
        acodec = [i for i in info if i["codec_type"] == "video"][0] if info else None
        return acodec

    @property
    def framerate(self):
        if self.vcodec:
            frn, frd = self.vcodec.get("r_frame_rate", "").split("/")
            return round(float(frn)/float(frd))
        else:
            return None

    def json(self):
        return {
            "title": self.title,
            "description": self.description,
            "private": self.private,
            "width": self.width,
            "height": self.height,
            "duration": round(self.duration) if self.duration else 0,
            "framerate": self.framerate
        }

    def __repr__(self):
        return "<VideoInfo {} {}>".format(self.video_id, self.title)

class VideoView(db.Model):
    __tablename__ = "video_view"
    __table_args__ = (
        db.UniqueConstraint('video_id', 'ip_address'),
    )

    id          = db.Column(db.Integer, primary_key=True)
    video_id    = db.Column(db.String(32), db.ForeignKey("video.video_id"), nullable=False)
    ip_address  = db.Column(db.String(256), nullable=False)

    def json(self):
        return {
            "video_id": self.video_id,
            "ip_address": self.ip_address,
        }

    @classmethod
    def count(cls, video_id):
        
        stmt = select(func.count()).select_from(cls).filter_by(video_id=video_id)
        return db.session.execute(stmt).scalar_one()

    @classmethod
    def add_view(cls, video_id, ip_address):
        
        stmt = select(cls).filter_by(video_id=video_id, ip_address=ip_address)
        exists = db.session.execute(stmt).scalar_one_or_none()
        
        if not exists:
            db.session.add(cls(video_id=video_id, ip_address=ip_address))
            db.session.commit()

    def __repr__(self):
        return "<VideoViews {} {}>".format(self.video_id, self.ip_address)
    
