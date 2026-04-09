# my-closet-manager 프로젝트 가이드

## 프로젝트 개요

- **목표**: 개인 의류 관리 + 날씨 기반 코디 추천 웹앱
- **Stack**: React.js (frontend) + Flask (backend) + PostgreSQL + Cloudinary + OpenWeatherMap
- **배포**: Render.com (백엔드) + Vercel (프론트엔드)

---

## 배포 URL

- **프론트엔드**: https://my-closet-manager.vercel.app
- **백엔드**: https://my-closet-backend.onrender.com
- **DB**: Render PostgreSQL (`my-closet-db`, Oregon US West)

---

## 디렉토리 구조

```
my-closet-manager/
├── backend/
│   ├── app.py                (서버 진입점)
│   ├── models.py             (DB 테이블 정의)
│   ├── .python-version       (Python 3.11.9 고정 - psycopg2 호환)
│   ├── .env                  (환경변수 - gitignore 처리됨)
│   ├── .env.example          (환경변수 예시)
│   ├── routes/
│   │   ├── auth.py           (로그인/회원가입)
│   │   ├── clothes.py        (의류 CRUD)
│   │   └── outfit.py         (코디 추천)
│   └── requirements.txt
│
├── frontend/
│   ├── .env                  (REACT_APP_API_URL - gitignore 처리됨)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Wardrobe.jsx
│   │   │   └── Outfit.jsx
│   │   └── App.jsx
│   └── package.json
│
└── render.yaml               (Render 배포 설정)
```

---

## 구현 완료 상태

### Backend
- **app.py**: Flask 앱 팩토리 패턴, `DATABASE_URL` 환경변수 사용 (SQLite fallback), JWT 시크릿 환경변수, API prefix `/api/auth` `/api/clothes` `/api/outfit`, `postgres://` → `postgresql://` 자동 변환 적용
- **models.py**: User(email/password/nickname), ClothingItem(category/sub_category/color/season/style/image_url), Outfit(top_id/bottom_id/outer_id/shoes_id/weather/temperature) 모두 구현
- **routes/auth.py**: flask-bcrypt로 비밀번호 해싱, email 기반 회원가입/로그인, JWT 토큰 발급
- **routes/clothes.py**: CRUD + Cloudinary 이미지 업로드 구현
- **routes/outfit.py**: OpenWeatherMap 날씨 연동, 계절별 코디 추천, outfit 저장/조회 API 구현

### Frontend
- **App.jsx**: React Router, PrivateRoute 구현
- **Login.jsx**: email/password 로그인 + 회원가입 (닉네임 포함)
- **Wardrobe.jsx**: 옷 목록, CRUD 폼
- **Outfit.jsx**: 코디 추천, 결과 표시

---

## 환경변수

### backend/.env (로컬용 - External DB URL 사용)
```
DATABASE_URL=postgresql://...  ← Render External URL
JWT_SECRET_KEY=...
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENWEATHER_API_KEY=...
```

### Render 환경변수 (배포용 - Internal DB URL 사용)
- `DATABASE_URL` = Internal Database URL (Render 내부 통신용)
- `JWT_SECRET_KEY`
- `OPENWEATHER_API_KEY`

### frontend/.env (로컬용)
```
REACT_APP_API_URL=https://my-closet-backend.onrender.com
```

### Vercel 환경변수
- `REACT_APP_API_URL` = `https://my-closet-backend.onrender.com`

---

## DB 접속 방법 (데이터 확인)

```bash
psql "postgresql://my_closet_db_user:...@dpg-d7bl6gc50q8c73fbak40-a.oregon-postgres.render.com/my_closet_db"
```

접속 후:
```sql
SELECT id, email, nickname, password FROM users;
```

비밀번호는 `$2b$12$...` 형태로 bcrypt 암호화되어 저장됨.

---

## 미구현 사항

없음 — 전체 기능 구현 완료

---

## 발표 시연 순서 (2026-04-14)

1. `https://my-closet-manager.vercel.app/login` 접속 → 클라우드 배포 확인
2. 회원가입 → 로그인 → 로그인 기능 시연
3. psql로 DB 접속 → `SELECT` 쿼리 → `$2b$12$...` 형태 비밀번호 확인 → bcrypt 암호화 적용 증명
4. `backend/routes/auth.py` 24번째 줄 `bcrypt.generate_password_hash()` 코드 설명
