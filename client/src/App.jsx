import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Monitor, LayoutDashboard, Cpu, LogOut, Bell, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import './App.css';

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
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [activeTab, setActiveTab] = useState('extension');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const socketRef = useRef(null);
  const latestPollCursorRef = useRef(null);

  const user = auth?.user || null;
  const isAdmin = user?.role === 'admin';
  const latestAlert = useMemo(() => realtimeAlerts[0] || null, [realtimeAlerts]);

  const pushRealtimeAlert = (alert) => {
    setRealtimeAlerts((prev) => {
      const next = [alert, ...prev.filter((item) => item.id !== alert.id)].slice(0, MAX_ALERTS);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchInitialHealth = async () => {
      try {
        const snapshot = await getSystemHealth();
        if (!cancelled) {
          setHealth(snapshot);
        }
      } catch {
        // Ignore transient health errors.
      }
    };

    fetchInitialHealth();
    const timer = setInterval(fetchInitialHealth, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!auth?.accessToken) {
      return undefined;
    }

    const socket = io(SOCKET_BASE, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('incident:new', (incident) => {
      pushRealtimeAlert({
        id: incident.id || incident._id || `${Date.now()}-${Math.random()}`,
        title: 'New Threat Detected',
        severity: incident.status || 'suspicious',
        detail: `${incident.type || 'threat'} • score ${incident.score ?? 'n/a'}`,
        payload: incident,
      });
    });

    socket.on('system:health', (snapshot) => {
      setHealth(snapshot);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth?.accessToken]);

  useEffect(() => {
    if (!auth?.accessToken) {
      return undefined;
    }

    const pollEvents = async () => {
      try {
        const data = await getPollEvents({ since: latestPollCursorRef.current });
        const incidents = data?.incidents || [];

        incidents.forEach((incident) => {
          pushRealtimeAlert({
            id: incident.id || incident._id || `${Date.now()}-${Math.random()}`,
            title: 'Threat Activity Update',
            severity: incident.status || 'suspicious',
            detail: `${incident.type || 'threat'} • score ${incident.score ?? 'n/a'}`,
            payload: incident,
          });
        });

        if (incidents.length > 0) {
          latestPollCursorRef.current = incidents[incidents.length - 1].createdAt;
        }

        if (data?.health) {
          setHealth(data.health);
        }
      } catch {
        // Ignore intermittent polling errors.
      }
    };

    pollEvents();
    const timer = setInterval(pollEvents, 20000);
    return () => clearInterval(timer);
  }, [auth?.accessToken]);

  const handleLogin = (authState) => {
    setAuth(authState);
    setActiveTab(authState.user.role === 'admin' ? 'dashboard' : 'extension');
  };

  const handleLogout = async () => {
    await logout();
    clearAuth();
    setAuth(null);
    setSelectedThreat(null);
    setRealtimeAlerts([]);
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
                  <BrowserExtension
                    onThreatSelected={handleSelectThreat}
                    latestAlert={latestAlert}
                  />
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
