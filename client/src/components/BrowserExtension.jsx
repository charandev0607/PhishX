import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import './BrowserExtension.css';

const BrowserExtension = ({ onThreatDetected }) => {
    const [scanState, setScanState] = useState('idle'); // idle, scanning, analyzing, complete
    const [mode, setMode] = useState('url');
    const [url, setUrl] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const startScan = async () => {
        setError('');
        setResult(null);
        setScanState('scanning');
        try {
            const endpoint = mode === 'url' ? '/api/v1/url-analyze' : '/api/v1/email-analyze';
            const payload = mode === 'url'
                ? { url }
                : { subject, body };
            const res = await apiFetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json?.data) {
                setError(json?.message || 'Analysis failed.');
                setScanState('idle');
                return;
            }
            setResult(json.data);
            setScanState('complete');
            if (onThreatDetected) {
                onThreatDetected({
                    id: `LIVE-${Date.now()}`,
                    target: mode === 'url' ? url : subject,
                    brand: 'Unknown',
                    severity: json.data.score >= 85 ? 'critical' : json.data.score >= 70 ? 'high' : json.data.score >= 40 ? 'medium' : 'low',
                    score: json.data.score,
                    ip: 'N/A',
                    location: 'N/A',
                    type: mode === 'url' ? 'URL Threat' : 'Email Threat',
                    status: json.data.status === 'phishing' ? 'Blocked' : json.data.status === 'suspicious' ? 'Quarantined' : 'Allowed',
                    urlAnalysis: [],
                    aiReasoning: (json.data.reasons || []).map((reason) => ({
                        score: `${json.data.score}%`,
                        state: json.data.score >= 70 ? 'danger' : 'warning',
                        title: 'Detection Signal',
                        desc: reason,
                    })),
                });
            }
        } catch {
            setError('Could not connect to analysis API.');
            setScanState('idle');
        }
    };

    return (
        <div className={`extension-container glass-panel ${scanState !== 'idle' && scanState !== 'complete' ? 'is-scanning' : ''}`}>
            <div className="ext-header">
                <div className="ext-logo">
                    <div className="logo-pulse"></div>
                    <span>Sentinel AI</span>
                </div>
                {result && (
                    <div className="ext-status danger">
                        <span className="status-dot"></span>
                        {result.status || 'Analysis Complete'}
                    </div>
                )}
            </div>

            {(scanState === 'idle' || scanState === 'complete') && (
                <div className="scan-flow-section">
                    <div className="scan-icon-wrapper">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                    </div>
                    <div className="scan-text">
                        <h3>Ready to Scan</h3>
                        <p>Analyze real URL or email content for phishing threats</p>
                    </div>
                    <div style={{ width: '100%', display: 'grid', gap: '10px' }}>
                        <div className="role-selector">
                            <button type="button" className={`role-btn ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>URL</button>
                            <button type="button" className={`role-btn ${mode === 'email' ? 'active' : ''}`} onClick={() => setMode('email')}>Email</button>
                        </div>
                        {mode === 'url' ? (
                            <input
                                className="form-input"
                                type="url"
                                placeholder="https://example.com/login"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        ) : (
                            <>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Email subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                                <textarea
                                    className="form-input"
                                    rows={4}
                                    placeholder="Email body"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                />
                            </>
                        )}
                        {error && <p style={{ color: '#ff5f7a' }}>{error}</p>}
                        <button className="btn-primary scan-btn" onClick={startScan}>
                            Scan {mode === 'url' ? 'URL' : 'Email'}
                        </button>
                    </div>
                </div>
            )}

            {/* Active Scan States */}
            {['scanning'].includes(scanState) && (
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
                    </h3>
                    <div className="progress-bar-container">
                        <div className={`progress-filled state-${scanState}`}></div>
                    </div>
                </div>
            )}

            {scanState === 'complete' && result && (
                <>
                    <div className="risk-meter-section fade-in">
                        <div className="risk-circle">
                            <svg viewBox="0 0 100 100" className="circular-chart danger">
                                <path className="circle-bg"
                                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path className="circle"
                                    strokeDasharray={`${result.score || 0}, 100`}
                                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="risk-score">
                                <h2>{result?.score ?? 0}%</h2>
                                <span>Threat Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="ai-explanation glass-panel-light fade-in delay-1">
                        <div className="ai-header">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <h4>AI Analysis Reasoning</h4>
                        </div>
                        <ul className="reasoning-list">
                            {(result?.reasons || []).map((reason, idx) => (
                                <li key={idx}>
                                    <span className="icon info">i</span>
                                    <span>{reason}</span>
                                </li>
                            ))}
                        </ul>
                        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                            Recommended Action: <strong style={{ color: 'var(--text-primary)' }}>Review and quarantine if suspicious.</strong>
                        </p>
                    </div>

                    <div className="ext-actions fade-in delay-2">
                        <button className="btn-primary" onClick={() => { setScanState('idle'); setResult(null); }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            New Scan
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default BrowserExtension;
