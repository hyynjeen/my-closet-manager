import os
import random
import requests
from datetime import datetime, timezone, timedelta, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app import db
from models import ClothingItem, Outfit, OutfitItem, User

PERSONAL_COLOR_MAP = {
    '봄 웜': ['코랄', '복숭아', '황금색', '아이보리', '연두색', '카멜'],
    '여름 쿨': ['라벤더', '파우더 블루', '로즈 핑크', '민트', '라일락', '소프트 화이트'],
    '가을 웜': ['머스타드', '올리브', '번트 오렌지', '카키', '브라운', '테라코타'],
    '겨울 쿨': ['블랙', '화이트', '네이비', '진홍색', '로열 블루', '다크 그린'],
}

outfit_bp = Blueprint('outfit', __name__)

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')


def get_season_by_temp(temp):
    if temp < 5:
        return '겨울'
    elif temp < 15:
        return '가을'
    elif temp < 23:
        return '봄'
    else:
        return '여름'


def get_weather(city='Seoul'):
    if not OPENWEATHER_API_KEY:
        return None, None, None, None, None
    try:
        url = 'https://api.openweathermap.org/data/2.5/weather'
        res = requests.get(url, params={
            'q': city,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric',
            'lang': 'kr',
        }, timeout=5)
        data = res.json()
        temp = round(data['main']['temp'])
        temp_min = round(data['main']['temp_min'])
        temp_max = round(data['main']['temp_max'])
        weather = data['weather'][0]['description']
        return temp, temp_min, temp_max, weather, get_season_by_temp(temp)
    except Exception:
        return None, None, None, None, None


@outfit_bp.route('/recommend', methods=['GET'])
@jwt_required()
def recommend():
    user_id = int(get_jwt_identity())
    city = request.args.get('city', 'Seoul')

    temp, temp_min, temp_max, weather, season = get_weather(city)

    items = ClothingItem.query.filter_by(user_id=user_id).all()
    if not items:
        return jsonify({'error': '옷장에 옷이 없습니다. 먼저 옷을 추가해주세요.'}), 404

    # 계절이 확인된 경우 해당 계절 옷 우선 필터링
    if season:
        season_items = [i for i in items if season in (i.season or '').split(',')]
        if season_items:
            items = season_items

    by_category = {}
    for item in items:
        cat = item.category or '기타'
        by_category.setdefault(cat, []).append(item)

    outfit = {
        'top': random.choice(by_category['상의']).to_dict() if '상의' in by_category else None,
        'bottom': random.choice(by_category['하의']).to_dict() if '하의' in by_category else None,
        'outer': random.choice(by_category['아우터']).to_dict() if '아우터' in by_category else None,
        'shoes': random.choice(by_category['신발']).to_dict() if '신발' in by_category else None,
        'bag': random.choice(by_category['가방']).to_dict() if '가방' in by_category else None,
        'accessory': random.choice(by_category['기타']).to_dict() if '기타' in by_category else None,
    }

    user = User.query.get(user_id)
    recommended_colors = PERSONAL_COLOR_MAP.get(user.personal_color, []) if user and user.personal_color else []

    return jsonify({
        'outfit': outfit,
        'temperature': temp,
        'temp_min': temp_min,
        'temp_max': temp_max,
        'weather': weather,
        'personal_color': user.personal_color if user else None,
        'recommended_colors': recommended_colors,
    })


