import React, { useState } from 'react';
import { Monitor, LayoutDashboard, Search, Cpu, LogOut } from 'lucide-react';
import './App.css';

// Components
import BrowserExtension from './components/BrowserExtension';
import AdminDashboard from './components/AdminDashboard';
import ThreatDetails from './components/ThreatDetails';
import MLEngineerDashboard from './components/MLEngineerDashboard';
import Auth from './components/Auth';

function App() {
  const [user, setUser] = useState(null); // null means not logged in
  const [activeTab, setActiveTab] = useState('extension');
  const [selectedThreat, setSelectedThreat] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    // If admin logs in, show admin dashboard default. If user, show extension.
    setActiveTab(userData.role === 'admin' ? 'dashboard' : 'extension');
  };

  const handleLogout = () => {
    setUser(null);
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

  // If no user is logged in, show the Auth screen
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="app-container">
      {/* Controls Container */}
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
        
        <div className="view-toggles">
          <button
            className={`tab-btn ${activeTab === 'extension' ? 'active' : ''}`}
            onClick={() => setActiveTab('extension')}
          >
            Browser Extension UI
          </button>
          
          {/* Admin / ML Views strictly available to 'admin' role */}
          {isAdmin && (
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
          )}

          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Threat Details View
          </button>
        </div>
      </div>

      {/* Main View Area */}
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
                  <BrowserExtension />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && (
          <AdminDashboard onSelectThreat={handleSelectThreat} />
        )}

        {activeTab === 'ml-engineer' && isAdmin && (
          <MLEngineerDashboard />
        )}

        {activeTab === 'details' && (
          <ThreatDetails threat={selectedThreat} onBack={handleBackToDashboard} />
        )}
      </div>
    </div>
  );
}

export default App;
