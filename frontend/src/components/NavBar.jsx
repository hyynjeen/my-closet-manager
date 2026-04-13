import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

export default function NavBar({ links = [] }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initial = (user.nickname || '?')[0].toUpperCase();

  return (
    <nav style={{
      background: theme.navBg, padding: '0 32px', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <span style={{ color: theme.navText, fontWeight: 700, fontSize: 17 }}>My Closet Manager</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {links.map(({ to, label }) => (
          <Link key={to} to={to} style={{ color: theme.navText, textDecoration: 'none', fontSize: 14 }}>
            {label}
          </Link>
        ))}

        {/* 프로필 드롭다운 */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.35)',
              cursor: 'pointer', overflow: 'hidden', padding: 0,
              background: theme.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {user.profile_image
              ? <img src={user.profile_image} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: theme.primaryText, fontSize: 14, fontWeight: 700 }}>{initial}</span>
            }
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 44,
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: 175, zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{user.nickname || '사용자'}</div>
                <div style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>{user.email || ''}</div>
              </div>
              <Link to="/profile" onClick={() => setOpen(false)}
                style={{ display: 'block', padding: '12px 16px', color: theme.text, textDecoration: 'none', fontSize: 14, borderBottom: `1px solid ${theme.border}` }}>
                회원정보 수정
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)}
                style={{ display: 'block', padding: '12px 16px', color: theme.text, textDecoration: 'none', fontSize: 14, borderBottom: `1px solid ${theme.border}` }}>
                환경설정
              </Link>
              <button onClick={handleLogout}
                style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#EF4444' }}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