@outfit_bp.route('/save', methods=['POST'])
@jwt_required()
def save_outfit():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    worn_date_str = data.get('worn_date')
    worn_date = date.fromisoformat(worn_date_str) if worn_date_str else date.today()
    now = datetime.now(timezone.utc)

    item_ids = data.get('item_ids')  # 다중 선택 방식

    if item_ids:
        outfit = Outfit(
            user_id=user_id,
            weather=data.get('weather'),
            temperature=data.get('temperature'),
            worn_date=worn_date,
        )
        db.session.add(outfit)
        db.session.flush()

        for item_id in item_ids:
            db.session.add(OutfitItem(outfit_id=outfit.id, item_id=item_id))
            item = ClothingItem.query.get(item_id)
            if item:
                item.last_worn_at = now
    else:
        # 기존 단일 선택 방식 (코디 추천에서 저장 시)
        outfit = Outfit(
            user_id=user_id,
            top_id=data.get('top_id'),
            bottom_id=data.get('bottom_id'),
            outer_id=data.get('outer_id'),
            shoes_id=data.get('shoes_id'),
            weather=data.get('weather'),
            temperature=data.get('temperature'),
            worn_date=worn_date,
        )
        db.session.add(outfit)
        for item_id in [data.get('top_id'), data.get('bottom_id'), data.get('outer_id'), data.get('shoes_id')]:
            if item_id:
                item = ClothingItem.query.get(item_id)
                if item:
                    item.last_worn_at = now

    db.session.commit()
    return jsonify(outfit.to_dict()), 201


@outfit_bp.route('/<int:outfit_id>', methods=['PUT'])
@jwt_required()
def update_outfit(outfit_id):
    user_id = int(get_jwt_identity())
    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()
    data = request.get_json()
    item_ids = data.get('item_ids', [])

    for oi in list(outfit.outfit_items):
        db.session.delete(oi)

    now = datetime.now(timezone.utc)
    for item_id in item_ids:
        db.session.add(OutfitItem(outfit_id=outfit_id, item_id=item_id))
        item = ClothingItem.query.get(item_id)
        if item:
            item.last_worn_at = now

    db.session.commit()
    return jsonify(outfit.to_dict())


@outfit_bp.route('/saved', methods=['GET'])
@jwt_required()
def saved_outfits():
    user_id = int(get_jwt_identity())
    outfits = Outfit.query.filter_by(user_id=user_id).order_by(Outfit.created_at.desc()).all()
    return jsonify([o.to_dict() for o in outfits])


@outfit_bp.route('/stats', methods=['GET'])
@jwt_required()
def monthly_stats():
    user_id = int(get_jwt_identity())
    since_date = date.today() - timedelta(days=90)
    since_dt = datetime.now(timezone.utc) - timedelta(days=90)

    outfits = Outfit.query.filter(
        Outfit.user_id == user_id,
        or_(
            Outfit.worn_date >= since_date,
            db.and_(Outfit.worn_date.is_(None), Outfit.created_at >= since_dt),
        )
    ).all()

    count = {}
    for o in outfits:
        # 신규 방식
        for oi in o.outfit_items:
            count[oi.item_id] = count.get(oi.item_id, 0) + 1
        # 구형 방식
        if not o.outfit_items:
            for item_id in [o.top_id, o.bottom_id, o.outer_id, o.shoes_id]:
                if item_id:
                    count[item_id] = count.get(item_id, 0) + 1

    all_items = ClothingItem.query.filter_by(user_id=user_id).all()
    worn_items = [{'item': i.to_dict(), 'count': count.get(i.id, 0)} for i in all_items]

    least = sorted(worn_items, key=lambda x: x['count'])[:3]
    most = sorted(worn_items, key=lambda x: x['count'], reverse=True)[:3]

    return jsonify({'most_worn': most, 'least_worn': least})


@outfit_bp.route('/calendar', methods=['GET'])
@jwt_required()
def calendar_outfits():
    user_id = int(get_jwt_identity())
    year = int(request.args.get('year', date.today().year))
    month = int(request.args.get('month', date.today().month))

    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)

    outfits = Outfit.query.filter(
        Outfit.user_id == user_id,
        Outfit.worn_date >= start,
        Outfit.worn_date < end,
    ).all()

    result = {}
    for o in outfits:
        key = o.worn_date.isoformat()
        result.setdefault(key, []).append(o.to_dict())

    return jsonify(result)
