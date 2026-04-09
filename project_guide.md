# my-closet-manager 프로젝트 가이드

## 프로젝트 개요

- **목표**: 개인 의류 관리 + 날씨 기반 코디 추천 웹앱
- **Stack**: React.js (frontend) + Flask (backend) + PostgreSQL + Cloudinary + OpenWeatherMap
- **배포 목표**: Render.com

---

## 디렉토리 구조

```
my-closet-manager/
├── backend/                  ← Flask
│   ├── app.py                (서버 진입점)
│   ├── models.py             (DB 테이블 정의)
│   ├── routes/
│   │   ├── auth.py           (로그인/회원가입)
│   │   ├── clothes.py        (의류 CRUD)
│   │   └── outfit.py         (코디 추천)
│   └── requirements.txt
│
└── frontend/                 ← React
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Wardrobe.jsx  (옷장 화면)
    │   │   └── Outfit.jsx    (코디 추천 화면)
    │   └── App.jsx
    └── package.json
```

---

## 현재 구현 상태

### Backend
- **app.py**: Flask 앱 팩토리 패턴, 현재 SQLite 사용 (스펙은 PostgreSQL), JWT 시크릿 하드코딩, blueprint prefix가 `/auth` `/clothes` `/outfit` (스펙은 `/api/auth` `/api/clothes` `/api/outfit`)
- **models.py**: User(username/password_hash), ClothingItem(name/category/color/brand) — 스펙 대비 누락 필드 다수
- **routes/auth.py**: werkzeug로 비밀번호 해싱 (스펙은 flask-bcrypt), username 기반 (스펙은 email)
- **routes/clothes.py**: 기본 CRUD 구현, Cloudinary 업로드 미구현
- **routes/outfit.py**: 랜덤 코디 추천만 구현, 날씨 API/저장 기능 미구현

### Frontend
- **App.jsx**: React Router, PrivateRoute 구현
- **Login.jsx**: username/password 로그인 + 회원가입
- **Wardrobe.jsx**: 옷 목록 테이블, CRUD 폼
- **Outfit.jsx**: 코디 추천받기 버튼, 결과 목록 표시

---

## 스펙 대비 미구현 / 불일치 사항

| # | 항목 | 현재 상태 | 목표 |
|---|------|-----------|------|
| 1 | DB | SQLite | PostgreSQL (`.env` + `DATABASE_URL`) |
| 2 | JWT 시크릿 | 하드코딩 | 환경변수로 변경 |
| 3 | API prefix | `/auth`, `/clothes`, `/outfit` | `/api/auth`, `/api/clothes`, `/api/outfit` |
| 4 | User 모델 | username | email + nickname 필드 추가 |
| 5 | ClothingItem 모델 | name/category/color/brand | sub_category, season, style, image_url 필드 누락 |
| 6 | Outfit 모델 | 없음 | top_id/bottom_id/outer_id/shoes_id/weather/temperature |
| 7 | 이미지 업로드 | 미구현 | Cloudinary 연동 |
| 8 | 날씨 API | 미구현 | OpenWeatherMap 연동 |
| 9 | outfit 저장/조회 API | 미구현 | 구현 필요 |
| 10 | 환경변수 로딩 | 미구현 | python-dotenv 적용 |
