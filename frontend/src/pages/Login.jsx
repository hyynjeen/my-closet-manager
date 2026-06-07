import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', nickname: '' });
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validatePassword = (pw) => {
    if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (!/[A-Za-z]/.test(pw)) return '영문자를 포함해주세요.';
    if (!/\d/.test(pw)) return '숫자를 포함해주세요.';
    if (!/[@$!%*#?&]/.test(pw)) return '특수문자(@$!%*#?&)를 포함해주세요.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!form.nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
      const pwError = validatePassword(form.password);
      if (pwError) { setError(pwError); return; }
      if (form.password !== form.passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    }

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
      setForm({ email: '', password: '', passwordConfirm: '', nickname: '' });
      alert('회원가입 성공! 로그인해주세요.');
    } else {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/wardrobe');
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`,
    borderRadius: 8, fontSize: 14, background: theme.bg, color: theme.text,
    boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, background: theme.card, borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.primary }}>My Closet Manager</h1>
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
            <input name="nickname" placeholder="닉네임 *" value={form.nickname} onChange={handleChange} required style={inputStyle} />
          )}
          <input name="password" type="password" placeholder={isRegister ? '비밀번호 (영문+숫자+특수문자 8자 이상)' : '비밀번호'} value={form.password} onChange={handleChange} required style={inputStyle} />
          {isRegister && (
            <input name="passwordConfirm" type="password" placeholder="비밀번호 확인" value={form.passwordConfirm} onChange={handleChange} required style={{
              ...inputStyle,
              borderColor: form.passwordConfirm && form.password !== form.passwordConfirm ? '#EF4444' : inputStyle.borderColor,
            }} />
          )}
          {isRegister && form.passwordConfirm && form.password !== form.passwordConfirm && (
            <p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>비밀번호가 일치하지 않습니다.</p>
          )}
          {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
          <button
            type="submit"
            style={{
              marginTop: 4, padding: '12px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: theme.primary, color: theme.primaryText, fontSize: 15, fontWeight: 600,
            }}
          >{isRegister ? '가입하기' : '로그인'}</button>
        </form>
      </div>
    </div>
  );
}
