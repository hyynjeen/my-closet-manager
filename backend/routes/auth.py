from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db, bcrypt
from models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    nickname = data.get('nickname', '').strip()

    if not email or not password:
        return jsonify({'error': 'email과 password는 필수입니다.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 409

    user = User(
        email=email,
        password=bcrypt.generate_password_hash(password).decode('utf-8'),
        nickname=nickname or None,
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
