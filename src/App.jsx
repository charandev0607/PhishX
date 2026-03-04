import React, { useState } from 'react';
import { Monitor, LayoutDashboard, Search } from 'lucide-react';
import './App.css';

// Components
import BrowserExtension from './components/BrowserExtension';
import AdminDashboard from './components/AdminDashboard';
import ThreatDetails from './components/ThreatDetails';

function App() {
  const [activeTab, setActiveTab] = useState('extension');
  const [selectedThreat, setSelectedThreat] = useState(null);

  const handleSelectThreat = (threat) => {
    setSelectedThreat(threat);
    setActiveTab('details'); // Switch to details view when a threat is selected
  };

  const handleBackToDashboard = () => {
    setSelectedThreat(null);
    setActiveTab('dashboard');
  };

  return (
    <div className="app-container">
      {/* Demo Controls - Not part of actual UI, just for switching views */}
      <div className="demo-controls glass-panel">
        <div className="demo-header">
          <Monitor color="var(--accent-cyan)" size={24} />
          <h1>Sentinel AI Demo</h1>
        </div>
        <p>Real-Time AI/ML Phishing Detection System</p>
        <div className="view-toggles">
          <button
            className={`tab-btn ${activeTab === 'extension' ? 'active' : ''}`}
            onClick={() => setActiveTab('extension')}
          >
            Browser Extension UI
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Admin Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Threat Details View
          </button>
        </div >
      </div >

      {/* Main View Area */}
      < div className="view-container" >
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
        )
        }

        {
          activeTab === 'dashboard' && (
            <AdminDashboard onSelectThreat={handleSelectThreat} />
          )
        }

        {
          activeTab === 'details' && (
            <ThreatDetails threat={selectedThreat} onBack={handleBackToDashboard} />
          )
        }
      </div >
    </div >
  );
}

export default App;
