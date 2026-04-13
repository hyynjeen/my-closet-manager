import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function Calendar() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calendarData, setCalendarData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [clothes, setClothes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [editingOutfitId, setEditingOutfitId] = useState(null);
  const [editingItems, setEditingItems] = useState([]);

  const load = async () => {
    const res = await authFetch(`/api/outfit/calendar?year=${year}&month=${month}`);
    if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
    setCalendarData(await res.json());
  };

  const loadClothes = async () => {
    const res = await authFetch('/api/clothes/');
    if (res.ok) setClothes(await res.json());
  };

  useEffect(() => { load(); }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (d) =>
    `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayKey = new Date().toISOString().slice(0, 10);

  const handleDayClick = (d) => {
    if (!d) return;
    setSelectedDate(d);
    setShowAddModal(false);
    setEditingOutfitId(null);
    setEditingItems([]);
  };

  const handleOpenAdd = async () => {
    setSelectedItems([]);
    setEditingOutfitId(null);
    setShowAddModal(true);
    if (clothes.length === 0) await loadClothes();
  };

  const toggleItem = (id, disabled) => {
    if (disabled) return;
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddOutfit = async () => {
    if (selectedItems.length === 0) return;
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: selectedItems, worn_date: dateKey(selectedDate) }),
    });
    if (res.ok) {
      setShowAddModal(false);
      load();
    }
  };

  const handleStartEdit = async (outfit) => {
    setEditingOutfitId(outfit.id);
    setEditingItems((outfit.items || []).map(i => i.id));
    setShowAddModal(false);
    if (clothes.length === 0) await loadClothes();
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
      load();
    }
  };

  const byCategory = (cat) => clothes.filter(c => c.category === cat);
  const selectedOutfits = selectedDate ? (calendarData[dateKey(selectedDate)] || []) : [];

  // 이미 착용 기록된 옷 ID 목록 (추가 시에만 사용)
  const alreadyWornIds = new Set(
    selectedOutfits.flatMap(o => (o.items || []).map(i => i.id))
  );

  // 달력 셀의 썸네일
  const getThumb = (outfits) => {
    if (!outfits.length) return null;
    const o = outfits[0];
    return o.items?.[0]?.image_url || o.top?.image_url || o.outer?.image_url || o.bottom?.image_url || null;
  };

  // 달력에 표시할 작은 아이템 이미지들 (최대 4개)
  const getMiniThumbs = (outfits) => {
    if (!outfits.length) return [];
    const items = outfits.flatMap(o =>
      (o.items?.length ? o.items : [o.top, o.bottom, o.outer, o.shoes].filter(Boolean))
    );
    return items.slice(0, 4).map(i => i.image_url).filter(Boolean);
  };

  const clothesCheckboxUI = (checkedIds, onToggle, disabledIds = new Set()) => (
    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {['상의', '하의', '아우터', '신발', '가방', '기타'].map(cat => {
        const catItems = byCategory(cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <div style={{ fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 4 }}>{cat}</div>
            {catItems.map(c => {
              const isDisabled = disabledIds.has(c.id);
              return (
                <label key={c.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.4 : 1 }}>
                  <input
                    type="checkbox"
                    checked={checkedIds.includes(c.id)}
                    onChange={() => onToggle(c.id, isDisabled)}
                    disabled={isDisabled}
                    style={{ accentColor: theme.primary, width: 14, height: 14 }}
                  />
                  {c.image_url && <img src={c.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />}
                  <span style={{ fontSize: 12, color: theme.text }}>
                    {c.sub_category || c.category}{c.color ? ` · ${c.color}` : ''}
                    {isDisabled && <span style={{ fontSize: 10, color: theme.subText }}> (착용됨)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <NavBar links={NAV_LINKS} />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* 달력 */}
        <div style={{ flex: 1 }}>
          {/* 월 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={prevMonth} style={{ width: 36, height: 36, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.card, cursor: 'pointer', fontSize: 18, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{year}년 {month}월</div>
              <div style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>
                이번 달 착용 기록: {Object.values(calendarData).flat().length}회
              </div>
            </div>
            <button onClick={nextMonth} style={{ width: 36, height: 36, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.card, cursor: 'pointer', fontSize: 18, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6, background: theme.card, borderRadius: 10, padding: '8px 0', border: `1px solid ${theme.border}` }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 700,
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.subText,
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, idx) => {
              const key = d ? dateKey(d) : null;
              const outfits = key ? (calendarData[key] || []) : [];
              const isSelected = d === selectedDate;
              const isToday = key === todayKey;
              const isHovered = d === hoveredDate;
              const isSun = idx % 7 === 0;
              const isSat = idx % 7 === 6;
              const hasOutfit = outfits.length > 0;
              const thumb = getThumb(outfits);
              const miniThumbs = getMiniThumbs(outfits);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(d)}
                  onMouseEnter={() => d && setHoveredDate(d)}
                  onMouseLeave={() => setHoveredDate(null)}
                  style={{
                    minHeight: 84,
                    border: `1.5px solid ${isSelected ? theme.primary : isToday ? theme.accent : theme.border}`,
                    borderRadius: 10,
                    padding: '6px',
                    cursor: d ? 'pointer' : 'default',
                    background: isSelected
                      ? theme.primary + '15'
                      : isHovered && d
                        ? theme.primary + '08'
                        : theme.card,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {d && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: isToday ? 700 : 400,
                          background: isToday ? theme.primary : 'transparent',
                          color: isToday ? '#fff' : isSun ? '#EF4444' : isSat ? '#3B82F6' : theme.text,
                        }}>{d}</div>
                        {outfits.length > 1 && (
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: theme.primary,
                            background: theme.primary + '20', borderRadius: 6,
                            padding: '1px 5px',
                          }}>{outfits.length}</div>
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
                          <img src={thumb} alt="" style={{ width: '100%', height: 44, objectFit: 'cover', borderRadius: 6, marginTop: 2 }} />
                        ) : (
                          <div style={{
                            width: '100%', height: 6, borderRadius: 4, marginTop: 6,
                            background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`,
                          }} />
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: theme.subText }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: theme.primary }} />
              오늘
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />
              착용 기록
            </div>
          </div>
        </div>

        {/* 사이드 패널 */}
        {selectedDate && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: 'hidden' }}>
              {/* 패널 헤더 */}
              <div style={{ padding: '16px 20px', background: theme.primary, color: '#fff' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{month}월 {selectedDate}일</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {selectedOutfits.length > 0 ? `${selectedOutfits.length}개 코디 기록` : '기록 없음'}
                </div>
              </div>

              <div style={{ padding: 16 }}>
                {selectedOutfits.length === 0 ? (
                  <div style={{ fontSize: 13, color: theme.subText, marginBottom: 16, textAlign: 'center', padding: '12px 0' }}>
                    아직 코디 기록이 없어요
                  </div>
                ) : (
                  selectedOutfits.map((o, oi) => (
                    <div key={o.id} style={{
                      marginBottom: 12, paddingBottom: 12,
                      borderBottom: oi < selectedOutfits.length - 1 ? `1px solid ${theme.border}` : 'none',
                    }}>
                      {editingOutfitId === o.id ? (
                        /* 수정 모드 */
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>
                            착용 코디 수정
                            <span style={{ fontWeight: 400, color: theme.subText }}> ({editingItems.length}개)</span>
                          </div>
                          {clothesCheckboxUI(editingItems, (id) => toggleEditItem(id))}
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                              onClick={handleSaveEdit}
                              disabled={editingItems.length === 0}
                              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: editingItems.length === 0 ? 'not-allowed' : 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 12, fontWeight: 600, opacity: editingItems.length === 0 ? 0.5 : 1 }}
                            >
                              저장
                            </button>
                            <button
                              onClick={() => { setEditingOutfitId(null); setEditingItems([]); }}
                              style={{ flex: 1, padding: '8px 0', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: theme.text, fontSize: 12 }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 일반 보기 */
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                            {(o.items || []).map((item) => (
                              <div key={item.id} style={{ position: 'relative' }}>
                                {item.image_url
                                  ? <img src={item.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                                  : <div style={{ width: '100%', aspectRatio: '1', background: theme.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ fontSize: 10, color: theme.subText }}>{item.category}</span>
                                    </div>
                                }
                                <div style={{
                                  position: 'absolute', bottom: 2, left: 2, right: 2,
                                  background: 'rgba(0,0,0,0.5)', borderRadius: 4,
                                  fontSize: 9, color: '#fff', textAlign: 'center', padding: '1px 2px',
                                }}>
                                  {item.sub_category || item.category}
                                </div>
                              </div>
                            ))}
                          </div>
                          {o.temperature != null && (
                            <div style={{ fontSize: 11, color: theme.subText, marginBottom: 4 }}>{o.temperature}°C · {o.weather}</div>
                          )}
                          <button
                            onClick={() => handleStartEdit(o)}
                            style={{ padding: '4px 12px', border: `1px solid ${theme.border}`, borderRadius: 6, background: 'transparent', color: theme.subText, fontSize: 11, cursor: 'pointer' }}
                          >
                            수정
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {!showAddModal && !editingOutfitId && (
                  <button onClick={handleOpenAdd}
                    style={{ width: '100%', padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600 }}>
                    + 코디 추가
                  </button>
                )}

                {showAddModal && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                      착용한 옷 선택
                      <span style={{ fontWeight: 400, color: theme.subText }}> ({selectedItems.length}개)</span>
                    </div>
                    {clothesCheckboxUI(selectedItems, toggleItem, alreadyWornIds)}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={handleAddOutfit} disabled={selectedItems.length === 0}
                        style={{ flex: 1, padding: '9px 0', border: 'none', borderRadius: 8, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 12, fontWeight: 600, opacity: selectedItems.length === 0 ? 0.5 : 1 }}>
                        저장
                      </button>
                      <button onClick={() => setShowAddModal(false)}
                        style={{ flex: 1, padding: '9px 0', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: theme.text, fontSize: 12 }}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
