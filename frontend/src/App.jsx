import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Wardrobe from './pages/Wardrobe';
import Outfit from './pages/Outfit';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/wardrobe" element={<PrivateRoute><Wardrobe /></PrivateRoute>} />
        <Route path="/outfit" element={<PrivateRoute><Outfit /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
