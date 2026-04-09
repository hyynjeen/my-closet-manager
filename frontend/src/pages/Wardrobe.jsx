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

const emptyForm = { category: '', sub_category: '', color: '', season: '', style: '' };

export default function Wardrobe() {
  const navigate = useNavigate();
  const [clothes, setClothes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = async (category = activeCategory) => {
    const path = category ? `/api/clothes/?category=${category}` : '/api/clothes/';
    const res = await authFetch(path);
    if (res.status === 401) { localStorage.removeItem('token'); navigate('/login'); return; }
    setClothes(await res.json());
  };

  useEffect(() => { load(); }, [activeCategory]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let res;
    if (editingId) {
      res = await authFetch(`/api/clothes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (imageFile) formData.append('image', imageFile);
      res = await authFetch('/api/clothes/', { method: 'POST', body: formData });
    }

    if (!res.ok) { setError((await res.json()).error || '오류가 발생했습니다.'); return; }
    setForm(emptyForm);
    setImageFile(null);
    setEditingId(null);
    setShowModal(false);
    load();
  };

  const handleEdit = (item) => {
    setForm({
      category: item.category || '',
      sub_category: item.sub_category || '',
      color: item.color || '',
      season: item.season || '',
      style: item.style || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await authFetch(`/api/clothes/${id}`, { method: 'DELETE' });
    load();
  };

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>내 옷장</h2>
        <div>
          <Link to="/outfit" style={{ marginRight: 12 }}>코디 추천</Link>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveCategory('')}
          style={{ fontWeight: !activeCategory ? 'bold' : 'normal' }}
        >전체</button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{ fontWeight: activeCategory === cat ? 'bold' : 'normal' }}
          >{cat}</button>
        ))}
      </div>

      {/* 의류 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
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
              {item.season && <div style={{ fontSize: 12, color: '#999' }}>{item.season}</div>}
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
              <select name="season" value={form.season} onChange={handleChange}>
                <option value="">계절 선택</option>
                {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
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
