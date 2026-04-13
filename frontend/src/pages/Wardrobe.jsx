import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';

const NAV_LINKS = [
  { to: '/outfit', label: '코디 추천' },
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

const CATEGORIES = ['상의', '하의', '아우터', '신발', '기타'];
const SEASONS = ['봄', '여름', '가을', '겨울'];

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return '봄';
  if (m >= 6 && m <= 8) return '여름';
  if (m >= 9 && m <= 11) return '가을';
  return '겨울';
}

function getSeasonPriority(itemSeason) {
  const cur = getCurrentSeason();
  const order = [cur, ...SEASONS.filter(s => s !== cur)];
  if (!itemSeason) return order.length;
  const seasons = itemSeason.split(',').map(s => s.trim());
  let best = order.length;
  for (const s of seasons) {
    const idx = order.indexOf(s);
    if (idx !== -1 && idx < best) best = idx;
  }
  return best;
}

const emptyForm = { category: '', sub_category: '', color: '', seasons: [], style: '', material: '' };

export default function Wardrobe() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [clothes, setClothes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const load = async (category = activeCategory) => {
    const path = category ? `/api/clothes/?category=${category}` : '/api/clothes/';
    const res = await authFetch(path);
    if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
    setClothes(await res.json());
  };

  const loadStats = async () => {
    const res = await authFetch('/api/outfit/stats');
    if (res.ok) setStats(await res.json());
  };

  useEffect(() => { load(); loadStats(); }, [activeCategory]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSeasonToggle = (season) => {
    const seasons = form.seasons.includes(season)
      ? form.seasons.filter((s) => s !== season)
      : [...form.seasons, season];
    setForm({ ...form, seasons });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const seasonStr = form.seasons.join(',');
    let res;
    if (editingId) {
      res = await authFetch(`/api/clothes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, season: seasonStr }),
      });
    } else {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'seasons') formData.append('season', seasonStr);
        else if (v) formData.append(k, v);
      });
      if (imageFile) formData.append('image', imageFile);
      res = await authFetch('/api/clothes/', { method: 'POST', body: formData });
    }
    if (!res.ok) { setError((await res.json()).error || '오류가 발생했습니다.'); return; }
    setForm(emptyForm);
    setImageFile(null);
    setEditingId(null);
    setShowModal(false);
    load();
    loadStats();
  };

  const handleEdit = (item) => {
    setForm({
      category: item.category || '',
      sub_category: item.sub_category || '',
      color: item.color || '',
      seasons: item.season ? item.season.split(',') : [],
      style: item.style || '',
      material: item.material || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await authFetch(`/api/clothes/${id}`, { method: 'DELETE' });
    load();
    loadStats();
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('ko-KR');
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: `1px solid ${theme.border}`,
    borderRadius: 8, fontSize: 13, background: theme.bg, color: theme.text,
    boxSizing: 'border-box', outline: 'none',
  };

  const btnPrimary = {
    padding: '9px 18px', border: 'none', borderRadius: 8, cursor: 'pointer',
    background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600,
  };

  const btnGhost = {
    padding: '9px 18px', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer',
    background: 'transparent', color: theme.text, fontSize: 13,
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>

      <NavBar links={NAV_LINKS} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* 월간 통계 */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div style={{ background: theme.statA, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 10 }}>최근 3개월 많이 입은 옷 TOP 3</div>
              {stats.most_worn.filter(x => x.count > 0).length === 0
                ? <div style={{ fontSize: 13, color: theme.subText }}>착용 기록 없음</div>
                : stats.most_worn.filter(x => x.count > 0).map((x, i) => (
                  <div key={x.item.id} style={{ fontSize: 13, color: theme.text, padding: '4px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                    <span style={{ fontWeight: 600, color: theme.accent }}>{i + 1}위</span>&nbsp;
                    {x.item.category} {x.item.sub_category || ''} <span style={{ color: theme.subText }}>({x.count}회)</span>
                  </div>
                ))
              }
            </div>
            <div style={{ background: theme.statB, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.secondary, marginBottom: 10 }}>최근 3개월 적게 입은 옷 TOP 3</div>
              {stats.least_worn.length === 0
                ? <div style={{ fontSize: 13, color: theme.subText }}>옷 없음</div>
                : stats.least_worn.map((x, i) => (
                  <div key={x.item.id} style={{ fontSize: 13, color: theme.text, padding: '4px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                    <span style={{ fontWeight: 600, color: theme.secondary }}>{i + 1}위</span>&nbsp;
                    {x.item.category} {x.item.sub_category || ''} <span style={{ color: theme.subText }}>({x.count}회)</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>내 옷장 <span style={{ fontSize: 14, color: theme.subText, fontWeight: 400 }}>({clothes.length}개)</span></h2>
          <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }} style={btnPrimary}>
            + 옷 추가
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['전체', ...CATEGORIES].map((cat) => {
            const active = cat === '전체' ? !activeCategory : activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === '전체' ? '' : cat)}
                style={{
                  padding: '7px 16px', borderRadius: 20, border: `1px solid ${active ? theme.primary : theme.border}`,
                  background: active ? theme.primary : theme.card, color: active ? theme.primaryText : theme.text,
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                }}
              >{cat}</button>
            );
          })}
        </div>

        {/* 의류 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {[...clothes].sort((a, b) => getSeasonPriority(a.season) - getSeasonPriority(b.season)).map((item) => (
            <div key={item.id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.category} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: 150, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText, fontSize: 13 }}>이미지 없음</div>
              }
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{item.category}</div>
                {item.sub_category && <div style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>{item.sub_category}</div>}
                {item.color && <div style={{ fontSize: 12, color: theme.subText }}>{item.color}</div>}
                {item.material && <div style={{ fontSize: 12, color: theme.subText }}>소재: {item.material}</div>}
                {item.season && <div style={{ fontSize: 12, color: theme.accent, marginTop: 2 }}>{item.season}</div>}
                <div style={{ fontSize: 11, color: theme.subText, marginTop: 6 }}>등록: {formatDate(item.created_at)}</div>
                <div style={{ fontSize: 11, color: theme.subText }}>착용: {formatDate(item.last_worn_at)}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => handleEdit(item)} style={{ ...btnGhost, padding: '5px 10px', fontSize: 12, flex: 1 }}>수정</button>
                  <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', fontSize: 12, flex: 1 }}>삭제</button>
                </div>
              </div>
            </div>
          ))}
          {clothes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: theme.subText }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
              <div>옷장이 비어있습니다. 옷을 추가해보세요!</div>
            </div>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: theme.card, padding: 32, borderRadius: 16, width: 360, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', color: theme.text }}>{editingId ? '옷 수정' : '옷 추가'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select name="category" value={form.category} onChange={handleChange} required style={inputStyle}>
                <option value="">카테고리 선택 *</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input name="sub_category" placeholder="세부 종류 (티셔츠, 청바지 등)" value={form.sub_category} onChange={handleChange} style={inputStyle} />
              <input name="color" placeholder="색상" value={form.color} onChange={handleChange} style={inputStyle} />
              <input name="material" placeholder="소재 (면, 폴리에스터 등)" value={form.material} onChange={handleChange} style={inputStyle} />
              <input name="style" placeholder="스타일 (캐주얼, 포멀 등)" value={form.style} onChange={handleChange} style={inputStyle} />
              <div>
                <div style={{ fontSize: 13, color: theme.subText, marginBottom: 8 }}>계절 (복수 선택 가능)</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {SEASONS.map((s) => (
                    <label key={s} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: theme.text }}>
                      <input type="checkbox" checked={form.seasons.includes(s)} onChange={() => handleSeasonToggle(s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              {!editingId && (
                <div>
                  <div style={{ fontSize: 13, color: theme.subText, marginBottom: 6 }}>이미지 (선택)</div>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ fontSize: 13, color: theme.text }} />
                </div>
              )}
              {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" style={{ ...btnPrimary, flex: 1 }}>{editingId ? '수정 완료' : '추가'}</button>
                <button type="button" onClick={() => { setShowModal(false); setError(''); }} style={{ ...btnGhost, flex: 1 }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
