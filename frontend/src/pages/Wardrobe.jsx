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

  // 옷장 기본 상태
  const [clothes, setClothes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  // 슬라이딩 캘린더 패널 상태
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calData, setCalData] = useState({});
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [calHoveredDate, setCalHoveredDate] = useState(null);
  const [calClothes, setCalClothes] = useState([]);

  // 착용 추가 모드 (옷장 카드 선택)
  const [addMode, setAddMode] = useState(false);
  const [addItems, setAddItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // 코디 수정 모드 (패널 내 체크박스)
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [editingItems, setEditingItems] = useState([]);

  // ── 데이터 로드 ───────────────────────────────
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

  // ── 옷장 CRUD ────────────────────────────────
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSeasonToggle = (season) => {
    const seasons = form.seasons.includes(season)
      ? form.seasons.filter(s => s !== season)
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

  // ── 슬라이딩 캘린더 패널 ──────────────────────
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

  const handleCalDateClick = (d) => {
    if (!d) return;
    const key = calDateKey(d);
    setCalSelectedDate(prev => prev === key ? null : key);
    setAddMode(false);
    setAddItems([]);
    setEditingOutfitId(null);
    setEditingItems([]);
  };

  // 착용 추가 모드
  const handleStartAdd = () => {
    setAddMode(true);
    setAddItems([]);
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
      setAddMode(false);
      setAddItems([]);
      loadCalData();
      loadStats();
      load();
    }
  };

  // 코디 수정 모드
  const handleStartEdit = async (outfit) => {
    setEditingOutfitId(outfit.id);
    setEditingItems((outfit.items || []).map(i => i.id));
    setAddMode(false);
    setAddItems([]);
    await loadCalClothes();
  };

  const toggleEditItem = (id) => {
    setEditingItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveEdit = async () => {
    const res = await authFetch(`/api/outfit/${editingOutfitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: editingItems }),
    });
    if (res.ok) {
      setEditingOutfitId(null);
      setEditingItems([]);
      loadCalData();
    }
  };

  // 달력 셀 계산
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

  const selectedOutfits = calSelectedDate ? (calData[calSelectedDate] || []) : [];

  // ── 스타일 ────────────────────────────────────
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
  const btnSmall = {
    padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
    background: theme.primary, color: theme.primaryText, fontSize: 12, fontWeight: 600,
  };
  const btnSmallGhost = {
    padding: '5px 12px', border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer',
    background: 'transparent', color: theme.text, fontSize: 12,
  };

  // ── 렌더 ─────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <NavBar links={NAV_LINKS} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── 통계 (사진 포함) ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>

            <div style={{ background: theme.statA, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.primary, marginBottom: 10 }}>
                최근 3개월 많이 입은 옷 TOP 3
              </div>
              {stats.most_worn.filter(x => x.count > 0).length === 0
                ? <div style={{ fontSize: 13, color: theme.subText }}>착용 기록 없음</div>
                : stats.most_worn.filter(x => x.count > 0).map((x, i) => (
                  <div key={x.item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                    <div style={{ flexShrink: 0 }}>
                      {x.item.image_url
                        ? <img src={x.item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: theme.primary + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: theme.primary, fontWeight: 700 }}>
                            {(x.item.sub_category || x.item.category || '?').slice(0, 2)}
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: theme.accent, marginRight: 4 }}>{i + 1}위</span>
                        {x.item.sub_category || x.item.category}
                      </div>
                      <div style={{ fontSize: 11, color: theme.subText }}>{x.count}회 착용</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={{ background: theme.statB, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.secondary, marginBottom: 10 }}>
                최근 3개월 적게 입은 옷 TOP 3
              </div>
              {stats.least_worn.length === 0
                ? <div style={{ fontSize: 13, color: theme.subText }}>옷 없음</div>
                : stats.least_worn.map((x, i) => (
                  <div key={x.item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${theme.border}` : 'none' }}>
                    <div style={{ flexShrink: 0 }}>
                      {x.item.image_url
                        ? <img src={x.item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: theme.secondary + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: theme.secondary, fontWeight: 700 }}>
                            {(x.item.sub_category || x.item.category || '?').slice(0, 2)}
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: theme.secondary, marginRight: 4 }}>{i + 1}위</span>
                        {x.item.sub_category || x.item.category}
                      </div>
                      <div style={{ fontSize: 11, color: theme.subText }}>{x.count}회 착용</div>
                    </div>
                  </div>
                ))
              }
            </div>

          </div>
        )}

        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            내 옷장 <span style={{ fontSize: 14, color: theme.subText, fontWeight: 400 }}>({clothes.length}개)</span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleCalendar}
              style={calendarOpen ? { ...btnPrimary, background: theme.primary + 'cc' } : btnGhost}
            >
              {calendarOpen ? '← 닫기' : '착용 기록'}
            </button>
            <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }} style={btnPrimary}>
              + 옷 추가
            </button>
          </div>
        </div>

        {/* ── 카테고리 탭 ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['전체', ...CATEGORIES].map(cat => {
            const active = cat === '전체' ? !activeCategory : activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === '전체' ? '' : cat)}
                style={{
                  padding: '7px 16px', borderRadius: 20,
                  border: `1px solid ${active ? theme.primary : theme.border}`,
                  background: active ? theme.primary : theme.card,
                  color: active ? theme.primaryText : theme.text,
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                }}
              >{cat}</button>
            );
          })}
        </div>

        {/* ── 추가 모드 배너 ── */}
        {addMode && (
          <div style={{
            marginBottom: 12, padding: '10px 16px', borderRadius: 10,
            background: theme.primary + '12', border: `1px solid ${theme.primary + '40'}`,
            fontSize: 13, color: theme.primary, fontWeight: 600,
          }}>
            {calSelectedDate} — 옷을 클릭하여 착용 기록에 추가하세요 ({addItems.length}개 선택됨)
          </div>
        )}

        {/* ── 메인 영역: 패널 + 옷장 그리드 ── */}
        {/* maxWidth 900px 안에서 패널(500px) + gap(20px) + 옷장(332px) = 852px */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* 슬라이딩 캘린더 패널 */}
          <div style={{
            width: calendarOpen ? 500 : 0,
            overflow: 'hidden',
            transition: 'width 0.4s ease',
            flexShrink: 0,
          }}>
            {/* width: 500 고정 — 슬라이드 중에도 내용 레이아웃 유지 */}
            <div style={{ width: 500, paddingRight: 4 }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: 'hidden' }}>

                {/* 월 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${theme.border}` }}>
                  <button onClick={calPrevMonth} style={{ width: 32, height: 32, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg, cursor: 'pointer', color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{calYear}년 {calMonth}월</div>
                    <div style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                      이번 달 착용 기록: {Object.values(calData).flat().length}회
                    </div>
                  </div>
                  <button onClick={calNextMonth} style={{ width: 32, height: 32, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg, cursor: 'pointer', color: theme.text, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                </div>

                <div style={{ padding: '12px 12px 0' }}>
                  {/* 요일 헤더 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6, background: theme.bg, borderRadius: 8, padding: '6px 0' }}>
                    {CAL_DAYS.map((d, i) => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.subText }}>{d}</div>
                    ))}
                  </div>

                  {/* 날짜 그리드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {calCells.map((d, idx) => {
                      const key = d ? calDateKey(d) : null;
                      const outfits = key ? (calData[key] || []) : [];
                      const isSelected = key === calSelectedDate;
                      const isToday = key === todayKey;
                      const isHovered = d === calHoveredDate;
                      const isSun = idx % 7 === 0;
                      const isSat = idx % 7 === 6;
                      const hasOutfit = outfits.length > 0;
                      const miniThumbs = getMiniThumbs(outfits);

                      return (
                        <div
                          key={idx}
                          onClick={() => handleCalDateClick(d)}
                          onMouseEnter={() => d && setCalHoveredDate(d)}
                          onMouseLeave={() => setCalHoveredDate(null)}
                          style={{
                            minHeight: 72,
                            border: `1.5px solid ${isSelected ? theme.primary : isToday ? theme.accent : theme.border}`,
                            borderRadius: 8,
                            padding: '5px',
                            cursor: d ? 'pointer' : 'default',
                            background: isSelected ? theme.primary + '15' : isHovered && d ? theme.primary + '08' : theme.bg,
                            boxSizing: 'border-box',
                            transition: 'all 0.15s',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          {d && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: isToday ? 700 : 400,
                                  background: isToday ? theme.primary : 'transparent',
                                  color: isToday ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : theme.text,
                                  flexShrink: 0,
                                }}>{d}</div>
                                {outfits.length > 1 && (
                                  <div style={{ fontSize: 9, fontWeight: 700, color: theme.primary, background: theme.primary + '20', borderRadius: 4, padding: '1px 3px' }}>
                                    {outfits.length}
                                  </div>
                                )}
                              </div>

                              {hasOutfit && (
                                miniThumbs.length > 1 ? (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    {miniThumbs.slice(0, 4).map((url, i) => (
                                      <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3 }} />
                                    ))}
                                  </div>
                                ) : miniThumbs[0] ? (
                                  <img src={miniThumbs[0]} alt="" style={{ width: '100%', height: 36, objectFit: 'cover', borderRadius: 4 }} />
                                ) : (
                                  <div style={{ width: '100%', height: 5, borderRadius: 3, marginTop: 4, background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />
                                )
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 범례 */}
                  <div style={{ display: 'flex', gap: 12, margin: '10px 0', fontSize: 10, color: theme.subText }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: theme.primary }} /> 오늘
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 18, height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} /> 착용 기록
                    </div>
                  </div>
                </div>

                {/* 날짜 상세 패널 */}
                {calSelectedDate && (
                  <div style={{ borderTop: `1px solid ${theme.border}` }}>
                    {/* 날짜 헤더 */}
                    <div style={{ padding: '12px 16px', background: theme.primary, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{calSelectedDate}</div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
                          {selectedOutfits.length > 0 ? `${selectedOutfits.length}개 코디 기록` : '기록 없음'}
                        </div>
                      </div>
                      {addMode && (
                        <div style={{ fontSize: 11, background: 'rgba(255,255,255,0.25)', borderRadius: 6, padding: '4px 8px' }}>
                          {addItems.length}개 선택됨
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 14 }}>
                      {/* 기존 코디 목록 */}
                      {selectedOutfits.map((o, oi) => (
                        <div key={o.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: oi < selectedOutfits.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                          {editingOutfitId === o.id ? (
                            /* 수정 모드 */
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>
                                착용 코디 수정 <span style={{ fontWeight: 400, color: theme.subText }}>({editingItems.length}개)</span>
                              </div>
                              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {['상의', '하의', '아우터', '신발', '가방', '기타'].map(cat => {
                                  const catItems = calClothes.filter(c => c.category === cat);
                                  if (catItems.length === 0) return null;
                                  return (
                                    <div key={cat}>
                                      <div style={{ fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 3 }}>{cat}</div>
                                      {catItems.map(c => (
                                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            checked={editingItems.includes(c.id)}
                                            onChange={() => toggleEditItem(c.id)}
                                            style={{ accentColor: theme.primary, width: 13, height: 13 }}
                                          />
                                          {c.image_url && <img src={c.image_url} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4 }} />}
                                          <span style={{ fontSize: 12, color: theme.text }}>
                                            {c.sub_category || c.category}{c.color ? ` · ${c.color}` : ''}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={editingItems.length === 0}
                                  style={{ ...btnSmall, flex: 1, opacity: editingItems.length === 0 ? 0.5 : 1, cursor: editingItems.length === 0 ? 'not-allowed' : 'pointer' }}
                                >저장</button>
                                <button
                                  onClick={() => { setEditingOutfitId(null); setEditingItems([]); }}
                                  style={{ ...btnSmallGhost, flex: 1 }}
                                >취소</button>
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
                                    <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, background: 'rgba(0,0,0,0.5)', borderRadius: 3, fontSize: 8, color: '#fff', textAlign: 'center', padding: '1px' }}>
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
                              {o.temperature != null && (
                                <div style={{ fontSize: 11, color: theme.subText, marginBottom: 4 }}>{o.temperature}°C · {o.weather}</div>
                              )}
                              <button
                                onClick={() => handleStartEdit(o)}
                                style={{ ...btnSmallGhost, padding: '4px 10px', fontSize: 11 }}
                              >수정</button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* 착용 추가 버튼 / 추가 모드 저장 */}
                      {addMode ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={handleSaveAdd}
                            disabled={addItems.length === 0 || saving}
                            style={{ ...btnSmall, flex: 1, background: '#10B981', opacity: addItems.length === 0 ? 0.5 : 1, cursor: addItems.length === 0 ? 'not-allowed' : 'pointer' }}
                          >
                            {saving ? '저장 중...' : `저장 (${addItems.length}개)`}
                          </button>
                          <button onClick={() => { setAddMode(false); setAddItems([]); }} style={{ ...btnSmallGhost, flex: 1 }}>취소</button>
                        </div>
                      ) : !editingOutfitId && (
                        <button
                          onClick={handleStartAdd}
                          style={{ width: '100%', padding: '9px 0', border: 'none', borderRadius: 10, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600 }}
                        >
                          + 착용 추가
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!calSelectedDate && (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: theme.subText }}>
                    날짜를 클릭하여 착용 기록을 확인하거나 추가하세요
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 옷장 그리드 ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'grid',
              // 패널 없을 때: auto-fill로 자연스럽게 5열 (900px 기준 ~161px)
              // 패널 있을 때: 332px 영역에 2열 (~158px) — 카드 크기 동일
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
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        position: 'relative',
                      }}
                    >
                      {/* 선택 체크마크 */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 2,
                          width: 24, height: 24, borderRadius: '50%',
                          background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}>✓</div>
                      )}
                      {/* 추가 모드 미선택 dim */}
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
                  <div>옷장이 비어있습니다. 옷을 추가해보세요!</div>
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
                      <input type="checkbox" checked={form.seasons.includes(s)} onChange={() => handleSeasonToggle(s)} />
                      {s}
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
