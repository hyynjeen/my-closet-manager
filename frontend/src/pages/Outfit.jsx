import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';

const NAV_LINKS = [
  { to: '/wardrobe', label: '내 옷장' },
  { to: '/calendar', label: '착용 기록' },
];

const API_URL = process.env.REACT_APP_API_URL || '';

const authFetch = (path, options = {}) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...options.headers,
    },
  });

export default function Outfit() {
  const { theme } = useTheme();
  const [result, setResult] = useState(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recommend = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    setLiked(false);
    const res = await authFetch('/api/outfit/recommend');
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setResult(data);
  };

  const saveOutfit = async () => {
    if (!result) return;
    const { outfit, temperature, weather } = result;
    const item_ids = [
      outfit.top?.id,
      outfit.bottom?.id,
      outfit.outer?.id,
      outfit.shoes?.id,
      outfit.bag?.id,
    ].filter(Boolean);
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids, temperature, weather }),
    });
    if (res.ok) setSaved(true);
  };

  const outfit = result?.outfit || {};
  const items = [
    { label: '아우터', item: outfit.outer },
    { label: '상의', item: outfit.top },
    { label: '하의', item: outfit.bottom },
    { label: '신발', item: outfit.shoes },
    { label: '가방', item: outfit.bag },
    { label: '악세서리', item: outfit.accessory },
  ].filter((e) => e.item);

  const btnPrimary = {
    padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
    background: theme.primary, color: theme.primaryText, fontSize: 14, fontWeight: 600,
  };

  const btnGhost = {
    padding: '10px 20px', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer',
    background: 'transparent', color: theme.text, fontSize: 14,
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>

      <NavBar links={NAV_LINKS} />

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700 }}>오늘의 코디 추천</h2>

        {/* 날씨 카드 */}
        {result?.temperature != null && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: theme.subText, marginBottom: 4 }}>현재 기온</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: theme.primary }}>{result.temperature}°C</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: theme.subText, marginBottom: 4 }}>최고 / 최저</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                {result.temp_max != null ? `${result.temp_max}°` : '-'} / {result.temp_min != null ? `${result.temp_min}°` : '-'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: theme.subText, marginBottom: 4 }}>날씨</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{result.weather}</div>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={recommend} disabled={loading} style={btnPrimary}>
            {loading ? '추천 중...' : '코디 추천받기'}
          </button>
          {result && (
            <button onClick={recommend} style={btnGhost}>다른 코디 보기</button>
          )}
          {result && (
            <button
              onClick={() => setLiked(l => !l)}
              style={{
                padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                border: `1px solid #EF4444`,
                background: liked ? '#EF4444' : 'transparent',
                color: liked ? '#FFFFFF' : '#EF4444',
                transition: 'all 0.2s',
              }}
            >
              {liked ? '♥ 좋아요' : '♡ 좋아요'}
            </button>
          )}
          {result && !saved && (
            <button onClick={saveOutfit} style={{ ...btnPrimary, background: '#10B981' }}>
              오늘 착용
            </button>
          )}
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontWeight: 600, fontSize: 14 }}>
              ✓ 착용 기록 완료
            </div>
          )}
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>}

        {/* 코디 목록 */}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(({ label, item }) => (
              <div key={label} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={label} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  : <div style={{ width: 72, height: 72, background: theme.bg, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText, fontSize: 12 }}>없음</div>
                }
                <div>
                  <div style={{ fontSize: 12, color: theme.subText, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>{item.sub_category || item.category}</div>
                  {item.color && <div style={{ fontSize: 13, color: theme.subText }}>{item.color}</div>}
                  {item.material && <div style={{ fontSize: 12, color: theme.subText }}>소재: {item.material}</div>}
                  {item.style && <div style={{ fontSize: 12, color: theme.accent }}>{item.style}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 퍼스널 컬러 추천 */}
        {result?.recommended_colors?.length > 0 && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px', marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>
              {result.personal_color} 추천 색상
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.recommended_colors.map((color) => (
                <span key={color} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: theme.primary + '18', color: theme.primary, border: `1px solid ${theme.primary}33`,
                }}>{color}</span>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: theme.subText }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌤️</div>
            <div>버튼을 눌러 오늘의 코디를 추천받아보세요!</div>
          </div>
        )}
      </div>
    </div>
  );
}
