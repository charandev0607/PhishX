import React, { useState } from 'react';
import './BrowserExtension.css';
import { analyzeEmail, analyzeUrl } from '../services/api';

const toStatusLabel = (score) => {
    if (score >= 70) return 'Phishing Risk';
    if (score >= 40) return 'Suspicious';
    return 'Safe';
};

const toIndicatorClass = (score) => {
    if (score >= 70) return 'danger';
    if (score >= 40) return 'warn';
    return 'safe';
};

const recommendedAction = (status, score) => {
    if (status === 'phishing' || score >= 70) return 'Block navigation and quarantine the destination.';
    if (status === 'suspicious' || score >= 40) return 'Proceed only with verification and MFA challenge.';
    return 'Allow access and continue passive monitoring.';
};

const BrowserExtension = ({ onThreatSelected, latestAlert }) => {
    const [scanState, setScanState] = useState('idle');
    const [mode, setMode] = useState('url');
    const [urlInput, setUrlInput] = useState('https://paypal-security-update-verify.com/login');
    const [emailSubject, setEmailSubject] = useState('Urgent: Verify your payroll account');
    const [emailBody, setEmailBody] = useState('Please verify your login immediately to prevent account suspension.');
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const startScan = async () => {
        try {
            setIsLoading(true);
            setError('');
            setResult(null);
            setScanState('scanning');

            let response;
            if (mode === 'url') {
                setScanState('analyzing');
                response = await analyzeUrl({
                    url: urlInput,
                    pageHtml: '<form><input type="password" /></form>',
                    scriptContent: 'eval("obfuscated")',
                });
            } else {
                setScanState('analyzing');
                response = await analyzeEmail({
                    subject: emailSubject,
                    body: emailBody,
                });
            }

            setScanState('detecting');
            const normalized = {
                ...response,
                statusLabel: toStatusLabel(response.score),
                indicatorClass: toIndicatorClass(response.score),
                recommendedAction: recommendedAction(response.status, response.score),
            };

            setResult(normalized);
            setScanState('complete');
        } catch (scanError) {
            setScanState('idle');
            setError(scanError.message || 'Scan failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const openThreatDetails = () => {
        if (!result || !onThreatSelected) return;

        const detailsPayload = {
            id: `EXT-${Date.now()}`,
            target: mode === 'url' ? urlInput : 'email://message',
            brand: 'Unknown',
            severity: result.score >= 85 ? 'critical' : result.score >= 70 ? 'high' : result.score >= 40 ? 'medium' : 'low',
            score: result.score,
            type: mode === 'url' ? 'URL Analysis' : 'Email Analysis',
            location: 'N/A',
            ip: 'N/A',
            aiReasoning: (result.reasons || []).map((reason, index) => ({
                score: `${Math.max(50, result.score - index * 8)}%`,
                state: result.score >= 70 ? 'danger' : 'warning',
                title: `Signal ${index + 1}`,
                desc: reason,
            })),
            urlAnalysis: [
                { part: 'Input', value: mode === 'url' ? urlInput : emailSubject, state: result.indicatorClass, note: result.statusLabel },
                { part: 'Action', value: result.recommendedAction, state: 'warning', note: '' },
            ],
        };

        onThreatSelected(detailsPayload);
    };

    return (
        <div className={`extension-container glass-panel ${scanState !== 'idle' && scanState !== 'complete' ? 'is-scanning' : ''}`}>
            <div className="ext-header">
                <div className="ext-logo">
                    <div className="logo-pulse"></div>
                    <span>Sentinel AI</span>
                </div>
                {result && (
                    <div className={`ext-status ${result.indicatorClass}`}>
                        <span className="status-dot"></span>
                        {result.statusLabel}
                    </div>
                )}
            </div>

            <div className="analysis-mode-toggle">
                <button className={`mode-btn ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>
                    URL Scan
                </button>
                <button className={`mode-btn ${mode === 'email' ? 'active' : ''}`} onClick={() => setMode('email')}>
                    Email Scan
                </button>
            </div>

            {mode === 'url' ? (
                <div className="scan-input-group">
                    <label>Manual URL Paste & Scan</label>
                    <input
                        className="scan-input"
                        type="url"
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        placeholder="https://example.com"
                    />
                </div>
            ) : (
                <div className="scan-input-group">
                    <label>Email Subject</label>
                    <input
                        className="scan-input"
                        type="text"
                        value={emailSubject}
                        onChange={(event) => setEmailSubject(event.target.value)}
                        placeholder="Subject"
                    />
                    <label>Email Body</label>
                    <textarea
                        className="scan-input"
                        rows={4}
                        value={emailBody}
                        onChange={(event) => setEmailBody(event.target.value)}
                        placeholder="Paste email content"
                    />
                </div>
            )}

            {latestAlert ? (
                <div className="realtime-popup">
                    <strong>Real-Time Alert:</strong> {latestAlert.detail}
                </div>
            ) : null}

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
                        <p>Analyze links and suspicious messages in real-time</p>
                    </div>
                    <button className="btn-primary scan-btn" onClick={startScan} disabled={isLoading}>
                        {isLoading ? 'Scanning...' : 'Scan Now'}
                    </button>
                    {error ? <p style={{ color: 'var(--status-danger)' }}>{error}</p> : null}
                </div>
            )}

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

            {scanState === 'complete' && result && (
                <>
                    <div className="risk-meter-section fade-in">
                        <div className="risk-circle">
                            <svg viewBox="0 0 100 100" className={`circular-chart ${result.indicatorClass}`}>
                                <path className="circle-bg"
                                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path className="circle"
                                    strokeDasharray={`${result.score}, 100`}
                                    d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="risk-score">
                                <h2>{result.score}%</h2>
                                <span>Threat Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="ai-explanation glass-panel-light fade-in delay-1">
                        <div className="ai-header">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            <h4>Threat Details Panel</h4>
                        </div>
                        <ul className="reasoning-list">
                            {(result.reasons || []).map((reason) => (
                                <li key={reason}>
                                    <span className={`icon ${result.indicatorClass === 'safe' ? 'info' : result.indicatorClass}`}>
                                        {result.indicatorClass === 'danger' ? '!' : result.indicatorClass === 'warn' ? '!' : 'i'}
                                    </span>
                                    <span>{reason}</span>
                                </li>
                            ))}
                        </ul>
                        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                            Recommended Action: <strong style={{ color: 'var(--text-primary)' }}>{result.recommendedAction}</strong>
                        </p>
                    </div>

                    <div className="ext-actions fade-in delay-2">
                        <button className="btn-primary" onClick={openThreatDetails}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            Open Detailed Forensics
                        </button>
                        <div className="secondary-actions">
                            <button className="btn-text" onClick={() => setScanState('idle')}>New Scan</button>
                            <button className="btn-text danger-text" onClick={() => setUrlInput('https://paypal-security-update-verify.com/login')}>Load Test Threat</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BrowserExtension;
