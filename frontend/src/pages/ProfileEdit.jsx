import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';

const API_URL = process.env.REACT_APP_API_URL || '';

const authFetch = (path, options = {}) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...options.headers,
    },
  });

const PERSONAL_COLORS = [
  {
    id: '봄 웜',
    label: '봄 웜',
    desc: '밝고 따뜻한 색조 · 코랄, 복숭아, 황금색',
    colors: ['#FF8C69', '#FFB347', '#FFD700', '#90EE90', '#FFDAB9'],
  },
  {
    id: '여름 쿨',
    label: '여름 쿨',
    desc: '부드럽고 차가운 색조 · 라벤더, 파우더 블루, 로즈',
    colors: ['#B0C4DE', '#DDA0DD', '#FFB6C1', '#98D8C8', '#E6E6FA'],
  },
  {
    id: '가을 웜',
    label: '가을 웜',
    desc: '깊고 따뜻한 어스톤 · 머스타드, 올리브, 테라코타',
    colors: ['#DAA520', '#8B6914', '#808000', '#D2691E', '#CD853F'],
  },
  {
    id: '겨울 쿨',
    label: '겨울 쿨',
    desc: '선명하고 차가운 색조 · 블랙, 화이트, 네이비',
    colors: ['#000080', '#DC143C', '#006400', '#1C1C1C', '#4169E1'],
  },
];

const NAV_LINKS = [
  { to: '/wardrobe', label: '내 옷장' },
  { to: '/outfit', label: '코디 추천' },
  { to: '/calendar', label: '착용 기록' },
];

export default function ProfileEdit() {
  const { theme } = useTheme();
  const [form, setForm] = useState({ nickname: '', height: '', weight: '', personal_color: '' });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setForm({
      nickname: user.nickname || '',
      height: user.height || '',
      weight: user.weight || '',
      personal_color: user.personal_color || '',
    });
    setPreview(user.profile_image || null);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (imageFile) {
      const fd = new FormData();
      fd.append('image', imageFile);
      const imgRes = await authFetch('/api/auth/profile/image', { method: 'POST', body: fd });
      if (!imgRes.ok) {
        setError('이미지 업로드에 실패했습니다.');
        setLoading(false);
        return;
      }
      const imgData = await imgRes.json();
      localStorage.setItem('user', JSON.stringify(imgData.user));
    }

    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: form.nickname,
        height: form.height ? parseFloat(form.height) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        personal_color: form.personal_color || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error || '오류가 발생했습니다.');
      return;
    }
    const data = await res.json();
    localStorage.setItem('user', JSON.stringify(data.user));
    setMessage('저장되었습니다.');
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`,
    borderRadius: 8, fontSize: 14, background: theme.bg, color: theme.text,
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <NavBar links={NAV_LINKS} />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ margin: '0 0 32px', fontSize: 20, fontWeight: 700 }}>회원정보 수정</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 프로필 사진 */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>프로필 사진</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                background: theme.bg, border: `2px solid ${theme.border}`,
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {preview
                  ? <img src={preview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 30, color: theme.subText }}>👤</span>
                }
              </div>
              <div>
                <label style={{
                  display: 'inline-block', padding: '9px 18px',
                  background: theme.primary, color: theme.primaryText,
                  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                  사진 선택
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                <div style={{ fontSize: 12, color: theme.subText, marginTop: 6 }}>JPG, PNG (최대 5MB)</div>
              </div>
            </div>
          </div>

          {/* 기본 정보 */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>기본 정보</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: theme.subText, display: 'block', marginBottom: 6 }}>닉네임 *</label>
                <input
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  required placeholder="닉네임" style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: theme.subText, display: 'block', marginBottom: 6 }}>키 (cm)</label>
                  <input
                    type="number" value={form.height}
                    onChange={e => setForm({ ...form, height: e.target.value })}
                    placeholder="예: 170" style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: theme.subText, display: 'block', marginBottom: 6 }}>몸무게 (kg)</label>
                  <input
                    type="number" value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                    placeholder="예: 60" style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 퍼스널 컬러 */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>퍼스널 컬러</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: theme.subText }}>
              선택하면 코디 추천 시 어울리는 색상을 함께 알려드려요
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PERSONAL_COLORS.map(pc => {
                const selected = form.personal_color === pc.id;
                return (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => setForm({ ...form, personal_color: selected ? '' : pc.id })}
                    style={{
                      padding: '14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${selected ? theme.primary : theme.border}`,
                      background: selected ? theme.primary + '12' : theme.bg,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{pc.label}</span>
                      {selected && <span style={{ fontSize: 12, color: theme.primary }}>✓</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
                      {pc.colors.map((c, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.12)' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: theme.subText, lineHeight: 1.4 }}>{pc.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
          {message && <p style={{ margin: 0, fontSize: 13, color: '#10B981', fontWeight: 600 }}>{message}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px 0', border: 'none', borderRadius: 10, cursor: 'pointer',
              background: theme.primary, color: theme.primaryText, fontSize: 15, fontWeight: 700,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
