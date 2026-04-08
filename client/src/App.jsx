import React, { useEffect, useState } from 'react';
import { Monitor, LayoutDashboard, Search, Cpu, LogOut } from 'lucide-react';
import './App.css';
import { apiFetch, setApiSession, setApiSessionUpdateHandler } from './lib/api';

// Components
import BrowserExtension from './components/BrowserExtension';
import AdminDashboard from './components/AdminDashboard';
import ThreatDetails from './components/ThreatDetails';
import MLEngineerDashboard from './components/MLEngineerDashboard';
import Auth from './components/Auth';
import {
  SOCKET_BASE,
  clearAuth,
  getPollEvents,
  getStoredAuth,
  getSystemHealth,
  logout,
} from './services/api';

const MAX_ALERTS = 8;

function App() {
  const initialAuth = (() => {
    try {
      const saved = localStorage.getItem('phishx_auth');
      if (!saved) return { user: null, tokens: { accessToken: null, refreshToken: null } };
      const parsed = JSON.parse(saved);
      if (parsed?.user && parsed?.accessToken && parsed?.refreshToken) {
        return {
          user: parsed.user,
          tokens: { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken },
        };
      }
      return { user: null, tokens: { accessToken: null, refreshToken: null } };
    } catch {
      return { user: null, tokens: { accessToken: null, refreshToken: null } };
    }
  })();

  const [user, setUser] = useState(initialAuth.user); // null means not logged in
  const [tokens, setTokens] = useState(initialAuth.tokens);
  const [activeTab, setActiveTab] = useState('extension');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const socketRef = useRef(null);
  const latestPollCursorRef = useRef(null);

  const user = auth?.user || null;
  const isAdmin = user?.role === 'admin';
  const latestAlert = useMemo(() => realtimeAlerts[0] || null, [realtimeAlerts]);

  useEffect(() => {
    setApiSession(tokens);
    setApiSessionUpdateHandler((nextTokens) => {
      setTokens(nextTokens);
      if (user) {
        localStorage.setItem('phishx_auth', JSON.stringify({ user, ...nextTokens }));
      }
    });
  }, [tokens, user]);

  const handleLogin = ({ user: userData, accessToken, refreshToken }) => {
    setUser(userData);
    const nextTokens = { accessToken, refreshToken };
    setTokens(nextTokens);
    setApiSession(nextTokens);
    localStorage.setItem('phishx_auth', JSON.stringify({ user: userData, accessToken, refreshToken }));
    // If admin logs in, show admin dashboard default. If user, show extension.
    setActiveTab(userData.role === 'admin' ? 'dashboard' : 'extension');
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
        // Ignore logout API errors during local signout.
      }
    }
    setUser(null);
    const empty = { accessToken: null, refreshToken: null };
    setTokens(empty);
    setApiSession(empty);
    localStorage.removeItem('phishx_auth');
    setActiveTab('extension');
  };

  const handleSelectThreat = (threat) => {
    setSelectedThreat(threat);
    setActiveTab('details');
  };

  const handleBackToDashboard = () => {
    setSelectedThreat(null);
    setActiveTab(user?.role === 'admin' ? 'dashboard' : 'extension');
  };

  if (!user) {
    return <Auth onLoginSuccess={handleLogin} />;
  }

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
          <button onClick={handleLogout} className="btn-text" title="Logout">
            <LogOut size={16} />
          </button>
        </div>

        {latestAlert ? (
          <div className="live-alert-badge">
            <Bell size={16} />
            <span>{latestAlert.title}: {latestAlert.detail}</span>
          </div>
        ) : null}
        
        <div className="view-toggles">
          <button
            className={`tab-btn ${activeTab === 'extension' ? 'active' : ''}`}
            onClick={() => setActiveTab('extension')}
          >
            Browser Extension UI
          </button>
          
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <ShieldAlert size={16} /> Threat Details
          </button>

          {isAdmin ? (
            <>
              <button
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <LayoutDashboard size={16} /> Admin Dashboard
              </button>
              <button
                className={`tab-btn ${activeTab === 'ml-engineer' ? 'active' : ''}`}
                onClick={() => setActiveTab('ml-engineer')}
              >
                <Cpu size={16} /> ML Engineer Dashboard
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="view-container">
        {activeTab === 'extension' && (
          <div className="extension-showcase">
            <div className="browser-mockup glass-panel">
              <div className="browser-bar">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="address-bar danger-url">
                  https://paypal-security-update-verify.com/login
                </div>
              </div>
              <div className="browser-content">
                <div className="extension-wrapper">
                  <BrowserExtension onThreatDetected={handleSelectThreat} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboard
            onSelectThreat={handleSelectThreat}
            liveAlerts={realtimeAlerts}
            systemHealth={health}
            userRole={user.role}
          />
        )}

        {activeTab === 'ml-engineer' && isAdmin && (
          <MLEngineerDashboard />
        )}

        {activeTab === 'details' && (
          <ThreatDetails
            threat={selectedThreat || latestAlert?.payload || null}
            onBack={handleBackToDashboard}
          />
        )}
      </div>
    </div>
  );
}

export default App;
