import React from 'react';
import './BrowserExtension.css';

const BrowserExtension = () => {
    return (
        <div className="extension-container glass-panel">
            {/* Header */}
            <div className="ext-header">
                <div className="ext-logo">
                    <div className="logo-pulse"></div>
                    <span>Sentinel AI</span>
                </div>
                <div className="ext-status danger">
                    <span className="status-dot"></span>
                    Phishing Detected
                </div>
            </div>

            {/* Main Risk Meter */}
            <div className="risk-meter-section">
                <div className="risk-circle">
                    <svg viewBox="0 0 100 100" className="circular-chart danger">
                        <path className="circle-bg"
                            d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path className="circle"
                            strokeDasharray="92, 100"
                            d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div className="risk-score">
                        <h2>92%</h2>
                        <span>Threat Score</span>
                    </div>
                </div>
            </div>

            {/* AI Explanation Details */}
            <div className="ai-explanation glass-panel-light">
                <div className="ai-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <h4>AI Analysis Reasoning</h4>
                </div>
                <ul className="reasoning-list">
                    <li>
                        <span className="icon warn">!</span>
                        <span>Domain similarity detected (paypal-login-secure.com)</span>
                    </li>
                    <li>
                        <span className="icon danger">✕</span>
                        <span>Fake login form structure identified</span>
                    </li>
                    <li>
                        <span className="icon info">i</span>
                        <span>Domain registered &lt; 24 hours ago</span>
                    </li>
                </ul>
            </div>

            {/* Actions */}
            {/* Actions */}
            <div className="ext-actions">
                <button className="btn-primary" onClick={() => alert("Navigating back to a safe page...")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Go Back to Safety
                </button>
                <div className="secondary-actions">
                    <button className="btn-text" onClick={() => alert("Proceeding to dangerous site at your own risk.")}>Proceed Anyway</button>
                    <button className="btn-text danger-text" onClick={() => alert("Site reported to Sentinel AI security team.")}>Report Site</button>
                </div>
            </div>
        </div>
    );
};

export default BrowserExtension;
