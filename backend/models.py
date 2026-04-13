from app import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    nickname = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    clothes = db.relationship('ClothingItem', backref='owner', lazy=True)
    outfits = db.relationship('Outfit', backref='owner', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ClothingItem(db.Model):
    __tablename__ = 'clothes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(50))        # 상의/하의/아우터/신발/기타
    sub_category = db.Column(db.String(50))    # 티셔츠/셔츠/니트 등
    color = db.Column(db.String(30))
    season = db.Column(db.String(100))         # 봄,여름,가을,겨울 (복수 선택 가능)
    style = db.Column(db.String(50))
    material = db.Column(db.String(50))        # 소재
    image_url = db.Column(db.String(300))      # Cloudinary URL
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    last_worn_at = db.Column(db.DateTime, nullable=True)  # 마지막 착용일

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


class Outfit(db.Model):
    __tablename__ = 'outfits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'top': self.top.to_dict() if self.top else None,
            'bottom': self.bottom.to_dict() if self.bottom else None,
            'outer': self.outer.to_dict() if self.outer else None,
            'shoes': self.shoes.to_dict() if self.shoes else None,
            'weather': self.weather,
            'temperature': self.temperature,
            'worn_date': self.worn_date.isoformat() if self.worn_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
