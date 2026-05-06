import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, LayoutDashboard, Cpu, LogOut, ShieldAlert } from 'lucide-react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import { apiFetch, setApiSession, setApiSessionUpdateHandler, setApiUnauthorizedHandler } from './lib/api';
import BrowserExtension from './components/BrowserExtension';
import AdminDashboard from './components/AdminDashboard';
import ThreatDetails from './components/ThreatDetails';
import MLEngineerDashboard from './components/MLEngineerDashboard';
import Auth from './components/Auth';

const AuthenticatedApp = ({ user, accessToken, activeTab, selectedThreat, onSetTab, onSelectThreat, onBack, onLogout }) => {
  const isAdmin = user.role === 'admin';
  const canAccessMlDashboard = user.role === 'admin' || user.role === 'ml_engineer';

  return (
    <div className="app-container">
      <div className="demo-controls glass-panel">
        <div className="demo-header">
          <Monitor color="var(--accent-cyan)" size={24} />
          <h1>Sentinel AI</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '16px' }}>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
            Logged in as: {isAdmin ? 'Security Admin' : 'End User'}
          </p>
          <button onClick={onLogout} className="btn-text" title="Logout">
            <LogOut size={16} />
          </button>
        </div>

        <div className="view-toggles">
          <button
            className={`tab-btn ${activeTab === 'extension' ? 'active' : ''}`}
            onClick={() => onSetTab('extension')}
          >
            Browser Extension UI
          </button>

          <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => onSetTab('details')}>
            <ShieldAlert size={16} /> Threat Details
          </button>

          {isAdmin ? (
            <>
              <button
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => onSetTab('dashboard')}
              >
                <LayoutDashboard size={16} /> Admin Dashboard
              </button>
            </>
          ) : null}
          {canAccessMlDashboard ? (
            <button
              className={`tab-btn ${activeTab === 'ml-engineer' ? 'active' : ''}`}
              onClick={() => onSetTab('ml-engineer')}
            >
              <Cpu size={16} /> ML Engineer Dashboard
            </button>
          ) : null}
        </div>
      </div>

      <div className="view-container">
        {activeTab === 'extension' && (
          <div className="extension-showcase">
            <div className="browser-mockup glass-panel">
              <div className="browser-bar">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="address-bar">Awaiting analyzed target...</div>
              </div>
              <div className="browser-content">
                <div className="extension-wrapper">
                  <BrowserExtension onThreatDetected={onSelectThreat} userRole={user.role} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboard onSelectThreat={onSelectThreat} accessToken={accessToken} />
        )}

        {activeTab === 'ml-engineer' && canAccessMlDashboard && (
          <MLEngineerDashboard />
        )}

        {activeTab === 'details' && (
          <ThreatDetails threat={selectedThreat} onBack={onBack} />
        )}
      </div>
    </div>
  );
};

function App() {
  const navigate = useNavigate();
  const initialAuth = (() => {
    try {
      const saved = sessionStorage.getItem('phishx_auth');
      if (!saved) return { user: null, tokens: { accessToken: null, refreshToken: null } };
      const parsed = JSON.parse(saved);
      if (parsed?.user && parsed?.accessToken && parsed?.refreshToken) {
        return {
          user: parsed.user,
          tokens: { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken },
        };
      }
    } catch {
      // no-op
    }
    return { user: null, tokens: { accessToken: null, refreshToken: null } };
  })();

  const [user, setUser] = useState(initialAuth.user);
  const [tokens, setTokens] = useState(initialAuth.tokens);
  const [activeTab, setActiveTab] = useState('extension');
  const [selectedThreat, setSelectedThreat] = useState(null);

  const forceLogout = useCallback(() => {
    const empty = { accessToken: null, refreshToken: null };
    setUser(null);
    setTokens(empty);
    setApiSession(empty);
    sessionStorage.removeItem('phishx_auth');
    setActiveTab('extension');
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    setApiSession(tokens);
    setApiSessionUpdateHandler((nextTokens) => {
      setTokens(nextTokens);
      if (user) {
        sessionStorage.setItem('phishx_auth', JSON.stringify({ user, ...nextTokens }));
      }
    });
    setApiUnauthorizedHandler(() => {
      forceLogout();
    });
  }, [tokens, user, forceLogout]);

  const handleLogin = ({ user: userData, accessToken, refreshToken }) => {
    setUser(userData);
    const nextTokens = { accessToken, refreshToken };
    setTokens(nextTokens);
    setApiSession(nextTokens);
    sessionStorage.setItem('phishx_auth', JSON.stringify({ user: userData, accessToken, refreshToken }));
    setActiveTab(userData.role === 'admin' ? 'dashboard' : userData.role === 'ml_engineer' ? 'ml-engineer' : 'extension');
    navigate('/', { replace: true });
  };

  const handleLogout = async () => {
    if (tokens.refreshToken) {
      try {
        await apiFetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        }, { retryOn401: false });
      } catch {
        // ignore
      }
    }
    forceLogout();
  };

  const handleSelectThreat = (threat) => {
    setSelectedThreat(threat);
    setActiveTab('details');
  };

  const handleBack = () => {
    setSelectedThreat(null);
    setActiveTab(user?.role === 'admin' ? 'dashboard' : user?.role === 'ml_engineer' ? 'ml-engineer' : 'extension');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Auth onLogin={handleLogin} />}
      />
      <Route
        path="/signin"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={
          user ? (
            <AuthenticatedApp
              user={user}
              accessToken={tokens.accessToken}
              activeTab={activeTab}
              selectedThreat={selectedThreat}
              onSetTab={setActiveTab}
              onSelectThreat={handleSelectThreat}
              onBack={handleBack}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
