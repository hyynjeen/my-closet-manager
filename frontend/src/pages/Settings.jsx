import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';

const NAV_LINKS = [
  { to: '/wardrobe', label: '내 옷장' },
  { to: '/outfit', label: '코디 추천' },
  { to: '/calendar', label: '착용 기록' },
];

export default function Settings() {
  const { theme, themeKey, changeTheme, themes } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <NavBar links={NAV_LINKS} />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ margin: '0 0 32px', fontSize: 20, fontWeight: 700 }}>환경설정</h2>

        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 28 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>테마</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: theme.subText }}>앱의 색상 테마를 선택하세요</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                onClick={() => changeTheme(key)}
                style={{
                  padding: '16px', borderRadius: 12,
                  border: `2px solid ${themeKey === key ? theme.primary : theme.border}`,
                  background: t.bg, cursor: 'pointer', textAlign: 'left',
                  boxShadow: themeKey === key ? `0 0 0 3px ${theme.primary}22` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.primary, border: '1px solid rgba(0,0,0,0.1)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{t.name}</span>
                  {themeKey === key && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: theme.primary, fontWeight: 700 }}>✓ 선택됨</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[t.navBg, t.bg, t.card, t.primary, t.accent].map((c, i) => (
                    <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
