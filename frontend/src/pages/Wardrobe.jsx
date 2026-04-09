import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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

const emptyForm = { category: '', sub_category: '', color: '', seasons: [], style: '', material: '' };

export default function Wardrobe() {
  const navigate = useNavigate();
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

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('ko-KR');
  };

  return (
    <div style={{ maxWidth: 760, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>내 옷장</h2>
        <div>
          <Link to="/outfit" style={{ marginRight: 12 }}>코디 추천</Link>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </div>

      {/* 월간 통계 */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: 16, background: '#fff8e1', borderRadius: 8 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>이번 달 많이 입은 옷 TOP 3</div>
            {stats.most_worn.filter(x => x.count > 0).length === 0
              ? <div style={{ color: '#aaa', fontSize: 13 }}>착용 기록 없음</div>
              : stats.most_worn.filter(x => x.count > 0).map((x, i) => (
                <div key={x.item.id} style={{ fontSize: 13, marginBottom: 4 }}>
                  {i + 1}. {x.item.category} {x.item.sub_category || ''} — {x.count}회
                </div>
              ))
            }
          </div>
          <div style={{ flex: 1, padding: 16, background: '#fce4ec', borderRadius: 8 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>이번 달 적게 입은 옷 TOP 3</div>
            {stats.least_worn.length === 0
              ? <div style={{ color: '#aaa', fontSize: 13 }}>옷 없음</div>
              : stats.least_worn.map((x, i) => (
                <div key={x.item.id} style={{ fontSize: 13, marginBottom: 4 }}>
                  {i + 1}. {x.item.category} {x.item.sub_category || ''} — {x.count}회
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveCategory('')} style={{ fontWeight: !activeCategory ? 'bold' : 'normal' }}>전체</button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontWeight: activeCategory === cat ? 'bold' : 'normal' }}>{cat}</button>
        ))}
      </div>

      {/* 의류 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {clothes.map((item) => (
          <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {item.image_url
              ? <img src={item.image_url} alt={item.category} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: 140, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>이미지 없음</div>
            }
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13 }}>{item.category}</div>
              {item.sub_category && <div style={{ fontSize: 12, color: '#666' }}>{item.sub_category}</div>}
              {item.color && <div style={{ fontSize: 12, color: '#999' }}>{item.color}</div>}
              {item.material && <div style={{ fontSize: 12, color: '#999' }}>소재: {item.material}</div>}
              {item.season && <div style={{ fontSize: 12, color: '#999' }}>{item.season}</div>}
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>등록: {formatDate(item.created_at)}</div>
              <div style={{ fontSize: 11, color: '#bbb' }}>마지막 착용: {formatDate(item.last_worn_at)}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button onClick={() => handleEdit(item)} style={{ fontSize: 11 }}>수정</button>
                <button onClick={() => handleDelete(item.id)} style={{ fontSize: 11 }}>삭제</button>
              </div>
            </div>
          </div>
        ))}
        {clothes.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#aaa' }}>옷장이 비어있습니다.</p>
        )}
      </div>

      <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}>
        + 옷 추가
      </button>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: 28, borderRadius: 12, minWidth: 320 }}>
            <h3>{editingId ? '옷 수정' : '옷 추가'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select name="category" value={form.category} onChange={handleChange} required>
                <option value="">카테고리 선택 *</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input name="sub_category" placeholder="세부 종류 (티셔츠, 청바지 등)" value={form.sub_category} onChange={handleChange} />
              <input name="color" placeholder="색상" value={form.color} onChange={handleChange} />
              <input name="material" placeholder="소재 (면, 폴리에스터 등)" value={form.material} onChange={handleChange} />
              <div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>계절 (복수 선택 가능)</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SEASONS.map((s) => (
                    <label key={s} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="checkbox"
                        checked={form.seasons.includes(s)}
                        onChange={() => handleSeasonToggle(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <input name="style" placeholder="스타일 (캐주얼, 포멀 등)" value={form.style} onChange={handleChange} />
              {!editingId && (
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              )}
              {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit">{editingId ? '수정 완료' : '추가'}</button>
                <button type="button" onClick={() => { setShowModal(false); setError(''); }}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
