import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ACCESS_LEVELS = [
  { id: 'user', label: 'User' },
  { id: 'admin', label: 'Admin' },
];

export default function AuthPage() {
  const { isAuthed, role, login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [selectedRole, setSelectedRole] = useState('user');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired] = useState(() => {
    const flag = sessionStorage.getItem('cz_session_expired');
    if (flag) sessionStorage.removeItem('cz_session_expired');
    return Boolean(flag);
  });

  if (isAuthed) {
    return <Navigate to={role === 'admin' ? '/admin' : '/hub'} replace />;
  }

  const isRegister = mode === 'register';
  const trimmedUser = username.trim();
  const canSubmit =
    trimmedUser.length > 0 &&
    password.length > 0 &&
    (!isRegister || confirm.length > 0) &&
    !busy;

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setConfirm('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!trimmedUser || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (isRegister) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      const nextUser = isRegister
        ? await register({ email: trimmedUser, password, displayName: displayName.trim() })
        : await login(trimmedUser, password, selectedRole);
      const intendedPath = location.state?.from?.pathname;
      navigate(intendedPath || (nextUser.role === 'admin' ? '/admin' : '/hub'), { replace: true });
    } catch (err) {
      setError(err.message || (isRegister ? 'Registration failed.' : 'Sign in failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="QEA Agentic AI Hub">
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden="true">
            <span />
          </span>
          <div>
            <p>COGNIZANT</p>
            <strong>QE Agentic Hub</strong>
          </div>
        </div>

        <div className="auth-heading">
          <h1>{isRegister ? 'Create your account' : 'Sign in'}</h1>
          <p>
            {isRegister
              ? 'Register with your Cognizant email to access the hub.'
              : 'Use your Cognizant credentials to continue.'}
          </p>
        </div>

        {expired && (
          <div className="auth-alert" role="alert">
            Your session expired. Please sign in again.
          </div>
        )}

        {!isRegister && (
          <div className="access-levels" role="group" aria-label="Select access level">
            {ACCESS_LEVELS.map((level) => (
              <button
                aria-pressed={selectedRole === level.id}
                className={`access-level ${selectedRole === level.id ? 'active' : ''}`}
                key={level.id}
                onClick={() => setSelectedRole(level.id)}
                type="button"
              >
                {level.label}
              </button>
            ))}
          </div>
        )}

        <form className="auth-form" onSubmit={submit} noValidate>
          {isRegister && (
            <div className="field">
              <label htmlFor="portal-name">Full name (optional)</label>
              <input
                autoComplete="name"
                className="input auth-input"
                id="portal-name"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Jane Doe"
                type="text"
                value={displayName}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="portal-email">Email</label>
            <input
              autoComplete={isRegister ? 'email' : 'username'}
              autoFocus
              className="input auth-input"
              id="portal-email"
              inputMode="email"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="you@cognizant.com"
              required
              type="email"
              value={username}
            />
          </div>

          <div className="field">
            <div className="auth-label-row">
              <label htmlFor="portal-password">Password</label>
              {!isRegister && (
                <button className="link-button" type="button">Forgot password?</button>
              )}
            </div>
            <div className="password-shell">
              <input
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="input auth-input"
                id="portal-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? 'At least 6 characters' : 'Enter password'}
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.7 9.7 0 0112 5c5 0 9 4.5 9 7-.4 1.2-1.3 2.5-2.5 3.6M6.1 6.6C4 8 2.8 9.9 2.4 11c.6 1.7 2.5 4 5.2 5.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path
                      d="M2.4 12C3.3 9.3 7.2 5 12 5s8.7 4.3 9.6 7c-.9 2.7-4.8 7-9.6 7s-8.7-4.3-9.6-7z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="field">
              <label htmlFor="portal-confirm">Confirm password</label>
              <input
                autoComplete="new-password"
                className="input auth-input"
                id="portal-confirm"
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Re-enter password"
                required
                type={showPassword ? 'text' : 'password'}
                value={confirm}
              />
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="btn auth-submit" disabled={!canSubmit} type="submit">
            {busy && <span className="auth-spinner" aria-hidden="true" />}
            {busy
              ? isRegister
                ? 'Creating…'
                : 'Signing in…'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="auth-register">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button className="link-button" type="button" onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button className="link-button" type="button" onClick={() => switchMode('register')}>
                Register
              </button>
            </>
          )}
        </p>
      </section>

      <footer className="auth-legal">
        © 2026 Cognizant Technology Solutions. Internal use only.
      </footer>
    </main>
  );
}
