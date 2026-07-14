import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { user, role, logout } = useAuth();

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand-name">QEA Agentic AI Hub</Link>
        <nav className="nav">
          <a href="#solutions">Agents</a>
          <a href="#request">Request an Agent</a>
          {role === 'admin' && (
            <Link to="/admin" className="nav-cta btn btn-ghost btn-sm">
              Admin
            </Link>
          )}
          <span className="session-pill">{user?.displayName || user?.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout} type="button">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
