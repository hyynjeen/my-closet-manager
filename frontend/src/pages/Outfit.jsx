import { useState } from 'react';
import { Link } from 'react-router-dom';

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
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recommend = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    const res = await authFetch('/api/outfit/recommend');
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setResult(data);
  };

  const saveOutfit = async () => {
    if (!result) return;
    const { outfit, temperature, weather } = result;
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        top_id: outfit.top?.id || null,
        bottom_id: outfit.bottom?.id || null,
        outer_id: outfit.outer?.id || null,
        shoes_id: outfit.shoes?.id || null,
        temperature,
        weather,
      }),
    });
    if (res.ok) setSaved(true);
  };

  const outfit = result?.outfit || {};
  const items = [
    { label: '아우터', item: outfit.outer },
    { label: '상의', item: outfit.top },
    { label: '하의', item: outfit.bottom },
    { label: '신발', item: outfit.shoes },
  ].filter((e) => e.item);

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>오늘의 코디 추천</h2>
        <Link to="/wardrobe">내 옷장</Link>
      </div>

      {/* 날씨 정보 */}
      {result?.temperature != null && (
        <div style={{ padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          현재 날씨: <strong>{result.weather}</strong> &nbsp;|&nbsp;
          기온: <strong>{result.temperature}°C</strong> &nbsp;|&nbsp;
          계절: <strong>{result.season}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={recommend} disabled={loading}>
          {loading ? '추천 중...' : '코디 추천받기'}
        </button>
        {result && !saved && (
          <button onClick={recommend}>다른 코디 보기</button>
        )}
        {result && !saved && (
          <button onClick={saveOutfit} style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, cursor: 'pointer' }}>
            이 코디 저장
          </button>
        )}
        {saved && <span style={{ color: 'green', lineHeight: '32px' }}>저장 완료!</span>}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ label, item }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8 }}>
              {item.image_url
                ? <img src={item.image_url} alt={label} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                : <div style={{ width: 64, height: 64, background: '#eee', borderRadius: 6, flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
                <div style={{ fontWeight: 'bold' }}>{item.sub_category || item.category}</div>
                {item.color && <div style={{ fontSize: 13, color: '#666' }}>{item.color}</div>}
                {item.style && <div style={{ fontSize: 13, color: '#666' }}>{item.style}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
