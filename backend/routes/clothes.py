import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import ClothingItem

clothes_bp = Blueprint('clothes', __name__)

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
)


@clothes_bp.route('/', methods=['GET'])
@jwt_required()
def get_clothes():
    user_id = int(get_jwt_identity())
    category = request.args.get('category')

    query = ClothingItem.query.filter_by(user_id=user_id)
    if category:
        query = query.filter_by(category=category)

    items = query.order_by(ClothingItem.created_at.desc()).all()
    return jsonify([item.to_dict() for item in items])


@clothes_bp.route('/<int:item_id>', methods=['GET'])
@jwt_required()
def get_clothing(item_id):
    user_id = int(get_jwt_identity())
    item = ClothingItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    return jsonify(item.to_dict())


@clothes_bp.route('/', methods=['POST'])
@jwt_required()
def create_clothing():
    user_id = int(get_jwt_identity())

    image_url = None
    if 'image' in request.files:
        file = request.files['image']
        result = cloudinary.uploader.upload(file, folder='my-closet-manager')
        image_url = result.get('secure_url')
        data = request.form
    else:
        data = request.get_json() or {}

    item = ClothingItem(
        user_id=user_id,
        category=data.get('category'),
        sub_category=data.get('sub_category'),
        color=data.get('color'),
        season=data.get('season'),
        style=data.get('style'),
        material=data.get('material'),
        image_url=image_url,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@clothes_bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_clothing(item_id):
    user_id = int(get_jwt_identity())
    item = ClothingItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    data = request.get_json()

    for field in ('category', 'sub_category', 'color', 'season', 'style', 'material'):
        if field in data:
            setattr(item, field, data[field])

    db.session.commit()
    return jsonify(item.to_dict())


@clothes_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_clothing(item_id):
    user_id = int(get_jwt_identity())
    item = ClothingItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': f'ID {item_id} 삭제 완료'})
