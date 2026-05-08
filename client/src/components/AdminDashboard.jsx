import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Bell, FileText, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { io } from 'socket.io-client';
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




const toThreatType = (incidentType) => {
  if (incidentType === 'email') return 'Email Threat';
  if (incidentType === 'webpage') return 'Webpage Threat';
  return 'URL Threat';
};

const toSeverity = (score) => {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const toStatusLabel = (status) => {
  if (status === 'phishing') return 'Blocked';
  if (status === 'suspicious') return 'Quarantined';
  return 'Allowed';
};

const normalizeIncidentRecord = (incident) => {
  if (!incident) return null;
  const incidentId = incident._id || incident.id;
  if (!incidentId) return null;
  return {
    ...incident,
    _id: incidentId,
  };
};

const AdminDashboard = ({ onSelectThreat, accessToken }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [threatFeed, setThreatFeed] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [blockedAttempts, setBlockedAttempts] = useState(0);
  const [mlMetrics, setMlMetrics] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');

  const mergeIncomingIncident = (incident) => {
    const normalized = normalizeIncidentRecord(incident);
    if (!normalized) return;

    if (normalized.status === 'phishing') {
      setThreatFeed((prev) => {
        const filtered = prev.filter((item) => String(item._id) !== String(normalized._id));
        return [normalized, ...filtered].slice(0, 50);
      });
    }

    setIncidents((prev) => {
      const filtered = prev.filter((item) => String(item._id) !== String(normalized._id));
      return [normalized, ...filtered].slice(0, 500);
    });

    setDashboardData((prev) => {
      if (!prev) return prev;

      const nextRecent = [normalized, ...(prev.recentIncidents || []).filter((item) => String(item._id) !== String(normalized._id))].slice(0, 50);
      const nextSummary = {
        ...(prev.summary || {}),
        totalThreats: Number(prev.summary?.totalThreats || 0) + 1,
        phishingBlocked: Number(prev.summary?.phishingBlocked || 0) + (normalized.status === 'phishing' ? 1 : 0),
        safe: Number(prev.summary?.safe || 0) + (normalized.status === 'safe' ? 1 : 0),
        suspicious: Number(prev.summary?.suspicious || 0) + (normalized.status === 'suspicious' ? 1 : 0),
        phishing: Number(prev.summary?.phishing || 0) + (normalized.status === 'phishing' ? 1 : 0),
      };

      return {
        ...prev,
        recentIncidents: nextRecent,
        summary: nextSummary,
      };
    });
  };

  useEffect(() => {
    const loadData = async () => {
      const requests = await Promise.allSettled([
        apiFetch('/api/v1/dashboard'),
        apiFetch('/api/v1/incidents?limit=500'),
        apiFetch('/api/v1/threat-feed'),
        apiFetch('/api/v1/system/health'),
        apiFetch('/api/v1/stats/blocked-attempts'),
        apiFetch('/api/v1/ml/metrics?days=14'),
      ]);

      const parseJsonIfOk = async (result) => {
        if (result.status !== 'fulfilled') return null;
        const response = result.value;
        if (!response?.ok) return null;
        try {
          return await response.json();
        } catch {
          return null;
        }
      };

      const [
        dashboardJson,
        incidentsJson,
        feedJson,
        healthJson,
        blockedJson,
        mlJson,
      ] = await Promise.all(requests.map(parseJsonIfOk));

      if (dashboardJson?.data) {
        setDashboardData(dashboardJson.data);
      }

      if (Array.isArray(incidentsJson?.data?.items)) {
        setIncidents(incidentsJson.data.items.map(normalizeIncidentRecord).filter(Boolean));
      }

      if (Array.isArray(feedJson?.data?.items)) {
        setThreatFeed(feedJson.data.items.map(normalizeIncidentRecord).filter(Boolean));
      }

      if (healthJson?.data) {
        setSystemHealth((prev) => ({ ...(prev || {}), ...healthJson.data, status: 'online' }));
      }

      if (blockedJson?.data) {
        setBlockedAttempts(Number(blockedJson.data.blocked_attempts || 0));
      }

      if (Array.isArray(mlJson?.data?.rows)) {
        setMlMetrics(mlJson.data.rows);
      }
    };

    loadData();
    const intervalId = setInterval(loadData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;

    let cancelled = false;
    let latestSeenAt = null;

    const captureLatestTimestamp = () => {
      const timestamps = [...incidents, ...threatFeed]
        .map((item) => item?.createdAt)
        .filter(Boolean)
        .sort();
      latestSeenAt = timestamps.at(-1) || latestSeenAt;
    };

    captureLatestTimestamp();

    const pollEvents = async () => {
      try {
        const query = latestSeenAt ? `?since=${encodeURIComponent(latestSeenAt)}` : '';
        const resp = await apiFetch(`/api/v1/events/poll${query}`);
        if (!resp.ok || cancelled) return;
        const json = await resp.json();
        const events = json?.data?.incidents || [];
        events.forEach((event) => {
          mergeIncomingIncident(event);
        });
        const newestEvent = events
          .map((event) => event?.createdAt)
          .filter(Boolean)
          .sort()
          .at(-1);
        if (newestEvent) {
          latestSeenAt = newestEvent;
        }
        if (json?.data?.health) {
          setSystemHealth((prev) => ({ ...(prev || {}), ...json.data.health, status: 'online' }));
        }
      } catch {
        // Keep polling quiet and rely on the next interval.
      }
    };

    const intervalId = setInterval(pollEvents, 5000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accessToken, incidents, threatFeed]);

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
    });

    socket.on('incident:new', (incident) => {
      mergeIncomingIncident(incident);
    });

    socket.on('system:health', (health) => {
      if (health) {
        setSystemHealth((prev) => ({ ...(prev || {}), ...health, status: 'online' }));
      }
    });

    socket.on('connect_error', () => {
      // Let socket.io keep retrying instead of forcing a disconnect.
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const handleGenerateReport = async () => {
    setReportBusy(true);
    setReportError('');
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = now.toISOString();
      const resp = await apiFetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, type: 'phishing' }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.data) {
        setReportError(json?.message || 'Unable to generate report.');
        return;
      }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishx-report-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setReportError('Unable to generate report.');
    } finally {
      setReportBusy(false);
    }
  };

  const allIncidents = incidents;

  const mappedThreatFeed = useMemo(
    () =>
      (threatFeed || []).map((incident) => ({
        id: incident._id,
        time: new Date(incident.createdAt).toLocaleTimeString(),
        type: toThreatType(incident.type),
        target: incident.input,
        severity: toSeverity(Number(incident.score || 0)),
        status: toStatusLabel(incident.status),
        score: Number(incident.score || 0),
        aiReasoning: (incident.reasons || []).map((reason) => ({
          score: `${incident.score}%`,
          state: Number(incident.score || 0) >= 70 ? 'danger' : 'warning',
          title: 'Detection Signal',
          desc: reason,
        })),
        urlAnalysis: [],
      })),
    [threatFeed]
  );

  const filteredThreatFeed = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return mappedThreatFeed;
    return mappedThreatFeed.filter((threat) =>
      [threat.id, threat.type, threat.target, threat.status].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }, [mappedThreatFeed, searchText]);

  const visibleThreatFeed = useMemo(() => filteredThreatFeed.slice(0, 100), [filteredThreatFeed]);

  const trendData = useMemo(() => {
    if (!allIncidents.length) return [];

    const byHour = new Map();
    allIncidents.forEach((incident) => {
      const date = new Date(incident.createdAt);
      const hour = String(date.getHours()).padStart(2, '0');
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });
    return Array.from(byHour.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, threats]) => ({ time: `${hour}:00`, threats }));
  }, [allIncidents]);

  const riskDistributionData = useMemo(() => {
    if (!allIncidents.length) return [];

    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    allIncidents.forEach((incident) => {
      const severity = toSeverity(Number(incident.score || 0));
      if (severity === 'critical') counts.Critical += 1;
      else if (severity === 'high') counts.High += 1;
      else if (severity === 'medium') counts.Medium += 1;
      else counts.Low += 1;
    });
    return [
      { name: 'Low', value: counts.Low, color: '#00ff88' },
      { name: 'Medium', value: counts.Medium, color: '#0066ff' },
      { name: 'High', value: counts.High, color: '#ffb800' },
      { name: 'Critical', value: counts.Critical, color: '#ff0055' },
    ];
  }, [allIncidents]);

  const detectionAccuracy = useMemo(() => {
    if (!mlMetrics.length) return null;

    const totals = mlMetrics.reduce(
      (acc, row) => {
        const tp = Number(row.truePositives || 0);
        const tn = Number(row.trueNegatives || 0);
        const fp = Number(row.falsePositives || 0);
        const fn = Number(row.falseNegatives || 0);
        acc.correct += tp + tn;
        acc.total += tp + tn + fp + fn;
        return acc;
      },
      { correct: 0, total: 0 }
    );

    if (!totals.total) return null;
    return Math.round((totals.correct / totals.total) * 100);
  }, [mlMetrics]);

  const totalThreats = allIncidents.length;
  const phishingBlocked = allIncidents.filter((incident) => incident.status === 'phishing').length || blockedAttempts;
  const healthOptimal = Number(systemHealth?.responseTime ?? 0) < 1000;

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
            <span className={healthOptimal ? 'status-good' : ''}>{healthOptimal ? 'Optimal' : 'Degraded'}</span>
          </div>
          <div className="progress-bg"><div className="progress-fill" style={{ width: healthOptimal ? '98%' : '60%' }}></div></div>
          <p>AI Core: {systemHealth ? 'Online' : 'Unknown'} | Latency: {systemHealth?.responseTime ?? 'N/A'}ms</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-bar glass-panel-light">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search domains, IPs, or threat ID..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="topbar-actions">
            <div className="notification-icon"><Bell size={24} /></div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card glass-panel-light">
            <div className="stat-header"><h3>Total Threats</h3><ShieldAlert size={20} /></div>
            <div className="stat-value">{totalThreats}</div>
          </div>
          <div className="stat-card glass-panel-light highlight-danger">
            <div className="stat-header"><h3>Phishing Blocked</h3><AlertTriangle size={20} /></div>
            <div className="stat-value">{phishingBlocked || blockedAttempts}</div>
          </div>
          <div className="stat-card glass-panel-light highlight-cyan">
            <div className="stat-header"><h3>Detection Accuracy</h3><ShieldCheck size={20} /></div>
            <div className="stat-value">{detectionAccuracy === null ? 'Pending' : `${detectionAccuracy}%`}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <span className="status-badge blocked">Security Overview</span>
          <span className="status-badge quarantined">Incident Analytics</span>
          <span className="status-badge allowed">Report Center</span>
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
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="threats" stroke="#00f3ff" fill="#00f3ff33" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {!allIncidents.length ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 10 }}>
                  No incidents yet. The chart is ready and will update automatically when new threats arrive.
                </p>
              ) : null}
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
              {visibleThreatFeed.length ? visibleThreatFeed.map((threat) => (
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
              )) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No phishing incidents are in the live feed yet.
                </p>
              )}
            </div>
            {filteredThreatFeed.length > visibleThreatFeed.length ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
                Showing latest {visibleThreatFeed.length} of {filteredThreatFeed.length} matched incidents.
              </p>
            ) : null}

            <button className="btn-primary" type="button" style={{ marginTop: 12 }} onClick={handleGenerateReport} disabled={reportBusy}>
              <FileText size={16} style={{ marginRight: 8 }} />
              {reportBusy ? 'Generating...' : 'Generate Reports'}
            </button>
            {reportError ? <p style={{ color: '#ff5f7a', marginTop: 10 }}>{reportError}</p> : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
