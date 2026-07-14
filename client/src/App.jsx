import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Hub from './pages/Hub.jsx';
import Admin from './pages/Admin.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function RequireAuth({ children, roles }) {
  const { isAuthed, role } = useAuth();
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/hub" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/hub" element={<RequireAuth><Hub /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth roles={['admin']}><Admin /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
