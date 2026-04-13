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
  const [addForm, setAddForm] = useState({ top_id: '', bottom_id: '', outer_id: '', shoes_id: '' });

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
  };

  const handleOpenAdd = async () => {
    await loadClothes();
    setAddForm({ top_id: '', bottom_id: '', outer_id: '', shoes_id: '' });
    setShowAddModal(true);
  };

  const handleAddOutfit = async () => {
    const res = await authFetch('/api/outfit/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, worn_date: dateKey(selectedDate) }),
    });
    if (res.ok) {
      setShowAddModal(false);
      load();
    }
  };

  const byCategory = (cat) => clothes.filter(c => c.category === cat);
  const selectedOutfits = selectedDate ? (calendarData[dateKey(selectedDate)] || []) : [];

  const selectStyle = {
    width: '100%', padding: '8px 10px', border: `1px solid ${theme.border}`,
    borderRadius: 8, fontSize: 13, background: theme.bg, color: theme.text,
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>

      <NavBar links={NAV_LINKS} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* 달력 */}
        <div style={{ flex: 1 }}>
          {/* 월 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={prevMonth}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: theme.text, lineHeight: 1 }}>‹</button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{year}년 {month}월</h2>
            <button onClick={nextMonth}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: theme.text, lineHeight: 1 }}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : theme.subText,
              }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((d, idx) => {
              const key = d ? dateKey(d) : null;
              const outfits = key ? (calendarData[key] || []) : [];
              const isSelected = d === selectedDate;
              const isToday = key === todayKey;
              const isSun = idx % 7 === 0;
              const isSat = idx % 7 === 6;
              const thumb = outfits[0]?.top?.image_url || outfits[0]?.outer?.image_url || outfits[0]?.bottom?.image_url;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(d)}
                  style={{
                    minHeight: 68, border: `1.5px solid ${isSelected ? theme.primary : theme.border}`,
                    borderRadius: 8, padding: '4px 6px', cursor: d ? 'pointer' : 'default',
                    background: isSelected ? theme.primary + '18' : theme.card,
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                >
                  {d && (
                    <>
                      <div style={{
                        fontSize: 12, fontWeight: isToday ? 700 : 400, marginBottom: 3,
                        color: isToday ? theme.primary : isSun ? '#EF4444' : isSat ? '#3B82F6' : theme.text,
                        background: isToday ? theme.primary + '22' : 'transparent',
                        borderRadius: 10, display: 'inline-block', padding: isToday ? '1px 5px' : '0',
                      }}>{d}</div>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: '100%', height: 38, objectFit: 'cover', borderRadius: 5 }} />
                        : outfits.length > 0 && (
                          <div style={{ width: '100%', height: 38, background: theme.primary + '28', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: theme.primary, fontWeight: 600 }}>착용</div>
                        )
                      }
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 사이드 패널 */}
        {selectedDate && (
          <div style={{ width: 230, flexShrink: 0 }}>
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                {month}월 {selectedDate}일
              </h3>

              {selectedOutfits.length === 0 ? (
                <div style={{ fontSize: 13, color: theme.subText, marginBottom: 16 }}>기록된 코디 없음</div>
              ) : (
                selectedOutfits.map((o, oi) => (
                  <div key={o.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: oi < selectedOutfits.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                    {[
                      { label: '아우터', item: o.outer },
                      { label: '상의', item: o.top },
                      { label: '하의', item: o.bottom },
                      { label: '신발', item: o.shoes },
                    ].filter(e => e.item).map(({ label, item }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {item.image_url
                          ? <img src={item.image_url} alt={label} style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                          : <div style={{ width: 38, height: 38, background: theme.bg, borderRadius: 6, flexShrink: 0 }} />
                        }
                        <div>
                          <div style={{ fontSize: 11, color: theme.subText }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{item.sub_category || item.category}</div>
                        </div>
                      </div>
                    ))}
                    {o.temperature != null && (
                      <div style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>{o.temperature}°C · {o.weather}</div>
                    )}
                  </div>
                ))
              )}

              {!showAddModal && (
                <button onClick={handleOpenAdd}
                  style={{ width: '100%', padding: '9px 0', border: 'none', borderRadius: 8, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 13, fontWeight: 600 }}>
                  + 코디 추가
                </button>
              )}

              {showAddModal && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: theme.subText, fontWeight: 600, marginBottom: 2 }}>착용한 옷 선택</div>
                  {[
                    ['상의', 'top_id', '상의'],
                    ['하의', 'bottom_id', '하의'],
                    ['아우터', 'outer_id', '아우터'],
                    ['신발', 'shoes_id', '신발'],
                  ].map(([label, key, cat]) => (
                    <select key={key} value={addForm[key]}
                      onChange={e => setAddForm({ ...addForm, [key]: e.target.value })}
                      style={selectStyle}>
                      <option value="">{label} (선택)</option>
                      {byCategory(cat).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.sub_category || c.category}{c.color ? ` (${c.color})` : ''}
                        </option>
                      ))}
                    </select>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button onClick={handleAddOutfit}
                      style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer', background: theme.primary, color: theme.primaryText, fontSize: 12, fontWeight: 600 }}>
                      저장
                    </button>
                    <button onClick={() => setShowAddModal(false)}
                      style={{ flex: 1, padding: '8px 0', border: `1px solid ${theme.border}`, borderRadius: 8, cursor: 'pointer', background: 'transparent', color: theme.text, fontSize: 12 }}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
