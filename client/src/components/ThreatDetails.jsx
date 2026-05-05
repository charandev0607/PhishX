import React from 'react';
import { ArrowLeft, FileText, AlertOctagon, Code, MapPin, Search, ShieldCheck } from 'lucide-react';
import './ThreatDetails.css';

const ThreatDetails = ({ threat, onBack }) => {
  if (!threat) {
    return (
      <div className="threat-layout">
        <header className="threat-header glass-panel">
          <div className="threat-title">
            <button className="back-btn" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>
            <div className="title-info">
              <h2>Threat Forensic Report</h2>
              <span className="threat-id">No threat selected</span>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const displayThreat = threat;

  const normalizedReasoning = (displayThreat.aiReasoning && displayThreat.aiReasoning.length
    ? displayThreat.aiReasoning
    : (displayThreat.reasons || []).map((reason, index) => ({
        score: `${Math.max(55, (displayThreat.score || 50) - index * 7)}%`,
        state: (displayThreat.score || 0) >= 70 ? 'danger' : 'warning',
        title: `Detection Signal ${index + 1}`,
        desc: reason,
      }))
  );

  const normalizedUrlAnalysis = (displayThreat.urlAnalysis && displayThreat.urlAnalysis.length
    ? displayThreat.urlAnalysis
    : [
        {
          part: 'Target',
          value: displayThreat.target || displayThreat.input || 'Unknown',
          state: (displayThreat.score || 0) >= 70 ? 'danger' : 'warning',
          note: displayThreat.status || 'analysis',
        },
      ]
  );

  const normalizedEvents = (displayThreat.events && displayThreat.events.length
    ? displayThreat.events
    : [
        {
          time: displayThreat.createdAt ? new Date(displayThreat.createdAt).toLocaleString() : 'N/A',
          desc: 'Threat analysis completed by detection pipeline',
          state: (displayThreat.score || 0) >= 70 ? 'danger' : 'accent',
        },
      ]
  );

  const isCritical = displayThreat.severity === 'critical';

  const getScoreColor = () => {
    if (displayThreat.score > 85) return 'danger';
    if (displayThreat.score > 60) return 'warning';
    return 'accent';
  };

  return (
    <div className="threat-layout">
      {/* Header */}
      <header className="threat-header glass-panel">
        <div className="threat-title">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="title-info">
            <h2>Threat Forensic Report</h2>
            <span className="threat-id">ID: #{displayThreat.id}</span>
          </div>
        </div>
        <div className="threat-actions">
          <button className="btn-outline" type="button">
            <FileText size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Export PDF
          </button>
          <button className="btn-danger" type="button">
            <AlertOctagon size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Quarantine Domain
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="threat-grid">

        {/* Left Column */}
        <div className="threat-col-left">

          {/* Overview Card */}
          <div className="glass-panel threat-card overview-card">
            <div className="overview-top">
              <div className="gauge-container">
                <svg viewBox="0 0 100 50" className={`gauge-svg ${getScoreColor()}`}>
                  <path className="gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" />
                  <path className="gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50"
                    strokeDasharray="125"
                    strokeDashoffset={125 - (125 * (displayThreat.score / 100))} />
                </svg>
                <div className="gauge-value">
                  <span className={`score ${getScoreColor()}-text`}>{displayThreat.score}</span>
                  <span className={`label ${getScoreColor()}-text`}>
                    {displayThreat.severity.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="classification-details">
                <div className="badge-row">
                  <span className={`class-badge ${getScoreColor()}`}>
                    {displayThreat.type || 'Phishing Attack'}
                  </span>
                  {isCritical && <span className="class-badge danger">Zero-Day Profile</span>}
                </div>
                <h3>{displayThreat.target}</h3>
                <p className="target-brand">Targeted Brand: <strong>{displayThreat.brand}</strong></p>
                <div className="ip-info-flex">
                  <MapPin size={14} />
                  <span>IP: {displayThreat.ip} • Hosted in: {displayThreat.location}</span>
                </div>
              </div>
            </div>

            <div className="timeline-container">
              <div className="timeline-header">Detection Timeline</div>
              <div className="timeline">
                {normalizedEvents.map((event, idx) => (
                  <div key={`${event.time}-${idx}`} className={`timeline-item ${idx === normalizedEvents.length - 1 ? 'active' : ''}`}>
                    <div className={`t-dot t-${event.state || 'accent'}`}></div>
                    <div className="t-content">
                      <span className="t-time">{event.time}</span>
                      <span className="t-desc">{event.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Reasoning Panel */}
          <div className="glass-panel threat-card">
            <div className="card-header">
              <ShieldCheck className="icon-cyan" size={20} />
              <h3>AI Analysis Engine</h3>
            </div>

            <div className="reasoning-grid">
              {normalizedReasoning.map((reason, i) => (
                <div key={i} className={`reason-item glass-panel-light highlight-${reason.state}`}>
                  <div className="r-score">{reason.score}</div>
                  <div className="r-detail">
                    <h4>{reason.title}</h4>
                    <p>{reason.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="threat-col-right">
          {/* URL Breakdown */}
          <div className="glass-panel threat-card">
            <div className="card-header">
              <Search size={20} />
              <h3>URL Forensic Breakdown</h3>
            </div>
            <div className="url-breakdown">
              {normalizedUrlAnalysis.map((part, i) => (
                <div key={i} className={`url-part ${part.state}`}>
                  <span className="part-label">{part.part}</span>
                  <span className="part-value">{part.value}</span>
                  {part.note && <span className="part-note">{part.note}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Event Logs */}
          <div className="glass-panel threat-card code-panel">
            <div className="card-header">
              <Code size={20} />
              <h3>Analysis Metadata</h3>
            </div>
            <pre className="log-output">
              {JSON.stringify(
                {
                  id: displayThreat.id,
                  score: displayThreat.score,
                  status: displayThreat.status,
                  severity: displayThreat.severity,
                  target: displayThreat.target || displayThreat.input || null,
                  metadata: displayThreat.metadata || null,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ThreatDetails;
