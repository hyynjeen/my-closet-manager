from app import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    nickname = db.Column(db.String(80), nullable=False)
    height = db.Column(db.Float, nullable=True)
    weight = db.Column(db.Float, nullable=True)
    personal_color = db.Column(db.String(20), nullable=True)
    profile_image = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    clothes = db.relationship('ClothingItem', backref='owner', lazy=True)
    outfits = db.relationship('Outfit', backref='owner', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'height': self.height,
            'weight': self.weight,
            'personal_color': self.personal_color,
            'profile_image': self.profile_image,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ClothingItem(db.Model):
    __tablename__ = 'clothes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50))
    sub_category = db.Column(db.String(50))
    color = db.Column(db.String(30))
    season = db.Column(db.String(100))
    style = db.Column(db.String(50))
    material = db.Column(db.String(50))
    image_url = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    last_worn_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'sub_category': self.sub_category,
            'color': self.color,
            'season': self.season,
            'style': self.style,
            'material': self.material,
            'image_url': self.image_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_worn_at': self.last_worn_at.isoformat() if self.last_worn_at else None,
        }


class OutfitItem(db.Model):
    """코디 기록에 포함된 개별 옷 (다중 선택 지원)"""
    __tablename__ = 'outfit_items'

    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.Integer, db.ForeignKey('outfits.id', ondelete='CASCADE'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('clothes.id', ondelete='CASCADE'), nullable=False)

    item = db.relationship('ClothingItem', foreign_keys=[item_id])


class Outfit(db.Model):
    __tablename__ = 'outfits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # 기존 단일 선택 컬럼 (하위 호환)
    top_id = db.Column(db.Integer, db.ForeignKey('clothes.id'), nullable=True)
    bottom_id = db.Column(db.Integer, db.ForeignKey('clothes.id'), nullable=True)
    outer_id = db.Column(db.Integer, db.ForeignKey('clothes.id'), nullable=True)
    shoes_id = db.Column(db.Integer, db.ForeignKey('clothes.id'), nullable=True)
    weather = db.Column(db.String(50))
    temperature = db.Column(db.Integer)
    worn_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    top = db.relationship('ClothingItem', foreign_keys=[top_id])
    bottom = db.relationship('ClothingItem', foreign_keys=[bottom_id])
    outer = db.relationship('ClothingItem', foreign_keys=[outer_id])
    shoes = db.relationship('ClothingItem', foreign_keys=[shoes_id])
    outfit_items = db.relationship('OutfitItem', backref='outfit', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        # 신규: outfit_items 방식
        new_items = [oi.item.to_dict() for oi in self.outfit_items if oi.item]
        # 구형: top/bottom/outer/shoes 방식
        legacy = [i.to_dict() for i in [self.top, self.bottom, self.outer, self.shoes] if i]
        all_items = new_items if new_items else legacy

        return {
            'id': self.id,
            'user_id': self.user_id,
            'top': self.top.to_dict() if self.top else None,
            'bottom': self.bottom.to_dict() if self.bottom else None,
            'outer': self.outer.to_dict() if self.outer else None,
            'shoes': self.shoes.to_dict() if self.shoes else None,
            'items': all_items,
            'weather': self.weather,
            'temperature': self.temperature,
            'worn_date': self.worn_date.isoformat() if self.worn_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
