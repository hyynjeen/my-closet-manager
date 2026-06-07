import os
import random
import requests
import cloudinary
import cloudinary.uploader
import google.generativeai as genai
from datetime import datetime, timezone, timedelta, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app import db
from models import ClothingItem, Outfit, OutfitItem, User, DailyPhoto

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
)

PERSONAL_COLOR_MAP = {
    '봄 웜': ['코랄', '복숭아', '황금색', '아이보리', '연두색', '카멜'],
    '여름 쿨': ['라벤더', '파우더 블루', '로즈 핑크', '민트', '라일락', '소프트 화이트'],
    '가을 웜': ['머스타드', '올리브', '번트 오렌지', '카키', '브라운', '테라코타'],
    '겨울 쿨': ['블랙', '화이트', '네이비', '진홍색', '로열 블루', '다크 그린'],
}

outfit_bp = Blueprint('outfit', __name__)

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')


def get_ai_outfit(items, temp, weather, personal_color):
    if not GEMINI_API_KEY:
        return None, None
    try:
        import json, re
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        items_list = []
        for item in items:
            items_list.append(
                f"ID:{item['id']} 카테고리:{item['category']} "
                f"종류:{item.get('sub_category') or ''} 색상:{item.get('color') or ''} "
                f"스타일:{item.get('style') or ''} 소재:{item.get('material') or ''}"
            )
        prompt = (
            f"당신은 패션 스타일리스트입니다.\n"
            f"오늘 날씨: {weather or '보통'}, 기온: {temp}°C\n"
            f"퍼스널 컬러: {personal_color or '없음'}\n\n"
            f"사용자 옷장:\n" + "\n".join(items_list) + "\n\n"
            "위 옷장에서 오늘 날씨와 퍼스널 컬러에 어울리는 코디를 골라주세요.\n"
            "각 카테고리(상의, 하의, 아우터, 신발, 가방, 기타)에서 하나씩만 선택하고, "
            "없는 카테고리는 건너뛰세요. 아우터는 기온 15°C 이하일 때만 포함하세요.\n"
            "반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n"
            "{\"selected_ids\": [숫자, ...], \"comment\": \"코디 조언 2-3문장\"}"
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return data.get('selected_ids', []), data.get('comment', '')
        return None, None
    except Exception:
        return None, None


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
        # 현재 날씨
        cur = requests.get('https://api.openweathermap.org/data/2.5/weather', params={
            'q': city, 'appid': OPENWEATHER_API_KEY, 'units': 'metric', 'lang': 'kr',
        }, timeout=5).json()
        temp = round(cur['main']['temp'])
        weather = cur['weather'][0]['description']

        # 오늘 최고·최저는 5일 예보에서 계산
        forecast = requests.get('https://api.openweathermap.org/data/2.5/forecast', params={
            'q': city, 'appid': OPENWEATHER_API_KEY, 'units': 'metric',
        }, timeout=5).json()
        today = datetime.now().strftime('%Y-%m-%d')
        today_temps = [
            item['main']['temp']
            for item in forecast.get('list', [])
            if item['dt_txt'].startswith(today)
        ]
        if today_temps:
            temp_min = round(min(today_temps))
            temp_max = round(max(today_temps))
        else:
            temp_min = temp_max = temp

        return temp, temp_min, temp_max, weather, get_season_by_temp(temp)
    except Exception:
        return None, None, None, None, None


CATEGORY_KEY = {'상의': 'top', '하의': 'bottom', '아우터': 'outer', '신발': 'shoes', '가방': 'bag', '기타': 'accessory'}


@outfit_bp.route('/recommend', methods=['GET'])
@jwt_required()
def recommend():
    user_id = int(get_jwt_identity())
    city = request.args.get('city', 'Seoul')

    temp, temp_min, temp_max, weather, season = get_weather(city)

    all_items = ClothingItem.query.filter_by(user_id=user_id).all()
    if not all_items:
        return jsonify({'error': '옷장에 옷이 없습니다. 먼저 옷을 추가해주세요.'}), 404

    user = User.query.get(user_id)
    recommended_colors = PERSONAL_COLOR_MAP.get(user.personal_color, []) if user and user.personal_color else []

    all_dicts = [i.to_dict() for i in all_items]
    selected_ids, ai_comment = get_ai_outfit(all_dicts, temp, weather, user.personal_color if user else None)

    outfit = {'top': None, 'bottom': None, 'outer': None, 'shoes': None, 'bag': None, 'accessory': None}

    if selected_ids:
        id_map = {i['id']: i for i in all_dicts}
        for sid in selected_ids:
            item = id_map.get(sid)
            if item:
                key = CATEGORY_KEY.get(item.get('category'), 'accessory')
                if outfit[key] is None:
                    outfit[key] = item
    else:
        # AI 실패 시 랜덤 폴백
        if season:
            season_items = [i for i in all_items if season in (i.season or '').split(',')]
            if season_items:
                all_items = season_items
        by_category = {}
        for item in all_items:
            by_category.setdefault(item.category or '기타', []).append(item)
        outfit = {
            'top': random.choice(by_category['상의']).to_dict() if '상의' in by_category else None,
            'bottom': random.choice(by_category['하의']).to_dict() if '하의' in by_category else None,
            'outer': random.choice(by_category['아우터']).to_dict() if '아우터' in by_category else None,
            'shoes': random.choice(by_category['신발']).to_dict() if '신발' in by_category else None,
            'bag': random.choice(by_category['가방']).to_dict() if '가방' in by_category else None,
            'accessory': random.choice(by_category['기타']).to_dict() if '기타' in by_category else None,
        }

    return jsonify({
        'outfit': outfit,
        'temperature': temp,
        'temp_min': temp_min,
        'temp_max': temp_max,
        'weather': weather,
        'personal_color': user.personal_color if user else None,
        'recommended_colors': recommended_colors,
        'ai_comment': ai_comment,
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


@outfit_bp.route('/<int:outfit_id>', methods=['DELETE'])
@jwt_required()
def delete_outfit(outfit_id):
    user_id = int(get_jwt_identity())
    outfit = Outfit.query.filter_by(id=outfit_id, user_id=user_id).first_or_404()
    OutfitItem.query.filter_by(outfit_id=outfit_id).delete()
    db.session.delete(outfit)
    db.session.commit()
    return jsonify({'message': 'deleted'}), 200


@outfit_bp.route('/daily-photo', methods=['POST'])
@jwt_required()
def upload_daily_photo():
    user_id = int(get_jwt_identity())
    date_str = request.form.get('date')
    if not date_str:
        return jsonify({'error': '날짜가 필요합니다'}), 400
    photo_date = date.fromisoformat(date_str)
    image_file = request.files.get('image')
    if not image_file:
        return jsonify({'error': '이미지가 필요합니다'}), 400
    result = cloudinary.uploader.upload(image_file, folder='daily_photos')
    photo_url = result['secure_url']
    existing = DailyPhoto.query.filter_by(user_id=user_id, date=photo_date).first()
    if existing:
        existing.photo_url = photo_url
    else:
        db.session.add(DailyPhoto(user_id=user_id, date=photo_date, photo_url=photo_url))
    db.session.commit()
    return jsonify({'date': date_str, 'photo_url': photo_url}), 200


@outfit_bp.route('/daily-photos', methods=['GET'])
@jwt_required()
def get_daily_photos():
    user_id = int(get_jwt_identity())
    year = int(request.args.get('year', datetime.now().year))
    month = int(request.args.get('month', datetime.now().month))
    from_date = date(year, month, 1)
    to_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    photos = DailyPhoto.query.filter(
        DailyPhoto.user_id == user_id,
        DailyPhoto.date >= from_date,
        DailyPhoto.date < to_date,
    ).all()
    return jsonify({p.date.isoformat(): p.photo_url for p in photos})


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
