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

const CATEGORIES = ['상의', '하의', '아우터', '신발', '가방', '기타'];
const SEASONS = ['봄', '여름', '가을', '겨울'];
const CAL_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

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

  // 착용 기록 슬라이딩 캘린더 상태
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calData, setCalData] = useState({});
  const [selectedWornDate, setSelectedWornDate] = useState(null);
  const [selectedWornItems, setSelectedWornItems] = useState([]);
  const [savingWorn, setSavingWorn] = useState(false);
  const [wornSaved, setWornSaved] = useState(false);

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

  const loadCalData = async (y = calYear, m = calMonth) => {
    const res = await authFetch(`/api/outfit/calendar?year=${y}&month=${m}`);
    if (res.ok) setCalData(await res.json());
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

  // 착용 기록 캘린더 관련
  const toggleCalendar = () => {
    if (!calendarOpen) {
      loadCalData();
    }
    setCalendarOpen(o => !o);
    setSelectedWornDate(null);
    setSelectedWornItems([]);
    setWornSaved(false);
  };

  const calPrevMonth = () => {
    let y = calYear, m = calMonth - 1;
    if (m === 0) { y--; m = 12; }
    setCalYear(y); setCalMonth(m);
    loadCalData(y, m);
  };

  const calNextMonth = () => {
    let y = calYear, m = calMonth + 1;
    if (m === 13) { y++; m = 1; }
    setCalYear(y); setCalMonth(m);
    loadCalData(y, m);
  };

  const calDateKey = (d) =>
    `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayKey = new Date().toISOString().slice(0, 10);

  const toggleWornItem = (id) => {
    if (!selectedWornDate) return;
    setWornSaved(false);
    setSelectedWornItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveWorn = async () => {
    if (!selectedWornDate || selectedWornItems.length === 0) return;
    setSavingWorn(true);
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: selectedWornItems, worn_date: selectedWornDate }),
    });
    setSavingWorn(false);
    if (res.ok) {
      setWornSaved(true);
      setSelectedWornItems([]);
      setSelectedWornDate(null);
      loadCalData();
      loadStats();
      load();
    }
  };

  // 미니 캘린더 셀 계산
  const calFirstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth, 0).getDate();
  const calCells = [];
  for (let i = 0; i < calFirstDay; i++) calCells.push(null);
  for (let d = 1; d <= calDaysInMonth; d++) calCells.push(d);

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

      <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 'calc(100vh - 60px)' }}>

        {/* 슬라이딩 착용 기록 캘린더 패널 */}
        <div style={{
          width: calendarOpen ? 272 : 0,
          overflow: 'hidden',
          transition: 'width 0.35s ease',
          flexShrink: 0,
          borderRight: calendarOpen ? `1px solid ${theme.border}` : 'none',
          background: theme.card,
          minHeight: 'calc(100vh - 60px)',
          boxSizing: 'border-box',
        }}>
          <div style={{ width: 272, padding: '24px 16px', boxSizing: 'border-box' }}>
            {/* 패널 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.primary }}>착용 기록</div>
              <button onClick={toggleCalendar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText, fontSize: 18, padding: '2px 6px' }}>✕</button>
            </div>

            {/* 월 네비게이션 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button onClick={calPrevMonth} style={{ width: 28, height: 28, border: `1px solid ${theme.border}`, borderRadius: 6, background: theme.bg, cursor: 'pointer', color: theme.text, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{calYear}년 {calMonth}월</div>
              <button onClick={calNextMonth} style={{ width: 28, height: 28, border: `1px solid ${theme.border}`, borderRadius: 6, background: theme.bg, cursor: 'pointer', color: theme.text, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
              {CAL_DAYS.map((d, i) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, padding: '2px 0', color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.subText }}>{d}</div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 16 }}>
              {calCells.map((d, idx) => {
                const key = d ? calDateKey(d) : null;
                const isSelected = key === selectedWornDate;
                const isToday = key === todayKey;
                const hasOutfit = key && (calData[key] || []).length > 0;
                const isSun = idx % 7 === 0;
                const isSat = idx % 7 === 6;
                return (
                  <div
                    key={idx}
                    onClick={() => { if (d) { setSelectedWornDate(isSelected ? null : key); setSelectedWornItems([]); setWornSaved(false); } }}
                    style={{
                      height: 34,
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: d ? 'pointer' : 'default',
                      background: isSelected ? theme.primary : isToday ? theme.primary + '18' : 'transparent',
                      border: isToday && !isSelected ? `1.5px solid ${theme.primary}` : '1.5px solid transparent',
                    }}
                  >
                    {d && (
                      <>
                        <div style={{
                          fontSize: 11,
                          fontWeight: isToday ? 700 : 400,
                          color: isSelected ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : theme.text,
                        }}>{d}</div>
                        {hasOutfit && !isSelected && (
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: theme.primary, marginTop: 1 }} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 날짜 선택 상태 안내 */}
            {selectedWornDate ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 6 }}>
                  {selectedWornDate}
                </div>
                <div style={{ fontSize: 11, color: theme.subText, marginBottom: 12, lineHeight: 1.5 }}>
                  오른쪽에서 착용한 옷을 클릭하여 선택하세요
                </div>
                {selectedWornItems.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: theme.text, marginBottom: 8 }}>
                      선택된 옷: <strong style={{ color: theme.primary }}>{selectedWornItems.length}개</strong>
                    </div>
                    <button
                      onClick={handleSaveWorn}
                      disabled={savingWorn}
                      style={{ width: '100%', padding: '9px 0', border: 'none', borderRadius: 8, cursor: 'pointer', background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 4 }}
                    >
                      {savingWorn ? '저장 중...' : '착용 기록 저장'}
                    </button>
                    <button
                      onClick={() => setSelectedWornItems([])}
                      style={{ width: '100%', padding: '7px 0', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: theme.subText, fontSize: 11 }}
                    >
                      선택 초기화
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: theme.subText, textAlign: 'center', padding: '8px 0' }}>
                날짜를 선택하면 옷을 클릭하여 착용 기록을 추가할 수 있어요
              </div>
            )}

            {wornSaved && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#D1FAE5', borderRadius: 8, fontSize: 12, color: '#065F46', fontWeight: 600, textAlign: 'center' }}>
                ✓ 착용 기록이 저장되었습니다
              </div>
            )}
          </div>
        </div>

        {/* 메인 옷장 영역 */}
        <div style={{ flex: 1, minWidth: 0, padding: '32px 24px' }}>

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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              내 옷장 <span style={{ fontSize: 14, color: theme.subText, fontWeight: 400 }}>({clothes.length}개)</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={toggleCalendar}
                style={calendarOpen
                  ? { ...btnPrimary, background: theme.primary + 'cc' }
                  : btnGhost
                }
              >
                {calendarOpen ? '← 닫기' : '착용 기록'}
              </button>
              <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }} style={btnPrimary}>
                + 옷 추가
              </button>
            </div>
          </div>

          {/* 선택 모드 안내 */}
          {calendarOpen && (
            <div style={{
              marginBottom: 16, padding: '10px 16px', borderRadius: 10,
              background: selectedWornDate ? theme.primary + '12' : theme.card,
              border: `1px solid ${selectedWornDate ? theme.primary + '40' : theme.border}`,
              fontSize: 13, color: selectedWornDate ? theme.primary : theme.subText,
              fontWeight: selectedWornDate ? 600 : 400,
            }}>
              {selectedWornDate
                ? `${selectedWornDate} 착용 기록 — 옷을 클릭하여 선택하세요 (${selectedWornItems.length}개 선택됨)`
                : '왼쪽 달력에서 날짜를 선택하세요'
              }
            </div>
          )}

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
          <div style={{
            display: 'grid',
            gridTemplateColumns: calendarOpen ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
          }}>
            {[...clothes].sort((a, b) => getSeasonPriority(a.season) - getSeasonPriority(b.season)).map((item) => {
              const isWornSelected = selectedWornItems.includes(item.id);
              const isSelectable = calendarOpen && !!selectedWornDate;

              return (
                <div
                  key={item.id}
                  onClick={isSelectable ? () => toggleWornItem(item.id) : undefined}
                  style={{
                    background: theme.card,
                    border: `2px solid ${isWornSelected ? theme.primary : theme.border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: isSelectable ? 'pointer' : 'default',
                    transition: 'border-color 0.15s, transform 0.1s',
                    transform: isWornSelected ? 'scale(1.02)' : 'scale(1)',
                    position: 'relative',
                  }}
                >
                  {/* 선택 체크마크 */}
                  {isWornSelected && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8, width: 24, height: 24,
                      borderRadius: '50%', background: theme.primary, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, zIndex: 2,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}>✓</div>
                  )}
                  {/* 선택 모드 dim 오버레이 (미선택) */}
                  {calendarOpen && selectedWornDate && !isWornSelected && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', zIndex: 1,
                      borderRadius: 10,
                    }} />
                  )}

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
                    {!calendarOpen && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={() => handleEdit(item)} style={{ ...btnGhost, padding: '5px 10px', fontSize: 12, flex: 1 }}>수정</button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', fontSize: 12, flex: 1 }}>삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {clothes.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: theme.subText }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
                <div>옷장이 비어있습니다. 옷을 추가해보세요!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 옷 추가/수정 모달 */}
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
