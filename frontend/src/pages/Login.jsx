import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
    if (!res.ok) {
      setError(data.error || '오류가 발생했습니다.');
      return;
    }

    if (isRegister) {
      setIsRegister(false);
      setForm({ email: '', password: '', nickname: '' });
      alert('회원가입 성공! 로그인해주세요.');
    } else {
      localStorage.setItem('token', data.access_token);
      navigate('/wardrobe');
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <h2>{isRegister ? '회원가입' : '로그인'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>이메일</label><br />
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </div>
        {isRegister && (
          <div style={{ marginTop: 12 }}>
            <label>닉네임</label><br />
            <input name="nickname" value={form.nickname} onChange={handleChange} />
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <label>비밀번호</label><br />
          <input name="password" type="password" value={form.password} onChange={handleChange} required />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ marginTop: 16 }}>
          {isRegister ? '가입하기' : '로그인'}
        </button>
      </form>
      <button
        onClick={() => { setIsRegister(!isRegister); setError(''); }}
        style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'blue' }}
      >
        {isRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
      </button>
    </div>
  );
}
