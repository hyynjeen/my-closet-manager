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

const getWeatherEmoji = (weather) => {
  if (!weather) return '🌤️';
  const w = weather.toLowerCase();
  if (w.includes('맑') || w.includes('clear') || w.includes('sunny')) return '☀️';
  if (w.includes('구름') || w.includes('cloud')) return '⛅';
  if (w.includes('비') || w.includes('rain') || w.includes('drizzle')) return '🌧️';
  if (w.includes('눈') || w.includes('snow')) return '❄️';
  if (w.includes('안개') || w.includes('fog') || w.includes('mist') || w.includes('haze')) return '🌫️';
  if (w.includes('천둥') || w.includes('thunder')) return '⛈️';
  if (w.includes('바람') || w.includes('wind')) return '💨';
  return '🌤️';
};

const getWeatherAdvice = (temp) => {
  if (temp == null) return null;
  if (temp <= 0) return '패딩·두꺼운 코트 필수, 방한 용품 챙기세요';
  if (temp <= 5) return '두꺼운 외투와 목도리를 꼭 챙기세요';
  if (temp <= 10) return '코트나 두꺼운 자켓이 필요해요';
  if (temp <= 15) return '가디건이나 재킷이 딱 좋아요';
  if (temp <= 20) return '얇은 겉옷 하나면 충분해요';
  if (temp <= 25) return '가볍게 입어도 좋은 날씨예요';
  if (temp <= 30) return '반팔이 딱 좋은 날씨예요';
  return '시원한 소재의 옷을 추천해요';
};

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

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '36px 24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>오늘의 코디 추천</h2>

        {/* 날씨 카드 */}
        {result?.temperature != null && (
          <div style={{
            background: `linear-gradient(145deg, ${theme.primary}1A 0%, ${theme.accent}12 100%)`,
            border: `1px solid ${theme.primary}2A`,
            borderRadius: 20,
            padding: '20px 22px',
            marginBottom: 24,
          }}>
            {/* 상단: 날씨 아이콘 + 현재 기온 + 날씨 상태 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: theme.primary + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, flexShrink: 0,
              }}>
                {getWeatherEmoji(result.weather)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: theme.subText, letterSpacing: '0.5px', marginBottom: 2 }}>현재 기온</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: theme.primary, lineHeight: 1 }}>
                    {Math.round(result.temperature)}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: theme.primary }}>°C</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{result.weather}</div>
                <div style={{ fontSize: 11, color: theme.subText, marginTop: 4 }}>Seoul</div>
              </div>
            </div>

            {/* 구분선 */}
            <div style={{ height: 1, background: theme.primary + '18', marginBottom: 14 }} />

            {/* 하단: 최고 / 최저 / 일교차 3분할 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{
                textAlign: 'center', padding: '10px 0',
                background: '#EF444410', borderRadius: 12,
                border: '1px solid #EF444422',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', marginBottom: 4, letterSpacing: '0.3px' }}>최고</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444' }}>
                  {result.temp_max != null ? `${Math.round(result.temp_max)}°` : '--'}
                </div>
              </div>
              <div style={{
                textAlign: 'center', padding: '10px 0',
                background: '#3B82F610', borderRadius: 12,
                border: '1px solid #3B82F622',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', marginBottom: 4, letterSpacing: '0.3px' }}>최저</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
                  {result.temp_min != null ? `${Math.round(result.temp_min)}°` : '--'}
                </div>
              </div>
              <div style={{
                textAlign: 'center', padding: '10px 0',
                background: theme.primary + '10', borderRadius: 12,
                border: `1px solid ${theme.primary}22`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.primary, marginBottom: 4, letterSpacing: '0.3px' }}>일교차</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.primary }}>
                  {result.temp_max != null && result.temp_min != null
                    ? `${Math.round(result.temp_max - result.temp_min)}°`
                    : '--'}
                </div>
              </div>
            </div>

            {/* 옷 조언 */}
            {getWeatherAdvice(result.temperature) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12,
                background: theme.card, border: `1px solid ${theme.border}`,
              }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <span style={{ fontSize: 12, color: theme.subText, fontWeight: 500 }}>
                  {getWeatherAdvice(result.temperature)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={recommend} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? '추천 중...' : result ? '다시 추천받기' : '코디 추천받기'}
          </button>
          {result && (
            <>
              <button
                onClick={() => setLiked(l => !l)}
                style={{
                  padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `1px solid #EF4444`,
                  background: liked ? '#EF4444' : 'transparent',
                  color: liked ? '#FFFFFF' : '#EF4444',
                  transition: 'all 0.2s',
                }}
              >
                {liked ? '♥ 좋아요' : '♡ 좋아요'}
              </button>
              {!saved ? (
                <button onClick={saveOutfit} style={{ ...btnPrimary, background: '#10B981' }}>
                  오늘 착용 기록
                </button>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: 8,
                  background: '#D1FAE5', color: '#065F46',
                  fontWeight: 600, fontSize: 14,
                }}>
                  ✓ 착용 기록 완료
                </div>
              )}
            </>
          )}
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>}

        {/* 코디 목록 */}
        {items.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.subText, marginBottom: 12, letterSpacing: '0.3px' }}>
              오늘의 추천 코디 · {items.length}개
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(({ label, item }) => (
                <div key={label} style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                  overflow: 'hidden',
                  transition: 'box-shadow 0.15s',
                }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={label} style={{ width: 84, height: 84, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 84, height: 84, background: theme.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText, fontSize: 12 }}>없음</div>
                  }
                  <div style={{ padding: '12px 16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'inline-block',
                      fontSize: 10, fontWeight: 700,
                      color: theme.primary, background: theme.primary + '18',
                      borderRadius: 6, padding: '2px 8px', marginBottom: 6,
                      letterSpacing: '0.3px',
                    }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>{item.sub_category || item.category}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {item.color && (
                        <span style={{ fontSize: 12, color: theme.subText }}>{item.color}</span>
                      )}
                      {item.material && (
                        <span style={{ fontSize: 12, color: theme.subText }}>· {item.material}</span>
                      )}
                      {item.style && (
                        <span style={{ fontSize: 12, color: theme.accent, fontWeight: 600 }}>· {item.style}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 퍼스널 컬러 추천 */}
        {result?.recommended_colors?.length > 0 && (
          <div style={{
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 14,
            padding: '16px 20px',
            marginTop: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>🎨</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{result.personal_color} 추천 색상</div>
                <div style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>퍼스널 컬러에 어울리는 색상이에요</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.recommended_colors.map((color) => (
                <span key={color} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: theme.primary + '18', color: theme.primary,
                  border: `1px solid ${theme.primary}33`,
                }}>{color}</span>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{
            textAlign: 'center', padding: '64px 0', color: theme.subText,
            background: theme.card, borderRadius: 16, border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌤️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 6 }}>오늘 뭐 입을까요?</div>
            <div style={{ fontSize: 13 }}>버튼을 눌러 날씨에 맞는 코디를 추천받아보세요</div>
          </div>
        )}
      </div>
    </div>
  );
}
