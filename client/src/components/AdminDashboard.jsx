import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Bell, FileText, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import './AdminDashboard.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="custom-tooltip glass-panel-light">
      <p className="label">{label}</p>
      <p className="intro">{`${payload[0].name}: ${payload[0].value}`}</p>
    </div>
  );
};

const AdminDashboard = ({ onSelectThreat }) => {
  const [incidents, setIncidents] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [incResp, healthResp] = await Promise.all([
          apiFetch('/api/v1/incidents?limit=200'),
          apiFetch('/api/v1/system/health'),
        ]);
        if (incResp.ok) {
          const json = await incResp.json();
          setIncidents(json?.data?.items ?? []);
        }
        if (healthResp.ok) {
          const json = await healthResp.json();
          setSystemHealth(json?.data ?? null);
        }
      } catch {
        setIncidents([]);
        setSystemHealth(null);
      }
    };
    loadData();
  }, []);

  const mappedThreatFeed = useMemo(
    () =>
      incidents.map((incident) => ({
        id: incident._id,
        time: new Date(incident.createdAt).toLocaleTimeString(),
        type: incident.type === 'url' ? 'URL Threat' : 'Email Threat',
        target: incident.input,
        severity: incident.score >= 85 ? 'critical' : incident.score >= 70 ? 'high' : incident.score >= 40 ? 'medium' : 'low',
        status: incident.status === 'phishing' ? 'Blocked' : incident.status === 'suspicious' ? 'Quarantined' : 'Allowed',
        score: incident.score,
        aiReasoning: (incident.reasons || []).map((reason) => ({
          score: `${incident.score}%`,
          state: incident.score >= 70 ? 'danger' : 'warning',
          title: 'Detection Signal',
          desc: reason,
        })),
        urlAnalysis: [],
      })),
    [incidents]
  );

  const trendData = useMemo(() => {
    const byHour = new Map();
    mappedThreatFeed.forEach((item) => {
      const hour = item.time.slice(0, 2);
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });
    return Array.from(byHour.entries()).map(([hour, threats]) => ({ time: `${hour}:00`, threats }));
  }, [mappedThreatFeed]);

  const riskDistributionData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    mappedThreatFeed.forEach((item) => {
      if (item.severity === 'critical') counts.Critical += 1;
      else if (item.severity === 'high') counts.High += 1;
      else if (item.severity === 'medium') counts.Medium += 1;
      else counts.Low += 1;
    });
    return [
      { name: 'Low', value: counts.Low, color: '#00ff88' },
      { name: 'Medium', value: counts.Medium, color: '#0066ff' },
      { name: 'High', value: counts.High, color: '#ffb800' },
      { name: 'Critical', value: counts.Critical, color: '#ff0055' },
    ];
  }, [mappedThreatFeed]);

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="logo-pulse"></div>
          <h2>Sentinel AI</h2>
          <span className="badge">ENTERPRISE</span>
        </div>
        <div className="system-health">
          <div className="health-header">
            <span>System Health</span>
            <span className="status-good">Optimal</span>
          </div>
          <div className="progress-bg"><div className="progress-fill" style={{ width: '98%' }}></div></div>
          <p>AI Core: Online • Latency: {systemHealth?.responseTime ?? 'N/A'}ms</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-bar glass-panel-light">
            <Search size={18} />
            <input type="text" placeholder="Search domains, IPs, or threat ID..." />
          </div>
          <div className="topbar-actions">
            <div className="notification-icon"><Bell size={24} /></div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card glass-panel-light">
            <div className="stat-header"><h3>Total Threats</h3><ShieldAlert size={20} /></div>
            <div className="stat-value">{mappedThreatFeed.length}</div>
          </div>
          <div className="stat-card glass-panel-light highlight-danger">
            <div className="stat-header"><h3>Phishing Blocked</h3><AlertTriangle size={20} /></div>
            <div className="stat-value">{mappedThreatFeed.filter((t) => t.status === 'Blocked').length}</div>
          </div>
          <div className="stat-card glass-panel-light highlight-cyan">
            <div className="stat-header"><h3>Detection Accuracy</h3><ShieldCheck size={20} /></div>
            <div className="stat-value">
              {mappedThreatFeed.length ? `${Math.round((mappedThreatFeed.filter((t) => t.status !== 'Allowed').length / mappedThreatFeed.length) * 100)}%` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="charts-column fade-in">
            <div className="charts-section glass-panel">
              <div className="section-header"><h3>Threat Volume Trend</h3></div>
              <div className="chart-container" style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="threats" stroke="#00f3ff" fill="#00f3ff33" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card glass-panel">
              <div className="section-header"><h3>Risk Distribution</h3></div>
              <div className="chart-container" style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDistributionData} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                      {riskDistributionData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="live-feed glass-panel">
            <div className="section-header">
              <h3>Live Threat Feed</h3>
              <span className="live-indicator">LIVE</span>
            </div>
            <div className="feed-list">
              {mappedThreatFeed.map((threat) => (
                <div
                  key={threat.id}
                  className={`feed-item ${threat.severity}`}
                  onClick={() => onSelectThreat && onSelectThreat(threat)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="feed-time">{threat.time}</div>
                  <div className="feed-details">
                    <span className="type">{threat.type}</span>
                    <span className="target">Target: {threat.target}</span>
                  </div>
                  <div className="feed-action">
                    <span className={`status-badge ${threat.status.toLowerCase()}`}>{threat.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary" type="button" style={{ marginTop: 12 }}>
              <FileText size={16} style={{ marginRight: 8 }} />
              Generate Reports
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
