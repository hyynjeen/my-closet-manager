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

  // ── 옷장 상태 ──────────────────────────────
  const [clothes, setClothes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  // ── 슬라이딩 캘린더 상태 ──────────────────
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calData, setCalData] = useState({});
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [calHoveredDate, setCalHoveredDate] = useState(null);
  const [calClothes, setCalClothes] = useState([]);

  // 착용 추가 모드 (옷장 카드 클릭 선택)
  const [addMode, setAddMode] = useState(false);
  const [addItems, setAddItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // 코디 수정 모드
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [editingItems, setEditingItems] = useState([]);

  // ── 데이터 로드 ────────────────────────────
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

  const loadCalClothes = async () => {
    if (calClothes.length > 0) return;
    const res = await authFetch('/api/clothes/');
    if (res.ok) setCalClothes(await res.json());
  };

  useEffect(() => { load(); loadStats(); }, [activeCategory]);

  // ── 옷장 CRUD ──────────────────────────────
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSeasonToggle = (s) => {
    const seasons = form.seasons.includes(s)
      ? form.seasons.filter(x => x !== s)
      : [...form.seasons, s];
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
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'seasons') fd.append('season', seasonStr);
        else if (v) fd.append(k, v);
      });
      if (imageFile) fd.append('image', imageFile);
      res = await authFetch('/api/clothes/', { method: 'POST', body: fd });
    }
    if (!res.ok) { setError((await res.json()).error || '오류 발생'); return; }
    setForm(emptyForm); setImageFile(null); setEditingId(null); setShowModal(false);
    load(); loadStats();
  };

  const handleEdit = (item) => {
    setForm({ category: item.category || '', sub_category: item.sub_category || '', color: item.color || '', seasons: item.season ? item.season.split(',') : [], style: item.style || '', material: item.material || '' });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await authFetch(`/api/clothes/${id}`, { method: 'DELETE' });
    load(); loadStats();
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ko-KR') : '-';

  // ── 캘린더 패널 제어 ──────────────────────
  const toggleCalendar = () => {
    if (!calendarOpen) loadCalData();
    setCalendarOpen(o => !o);
    setCalSelectedDate(null);
    setAddMode(false);
    setAddItems([]);
    setEditingOutfitId(null);
    setEditingItems([]);
  };

  const calPrevMonth = () => {
    let y = calYear, m = calMonth - 1;
    if (m === 0) { y--; m = 12; }
    setCalYear(y); setCalMonth(m); loadCalData(y, m);
  };

  const calNextMonth = () => {
    let y = calYear, m = calMonth + 1;
    if (m === 13) { y++; m = 1; }
    setCalYear(y); setCalMonth(m); loadCalData(y, m);
  };

  const calDateKey = (d) =>
    `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  const handleCalDateClick = (d) => {
    if (!d) return;
    const key = calDateKey(d);
    setCalSelectedDate(prev => prev === key ? null : key);
    setAddMode(false); setAddItems([]);
    setEditingOutfitId(null); setEditingItems([]);
  };

  // 착용 추가
  const handleStartAdd = () => {
    setAddMode(true); setAddItems([]);
    setEditingOutfitId(null);
  };

  const toggleAddItem = (id) => {
    setAddItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveAdd = async () => {
    if (!calSelectedDate || addItems.length === 0) return;
    setSaving(true);
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: addItems, worn_date: calSelectedDate }),
    });
    setSaving(false);
    if (res.ok) {
      setAddMode(false); setAddItems([]);
      loadCalData(); loadStats(); load();
    }
  };

  // 코디 수정
  const handleStartEdit = async (outfit) => {
    setEditingOutfitId(outfit.id);
    setEditingItems((outfit.items || []).map(i => i.id));
    setAddMode(false); setAddItems([]);
    await loadCalClothes();
  };

  const handleSaveEdit = async () => {
    const res = await authFetch(`/api/outfit/${editingOutfitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: editingItems }),
    });
    if (res.ok) { setEditingOutfitId(null); setEditingItems([]); loadCalData(); }
  };

  // 달력 셀
  const calFirstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth, 0).getDate();
  const calCells = [];
  for (let i = 0; i < calFirstDay; i++) calCells.push(null);
  for (let d = 1; d <= calDaysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const getMiniThumbs = (outfits) => {
    if (!outfits.length) return [];
    const items = outfits.flatMap(o =>
      (o.items?.length ? o.items : [o.top, o.bottom, o.outer, o.shoes].filter(Boolean))
    );
    return items.slice(0, 4).map(i => i.image_url).filter(Boolean);
  };

  const getThumb = (outfits) => {
    if (!outfits.length) return null;
    const o = outfits[0];
    return o.items?.[0]?.image_url || o.top?.image_url || o.outer?.image_url || null;
  };

  const selectedOutfits = calSelectedDate ? (calData[calSelectedDate] || []) : [];
  const alreadyWornIds = new Set(selectedOutfits.flatMap(o => (o.items || []).map(i => i.id)));

  // ── 스타일 ────────────────────────────────
  const inputStyle = { width: '100%', padding: '9px 12px', border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box', outline: 'none' };
  const btnPrimary = { padding: '9px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600 };
  const btnGhost = { padding: '9px 18px', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: theme.text, fontSize: 13 };
  const btnSm = { padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 12, fontWeight: 600 };
  const btnSmGhost = { padding: '6px 14px', border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer', background: 'transparent', color: theme.text, fontSize: 12 };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, overflowX: 'hidden' }}>
      <NavBar links={NAV_LINKS} />

      {/* ── 전체 레이아웃: 캘린더 패널 + 옷장 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* ━━━ 슬라이딩 캘린더 패널 (전체 화면 - 옷장 폭) ━━━ */}
        <div style={{
          width: calendarOpen ? 'calc(100vw - 380px)' : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.4s ease',
          borderRight: calendarOpen ? `1px solid ${theme.border}` : 'none',
          background: theme.bg,
          minHeight: 'calc(100vh - 60px)',
        }}>
          {/* 내부 콘텐츠 — 패널 전체 폭 고정 (애니메이션 중에도 레이아웃 유지) */}
          <div style={{ width: 'calc(100vw - 380px)', padding: '32px 28px', boxSizing: 'border-box' }}>

            {/* 월 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button onClick={calPrevMonth} style={{ width: 38, height: 38, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.card, cursor: 'pointer', fontSize: 20, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{calYear}년 {calMonth}월</div>
                <div style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>
                  이번 달 착용 기록: {Object.values(calData).flat().length}회
                  {addMode && <span style={{ color: theme.primary, fontWeight: 600 }}> · 오른쪽에서 옷을 선택하세요 ({addItems.length}개)</span>}
                </div>
              </div>
              <button onClick={calNextMonth} style={{ width: 38, height: 38, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.card, cursor: 'pointer', fontSize: 20, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>

            {/* 달력 + 사이드 패널 */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

              {/* 달력 그리드 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 요일 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8, background: theme.card, borderRadius: 10, padding: '10px 0', border: `1px solid ${theme.border}` }}>
                  {CAL_DAYS.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.subText }}>{d}</div>
                  ))}
                </div>

                {/* 날짜 셀 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                  {calCells.map((d, idx) => {
                    const key = d ? calDateKey(d) : null;
                    const outfits = key ? (calData[key] || []) : [];
                    const isSelected = key === calSelectedDate;
                    const isToday = key === todayKey;
                    const isHovered = d === calHoveredDate;
                    const isSun = idx % 7 === 0;
                    const isSat = idx % 7 === 6;
                    const hasOutfit = outfits.length > 0;
                    const thumb = getThumb(outfits);
                    const miniThumbs = getMiniThumbs(outfits);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleCalDateClick(d)}
                        onMouseEnter={() => d && setCalHoveredDate(d)}
                        onMouseLeave={() => setCalHoveredDate(null)}
                        style={{
                          height: 96,
                          border: `1.5px solid ${isSelected ? theme.primary : isToday ? theme.accent : theme.border}`,
                          borderRadius: 10,
                          padding: '7px',
                          overflow: 'hidden',
                          cursor: d ? 'pointer' : 'default',
                          background: isSelected ? theme.primary + '15' : isHovered && d ? theme.primary + '08' : theme.card,
                          boxSizing: 'border-box',
                          transition: 'all 0.15s',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {d && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: isToday ? 700 : 400,
                                background: isToday ? theme.primary : 'transparent',
                                color: isToday ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : theme.text,
                              }}>{d}</div>
                              {outfits.length > 1 && (
                                <div style={{ fontSize: 10, fontWeight: 700, color: theme.primary, background: theme.primary + '20', borderRadius: 6, padding: '1px 5px' }}>
                                  {outfits.length}
                                </div>
                              )}
                            </div>

                            {hasOutfit && (
                              miniThumbs.length > 1 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 2 }}>
                                  {miniThumbs.slice(0, 4).map((url, i) => (
                                    <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4 }} />
                                  ))}
                                </div>
                              ) : thumb ? (
                                <img src={thumb} alt="" style={{ width: '100%', height: 46, objectFit: 'cover', borderRadius: 6, marginTop: 2 }} />
                              ) : (
                                <div style={{ width: '100%', height: 6, borderRadius: 4, marginTop: 6, background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />
                              )
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: theme.subText }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: theme.primary }} /> 오늘
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 20, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} /> 착용 기록
                  </div>
                </div>
              </div>

              {/* 날짜 상세 사이드 패널 */}
              {calSelectedDate && (
                <div style={{ width: 260, flexShrink: 0 }}>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: 'hidden' }}>
                    {/* 날짜 헤더 */}
                    <div style={{ padding: '16px 20px', background: theme.primary, color: '#fff' }}>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>{calSelectedDate}</div>
                      <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                        {selectedOutfits.length > 0 ? `${selectedOutfits.length}개 코디 기록` : '기록 없음'}
                      </div>
                    </div>

                    <div style={{ padding: 16 }}>
                      {/* 기존 코디 목록 */}
                      {selectedOutfits.length === 0 ? (
                        <div style={{ fontSize: 13, color: theme.subText, textAlign: 'center', padding: '12px 0', marginBottom: 8 }}>아직 코디 기록이 없어요</div>
                      ) : (
                        selectedOutfits.map((o, oi) => (
                          <div key={o.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: oi < selectedOutfits.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                            {editingOutfitId === o.id ? (
                              /* 수정 모드 */
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>
                                  착용 코디 수정 <span style={{ fontWeight: 400, color: theme.subText }}>({editingItems.length}개)</span>
                                </div>
                                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {['상의', '하의', '아우터', '신발', '가방', '기타'].map(cat => {
                                    const catItems = calClothes.filter(c => c.category === cat);
                                    if (!catItems.length) return null;
                                    return (
                                      <div key={cat}>
                                        <div style={{ fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 3 }}>{cat}</div>
                                        {catItems.map(c => (
                                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={editingItems.includes(c.id)} onChange={() => setEditingItems(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id])} style={{ accentColor: theme.primary, width: 14, height: 14 }} />
                                            {c.image_url && <img src={c.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />}
                                            <span style={{ fontSize: 12, color: theme.text }}>{c.sub_category || c.category}{c.color ? ` · ${c.color}` : ''}</span>
                                          </label>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                  <button onClick={handleSaveEdit} disabled={editingItems.length === 0} style={{ ...btnSm, flex: 1, opacity: editingItems.length === 0 ? 0.5 : 1 }}>저장</button>
                                  <button onClick={() => { setEditingOutfitId(null); setEditingItems([]); }} style={{ ...btnSmGhost, flex: 1 }}>취소</button>
                                </div>
                              </div>
                            ) : (
                              /* 일반 보기 */
                              <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 6 }}>
                                  {(o.items || []).slice(0, 4).map(item => (
                                    <div key={item.id} style={{ position: 'relative' }}>
                                      {item.image_url
                                        ? <img src={item.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />
                                        : <div style={{ width: '100%', aspectRatio: '1', background: theme.bg, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: 9, color: theme.subText }}>{item.category}</span>
                                          </div>
                                      }
                                      <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, background: 'rgba(0,0,0,0.5)', borderRadius: 3, fontSize: 8, color: '#fff', textAlign: 'center' }}>
                                        {item.sub_category || item.category}
                                      </div>
                                    </div>
                                  ))}
                                  {(o.items || []).length > 4 && (
                                    <div style={{ width: '100%', aspectRatio: '1', background: theme.border, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: theme.subText }}>
                                      +{(o.items || []).length - 4}
                                    </div>
                                  )}
                                </div>
                                {o.temperature != null && <div style={{ fontSize: 11, color: theme.subText, marginBottom: 6 }}>{o.temperature}°C · {o.weather}</div>}
                                <button onClick={() => handleStartEdit(o)} style={{ ...btnSmGhost, fontSize: 11, padding: '4px 10px' }}>수정</button>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* 착용 추가 버튼 / 저장 */}
                      {addMode ? (
                        <div>
                          <div style={{ fontSize: 12, color: theme.primary, fontWeight: 600, marginBottom: 8 }}>
                            오른쪽 옷장에서 옷을 선택하세요
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleSaveAdd} disabled={addItems.length === 0 || saving} style={{ ...btnSm, flex: 1, background: '#10B981', opacity: addItems.length === 0 ? 0.5 : 1, cursor: addItems.length === 0 ? 'not-allowed' : 'pointer' }}>
                              {saving ? '저장 중...' : `저장 (${addItems.length}개)`}
                            </button>
                            <button onClick={() => { setAddMode(false); setAddItems([]); }} style={{ ...btnSmGhost, flex: 1 }}>취소</button>
                          </div>
                        </div>
                      ) : !editingOutfitId && (
                        <button onClick={handleStartAdd} style={{ width: '100%', padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600 }}>
                          + 착용 추가
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ━━━ 옷장 영역 ━━━ */}
        <div style={{
          width: calendarOpen ? 380 : '100%',
          flexShrink: 0,
          transition: 'width 0.4s ease',
          minHeight: 'calc(100vh - 60px)',
          borderLeft: calendarOpen ? 'none' : 'none',
        }}>
          <div style={{
            maxWidth: calendarOpen ? 380 : 900,
            margin: '0 auto',
            padding: '32px 24px',
          }}>

            {/* 통계 (사진 포함) */}
            {stats && !calendarOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div style={{ background: theme.statA, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 10 }}>최근 3개월 많이 입은 옷 TOP 3</div>
                  {stats.most_worn.filter(x => x.count > 0).length === 0
                    ? <div style={{ fontSize: 13, color: theme.subText }}>착용 기록 없음</div>
                    : stats.most_worn.filter(x => x.count > 0).map((x, i) => (
                      <div key={x.item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                        <div style={{ flexShrink: 0 }}>
                          {x.item.image_url
                            ? <img src={x.item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                            : <div style={{ width: 40, height: 40, borderRadius: 8, background: theme.primary + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: theme.primary, fontWeight: 700 }}>{(x.item.sub_category || x.item.category || '?').slice(0, 2)}</div>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: theme.accent, marginRight: 4 }}>{i + 1}위</span>{x.item.sub_category || x.item.category}
                          </div>
                          <div style={{ fontSize: 11, color: theme.subText }}>{x.count}회 착용</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div style={{ background: theme.statB, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.secondary, marginBottom: 10 }}>최근 3개월 적게 입은 옷 TOP 3</div>
                  {stats.least_worn.length === 0
                    ? <div style={{ fontSize: 13, color: theme.subText }}>옷 없음</div>
                    : stats.least_worn.map((x, i) => (
                      <div key={x.item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                        <div style={{ flexShrink: 0 }}>
                          {x.item.image_url
                            ? <img src={x.item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                            : <div style={{ width: 40, height: 40, borderRadius: 8, background: theme.secondary + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: theme.secondary, fontWeight: 700 }}>{(x.item.sub_category || x.item.category || '?').slice(0, 2)}</div>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ color: theme.secondary, marginRight: 4 }}>{i + 1}위</span>{x.item.sub_category || x.item.category}
                          </div>
                          <div style={{ fontSize: 11, color: theme.subText }}>{x.count}회 착용</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: calendarOpen ? 16 : 20, fontWeight: 700 }}>
                내 옷장 <span style={{ fontSize: 13, color: theme.subText, fontWeight: 400 }}>({clothes.length}개)</span>
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleCalendar} style={calendarOpen ? { ...btnPrimary, fontSize: 12, padding: '7px 14px' } : { ...btnGhost, fontSize: 13 }}>
                  {calendarOpen ? '← 닫기' : '착용 기록'}
                </button>
                {!calendarOpen && (
                  <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }} style={btnPrimary}>
                    + 옷 추가
                  </button>
                )}
              </div>
            </div>

            {/* 추가 모드 배너 */}
            {addMode && (
              <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: theme.primary + '12', border: `1px solid ${theme.primary + '40'}`, fontSize: 12, color: theme.primary, fontWeight: 600 }}>
                옷을 클릭하여 선택하세요 ({addItems.length}개)
              </div>
            )}

            {/* 카테고리 탭 */}
            {!calendarOpen && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {['전체', ...CATEGORIES].map(cat => {
                  const active = cat === '전체' ? !activeCategory : activeCategory === cat;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat === '전체' ? '' : cat)} style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${active ? theme.primary : theme.border}`, background: active ? theme.primary : theme.card, color: active ? theme.primaryText : theme.text, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400 }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 옷장 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: calendarOpen
                ? 'repeat(2, 1fr)'
                : 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: 16,
            }}>
              {[...clothes]
                .sort((a, b) => getSeasonPriority(a.season) - getSeasonPriority(b.season))
                .map(item => {
                  const isSelected = addItems.includes(item.id);
                  const isSelectable = addMode;

                  return (
                    <div
                      key={item.id}
                      onClick={isSelectable ? () => toggleAddItem(item.id) : undefined}
                      style={{
                        background: theme.card,
                        border: `2px solid ${isSelected ? theme.primary : theme.border}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: isSelectable ? 'pointer' : 'default',
                        transition: 'border-color 0.15s, transform 0.1s',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        position: 'relative',
                      }}
                    >
                      {/* 체크마크 */}
                      {isSelected && (
                        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 26, height: 26, borderRadius: '50%', background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>✓</div>
                      )}
                      {isSelectable && !isSelected && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.04)', zIndex: 1, pointerEvents: 'none' }} />
                      )}

                      {item.image_url
                        ? <img src={item.image_url} alt={item.category} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
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
                  <div>옷장이 비어있습니다.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 옷 추가/수정 모달 ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: theme.card, padding: 32, borderRadius: 16, width: 360, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', color: theme.text }}>{editingId ? '옷 수정' : '옷 추가'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select name="category" value={form.category} onChange={handleChange} required style={inputStyle}>
                <option value="">카테고리 선택 *</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input name="sub_category" placeholder="세부 종류 (티셔츠, 청바지 등)" value={form.sub_category} onChange={handleChange} style={inputStyle} />
              <input name="color" placeholder="색상" value={form.color} onChange={handleChange} style={inputStyle} />
              <input name="material" placeholder="소재 (면, 폴리에스터 등)" value={form.material} onChange={handleChange} style={inputStyle} />
              <input name="style" placeholder="스타일 (캐주얼, 포멀 등)" value={form.style} onChange={handleChange} style={inputStyle} />
              <div>
                <div style={{ fontSize: 13, color: theme.subText, marginBottom: 8 }}>계절 (복수 선택 가능)</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {SEASONS.map(s => (
                    <label key={s} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: theme.text }}>
                      <input type="checkbox" checked={form.seasons.includes(s)} onChange={() => handleSeasonToggle(s)} />{s}
                    </label>
                  ))}
                </div>
              </div>
              {!editingId && (
                <div>
                  <div style={{ fontSize: 13, color: theme.subText, marginBottom: 6 }}>이미지 (선택)</div>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ fontSize: 13, color: theme.text }} />
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
