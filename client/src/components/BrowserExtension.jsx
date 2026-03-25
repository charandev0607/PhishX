import React, { useState } from 'react';
import './BrowserExtension.css';

const BrowserExtension = () => {
    const [scanState, setScanState] = useState('idle'); // idle, scanning, analyzing, detecting, storing, complete

    const startScan = () => {
        setScanState('scanning');
        setTimeout(() => setScanState('analyzing'), 1500);
        setTimeout(() => setScanState('detecting'), 3000);
        setTimeout(() => setScanState('storing'), 4500);
        setTimeout(() => setScanState('complete'), 5500);
    };

    return (
        <div className={`extension-container glass-panel ${scanState !== 'idle' && scanState !== 'complete' ? 'is-scanning' : ''}`}>
            {/* Header */}
            <div className="ext-header">
                <div className="ext-logo">
                    <div className="logo-pulse"></div>
                    <span>Sentinel AI</span>
                </div>
                {scanState === 'complete' && (
                    <div className="ext-status danger">
                        <span className="status-dot"></span>
                        Phishing Detected
                    </div>
                )}
            </div>

            {/* Idle State */}
            {scanState === 'idle' && (
                <div className="scan-flow-section">
                    <div className="scan-icon-wrapper">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                    </div>
                    <div className="scan-text">
                        <h3>Ready to Scan</h3>
                        <p>Analyze this page for phishing threats</p>
                    </div>
                    <button className="btn-primary scan-btn" onClick={startScan}>
                        Scan URL / Email
                    </button>
                </div>
            )}

            {/* Active Scan States */}
            {['scanning', 'analyzing', 'detecting', 'storing'].includes(scanState) && (
                <div className="scan-flow-section active-scan">
                    <div className="scanning-animation">
                        <div className="scanner-target">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="scan-status-text">
                        {scanState === 'scanning' && 'Scanning URL / Email...'}
                        {scanState === 'analyzing' && 'Analyzing URL using ML Model...'}
                        {scanState === 'detecting' && 'Detecting Suspicious Patterns...'}
                        {scanState === 'storing' && 'Storing Incident Data...'}
                    </h3>
                    <div className="progress-bar-container">
                        <div className={`progress-filled state-${scanState}`}></div>
                    </div>
                </div>
            )}

            {/* Complete State */}
            {scanState === 'complete' && (
                <>
                    {/* Main Risk Meter */}
                    <div className="risk-meter-section fade-in">
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
                    <div className="ai-explanation glass-panel-light fade-in delay-1">
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
                    <div className="ext-actions fade-in delay-2">
                        <button className="btn-primary" onClick={() => alert("Navigating back to a safe page...")}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            Go Back to Safety
                        </button>
                        <div className="secondary-actions">
                            <button className="btn-text" onClick={() => alert("Proceeding to dangerous site at your own risk.")}>Proceed Anyway</button>
                            <button className="btn-text danger-text" onClick={() => alert("Reporting Suspicious Link to Sentinel AI...")}>Report Suspicious Link</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BrowserExtension;
