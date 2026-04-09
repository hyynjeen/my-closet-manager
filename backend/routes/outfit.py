import os
import random
import requests
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import ClothingItem, Outfit

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
        return None, None, None
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
        weather = data['weather'][0]['description']
        return temp, weather, get_season_by_temp(temp)
    except Exception:
        return None, None, None


@outfit_bp.route('/recommend', methods=['GET'])
@jwt_required()
def recommend():
    user_id = int(get_jwt_identity())
    city = request.args.get('city', 'Seoul')

    temp, weather, season = get_weather(city)

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
    }

    return jsonify({
        'outfit': outfit,
        'temperature': temp,
        'weather': weather,
        'season': season,
    })


@outfit_bp.route('/save', methods=['POST'])
@jwt_required()
def save_outfit():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    outfit = Outfit(
        user_id=user_id,
        top_id=data.get('top_id'),
        bottom_id=data.get('bottom_id'),
        outer_id=data.get('outer_id'),
        shoes_id=data.get('shoes_id'),
        weather=data.get('weather'),
        temperature=data.get('temperature'),
    )
    db.session.add(outfit)

    # 착용한 옷들의 last_worn_at 업데이트
    now = datetime.now(timezone.utc)
    for item_id in [data.get('top_id'), data.get('bottom_id'), data.get('outer_id'), data.get('shoes_id')]:
        if item_id:
            item = ClothingItem.query.get(item_id)
            if item:
                item.last_worn_at = now

    db.session.commit()
    return jsonify(outfit.to_dict()), 201


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
    since = datetime.now(timezone.utc) - timedelta(days=30)

    outfits = Outfit.query.filter(
        Outfit.user_id == user_id,
        Outfit.created_at >= since,
    ).all()

    count = {}
    for o in outfits:
        for item_id in [o.top_id, o.bottom_id, o.outer_id, o.shoes_id]:
            if item_id:
                count[item_id] = count.get(item_id, 0) + 1

    all_items = ClothingItem.query.filter_by(user_id=user_id).all()
    worn_items = [{'item': i.to_dict(), 'count': count.get(i.id, 0)} for i in all_items]
    worn_items.sort(key=lambda x: x['count'])

    least = [x for x in worn_items if x['count'] == 0 or True][:3]
    most = sorted(worn_items, key=lambda x: x['count'], reverse=True)[:3]

    return jsonify({'most_worn': most, 'least_worn': least})
