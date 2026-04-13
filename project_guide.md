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
│   │   ├── clothes.py        (의류 CRUD + Cloudinary)
│   │   └── outfit.py         (코디 추천/저장/통계)
│   └── requirements.txt
│
├── frontend/
│   ├── .env                  (REACT_APP_API_URL - gitignore 처리됨)
│   ├── src/
│   │   ├── themes.js         (4가지 테마 색상 정의)
│   │   ├── ThemeContext.jsx  (테마 전역 상태 관리)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Wardrobe.jsx
│   │   │   ├── Outfit.jsx
│   │   │   └── Calendar.jsx  (구현 예정)
│   │   └── App.jsx
│   └── package.json
│
└── render.yaml               (Render 배포 설정)
```

---

## 구현 완료 상태

### Backend
- **app.py**: Flask 앱 팩토리 패턴, `DATABASE_URL` 환경변수 (SQLite fallback), JWT 환경변수, API prefix `/api/auth` `/api/clothes` `/api/outfit`, `postgres://` → `postgresql://` 자동 변환
- **models.py**:
  - `User`: email / password(bcrypt) / nickname
  - `ClothingItem`: category / sub_category / color / season(복수, 쉼표구분) / style / material / image_url / created_at / last_worn_at
  - `Outfit`: top_id / bottom_id / outer_id / shoes_id / weather / temperature / worn_date(추가 예정) / created_at
- **routes/auth.py**: flask-bcrypt 비밀번호 해싱, email 기반 회원가입/로그인, JWT 발급
- **routes/clothes.py**: CRUD + Cloudinary 이미지 업로드
- **routes/outfit.py**: OpenWeatherMap 날씨 연동, 계절별 코디 추천, outfit 저장 시 last_worn_at 업데이트, 월간 통계 API (`/stats`)

### Frontend
- **themes.js**: 기본 / 원목 / 다크 / 빈티지 4가지 테마
- **ThemeContext.jsx**: 테마 전역 관리, localStorage 유지
- **Login.jsx**: 로그인/회원가입 탭, 테마 선택 UI
- **Wardrobe.jsx**: 옷 목록(카드 그리드), CRUD 모달, 카테고리 탭, 계절 복수 선택, 소재 입력, 등록일/착용일 표시, 월간 통계 카드, 네비게이션 + 테마 선택
- **Outfit.jsx**: 날씨 카드, 코디 추천/저장, 네비게이션 + 테마 선택

---

## DB 컬럼 변경 이력 (psql로 직접 적용)

```sql
ALTER TABLE clothes ADD COLUMN material VARCHAR(50);
ALTER TABLE clothes ALTER COLUMN season TYPE VARCHAR(100);
ALTER TABLE clothes ADD COLUMN last_worn_at TIMESTAMP;
-- 아래는 달력 기능 구현 시 추가 예정
ALTER TABLE outfits ADD COLUMN worn_date DATE;
```

---

## 환경변수

### backend/.env (로컬용 - External DB URL)
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENWEATHER_API_KEY=...
```

### Render 환경변수 (배포용 - Internal DB URL)
- `DATABASE_URL` = Internal Database URL
- `JWT_SECRET_KEY`
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- `OPENWEATHER_API_KEY`

### Vercel 환경변수
- `REACT_APP_API_URL` = `https://my-closet-backend.onrender.com`

---

## DB 접속 방법

```bash
psql "postgresql://my_closet_db_user:...@dpg-d7bl6gc50q8c73fbak40-a.oregon-postgres.render.com/my_closet_db"
```

```sql
SELECT id, email, nickname, password FROM users;
```

비밀번호는 `$2b$12$...` 형태로 bcrypt 암호화 저장됨.

---

## 미구현 / 진행 예정

| # | 항목 | 비고 |
|---|------|------|
| 1 | 달력 기반 착용 기록 | Calendar.jsx 신규, worn_date DB 추가 필요 |
| 2 | UI 개선 | 현재 작업 중 |
| 3 | AI 코디 추천 | Claude API 활용, 착용 기록 학습 (장기 과제) |

---

## 발표 시연 순서 (2026-04-14)

1. `https://my-closet-manager.vercel.app/login` 접속 → 클라우드 배포 확인
2. 회원가입 → 로그인 → 로그인 기능 시연
3. psql로 DB 접속 → `SELECT` 쿼리 → `$2b$12$...` 비밀번호 확인 → bcrypt 암호화 증명
4. `backend/routes/auth.py` 24번째 줄 `bcrypt.generate_password_hash()` 코드 설명
