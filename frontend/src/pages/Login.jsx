import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const { theme, themeKey, changeTheme, themes } = useTheme();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister
      ? { email: form.email, password: form.password, nickname: form.nickname }
      : { email: form.email, password: form.password };

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return; }

    if (isRegister) {
      setIsRegister(false);
      setForm({ email: '', password: '', nickname: '' });
      alert('회원가입 성공! 로그인해주세요.');
    } else {
      localStorage.setItem('token', data.access_token);
      navigate('/wardrobe');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontSize: 14,
    background: theme.bg,
    color: theme.text,
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: theme.card, borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👔</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.primary }}>My Closet</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.subText }}>나만의 스마트 옷장</p>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
          {['로그인', '회원가입'].map((label, i) => (
            <button
              key={label}
              onClick={() => { setIsRegister(i === 1); setError(''); }}
              style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: isRegister === (i === 1) ? theme.primary : 'transparent',
                color: isRegister === (i === 1) ? theme.primaryText : theme.subText,
                transition: 'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input name="email" type="email" placeholder="이메일" value={form.email} onChange={handleChange} required style={inputStyle} />
          {isRegister && (
            <input name="nickname" placeholder="닉네임 (선택)" value={form.nickname} onChange={handleChange} style={inputStyle} />
          )}
          <input name="password" type="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required style={inputStyle} />
          {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
          <button
            type="submit"
            style={{
              marginTop: 4, padding: '12px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: theme.primary, color: theme.primaryText, fontSize: 15, fontWeight: 600,
            }}
          >{isRegister ? '가입하기' : '로그인'}</button>
        </form>

        {/* 테마 선택 */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: theme.subText, textAlign: 'center' }}>테마 선택</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                onClick={() => changeTheme(key)}
                title={t.name}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: themeKey === key ? `2px solid ${theme.accent}` : `2px solid transparent`,
                  background: t.primary, cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: theme.subText, textAlign: 'center' }}>
            {themes[themeKey].name}
          </p>
        </div>
      </div>
    </div>
  );
}
