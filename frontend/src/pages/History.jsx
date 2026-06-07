import { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';

const NAV_LINKS = [
  { to: '/wardrobe', label: '내 옷장' },
  { to: '/outfit', label: '코디 추천' },
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

export default function History() {
  const { theme } = useTheme();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/outfit/saved')
      .then(r => r.json())
      .then(data => { setOutfits(data); setLoading(false); });
  }, []);

  const grouped = outfits.reduce((acc, o) => {
    const key = o.worn_date || o.created_at?.slice(0, 10) || '날짜 없음';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const getItems = (o) => {
    if (o.outfit_items?.length > 0) return o.outfit_items.map(oi => oi.item).filter(Boolean);
    return [o.top, o.bottom, o.outer, o.shoes].filter(Boolean);
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <NavBar links={NAV_LINKS} />
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '36px 24px' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800 }}>코디 히스토리</h2>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: theme.subText }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{
              width: 40, height: 40, border: `3px solid ${theme.border}`,
              borderTopColor: theme.primary, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 14px',
            }} />
            불러오는 중...
          </div>
        )}

        {!loading && outfits.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '64px 0',
            background: theme.card, borderRadius: 16, border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👔</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 6 }}>저장된 코디가 없어요</div>
            <div style={{ fontSize: 13, color: theme.subText }}>코디 추천 후 오늘 착용 기록을 눌러보세요</div>
          </div>
        )}

        {Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayOutfits]) => (
            <div key={date} style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: theme.subText,
                letterSpacing: '0.3px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>{date}</span>
                <div style={{ flex: 1, height: 1, background: theme.border }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dayOutfits.map(outfit => {
                  const items = getItems(outfit);
                  return (
                    <div key={outfit.id} style={{
                      background: theme.card, border: `1px solid ${theme.border}`,
                      borderRadius: 16, overflow: 'hidden',
                    }}>
                      {outfit.temperature != null && (
                        <div style={{
                          padding: '10px 16px', background: theme.primary + '12',
                          borderBottom: `1px solid ${theme.border}`,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: theme.primary }}>{outfit.temperature}°C</span>
                          {outfit.weather && <span style={{ fontSize: 12, color: theme.subText }}>{outfit.weather}</span>}
                        </div>
                      )}
                      {items.length > 0 ? (
                        <div style={{ display: 'flex', overflowX: 'auto', padding: '12px', gap: 10 }}>
                          {items.map((item, i) => (
                            <div key={i} style={{ flexShrink: 0, textAlign: 'center' }}>
                              {item.image_url
                                ? <img src={item.image_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                                : <div style={{
                                  width: 72, height: 72, borderRadius: 10,
                                  background: theme.primary + '18',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, color: theme.primary,
                                }}>{(item.sub_category || item.category || '').slice(0, 3)}</div>
                              }
                              <div style={{ fontSize: 10, color: theme.subText, marginTop: 4, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.color} {item.sub_category || item.category}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '16px', fontSize: 13, color: theme.subText }}>아이템 정보 없음</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
