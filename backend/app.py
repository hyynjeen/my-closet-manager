import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
bcrypt = Bcrypt()


def create_app():
    app = Flask(__name__)

    database_url = os.environ.get('DATABASE_URL', 'sqlite:///closet.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'change-this-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24시간

    CORS(app)
    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    from routes.auth import auth_bp
    from routes.clothes import clothes_bp
    from routes.outfit import outfit_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clothes_bp, url_prefix='/api/clothes')
    app.register_blueprint(outfit_bp, url_prefix='/api/outfit')

    with app.app_context():
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
