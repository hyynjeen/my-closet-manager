import os
import cloudinary
import cloudinary.uploader
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from models import User

auth_bp = Blueprint('auth', __name__)

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    nickname = data.get('nickname', '').strip()

    if not email or not password:
        return jsonify({'error': 'email과 password는 필수입니다.'}), 400
    if not nickname:
        return jsonify({'error': '닉네임은 필수입니다.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 409

    user = User(
        email=email,
        password=bcrypt.generate_password_hash(password).decode('utf-8'),
        nickname=nickname,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': '회원가입 성공', 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': token, 'user': user.to_dict()})


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
    return jsonify(user.to_dict())


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404

    data = request.get_json()
    nickname = data.get('nickname', '').strip()
    if not nickname:
        return jsonify({'error': '닉네임은 필수입니다.'}), 400

    user.nickname = nickname
    user.height = data.get('height')
    user.weight = data.get('weight')
    user.personal_color = data.get('personal_color') or None

    db.session.commit()
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/profile/image', methods=['POST'])
@jwt_required()
def update_profile_image():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
    if 'image' not in request.files:
        return jsonify({'error': '이미지 파일이 없습니다.'}), 400

    file = request.files['image']
    result = cloudinary.uploader.upload(file, folder='my-closet-manager/profiles')
    user.profile_image = result.get('secure_url')
    db.session.commit()
    return jsonify({'user': user.to_dict()})
