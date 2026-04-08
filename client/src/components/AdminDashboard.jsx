import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  DownloadCloud,
  FileText,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import './AdminDashboard.css';
import {
  getIncidents,
  getPolicies,
  getUsers,
  updatePolicies,
  updateUserRole,
} from '../services/api';

const scoreBand = (score) => {
  if (score >= 85) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

const AdminDashboard = ({ onSelectThreat }) => {
    const [activeFilter, setActiveFilter] = useState('24h');
    const [activeNav, setActiveNav] = useState('overview');
    const [incidents, setIncidents] = useState([]);
    const [systemHealth, setSystemHealth] = useState(null);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [incidentsResp, healthResp] = await Promise.all([
                    apiFetch('/api/v1/incidents?limit=200'),
                    apiFetch('/api/v1/system/health'),
                ]);

                if (incidentsResp.ok) {
                    const json = await incidentsResp.json();
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

        loadDashboardData();
    }, []);

    const mappedThreatFeed = useMemo(() => {
        return incidents.map((incident) => {
            const date = new Date(incident.createdAt);
            const severity = incident.score >= 85 ? 'critical' : incident.score >= 70 ? 'high' : incident.score >= 40 ? 'medium' : 'low';
            const status = incident.status === 'phishing' ? 'Blocked' : incident.status === 'suspicious' ? 'Quarantined' : 'Allowed';
            return {
                id: incident._id,
                time: Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleTimeString(),
                type: incident.type === 'url' ? 'URL Threat' : 'Email Threat',
                target: incident.input,
                brand: 'Unknown',
                status,
                severity,
                score: incident.score,
                ip: incident.metadata?.ip || 'N/A',
                location: incident.metadata?.geo || 'N/A',
                urlAnalysis: [],
                aiReasoning: (incident.reasons || []).map((reason) => ({
                    score: `${incident.score}%`,
                    state: severity === 'critical' || severity === 'high' ? 'danger' : 'warning',
                    title: 'Detection Signal',
                    desc: reason,
                })),
            };
        });
    }, [incidents]);

    const threatTrendData = useMemo(() => {
        const byHour = new Map();
        mappedThreatFeed.forEach((item) => {
            const hour = item.time !== 'N/A' ? item.time.slice(0, 2) : '00';
            byHour.set(hour, (byHour.get(hour) || 0) + 1);
        });
        return Array.from(byHour.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([hour, threats]) => ({ time: `${hour}:00`, threats }));
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

    const categoryData = useMemo(() => {
        const counts = { URL: 0, Email: 0 };
        mappedThreatFeed.forEach((item) => {
            if (item.type === 'URL Threat') counts.URL += 1;
            else counts.Email += 1;
        });
        return [
            { name: 'URL Threats', value: counts.URL, color: '#9d00ff' },
            { name: 'Email Threats', value: counts.Email, color: '#00f3ff' },
        ];
    }, [mappedThreatFeed]);

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar glass-panel">
                <div className="brand">
                    <div className="logo-pulse"></div>
                    <h2>Sentinel AI</h2>
                    <span className="badge">ENTERPRISE</span>
                </div>
                <div className="stat-value">{topStats.total}</div>
                <div className="stat-trend positive">Active dataset</div>
              </div>
              <div className="stat-card glass-panel-light highlight-danger">
                <div className="stat-header">
                  <h3>Critical Threats</h3>
                  <AlertTriangle size={20} />
                </div>
                <div className="stat-value">{topStats.critical}</div>
                <div className="stat-trend negative">Immediate review needed</div>
              </div>
              <div className="stat-card glass-panel-light highlight-cyan">
                <div className="stat-header">
                  <h3>Average Risk</h3>
                  <ShieldCheck size={20} />
                </div>
                <div className="stat-value">{topStats.avgScore}</div>
                <div className="stat-trend positive">Risk scoring model</div>
              </div>
            </div>

                <nav className="nav-menu">
                    <button className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`} onClick={() => setActiveNav('overview')}>
                        <Activity size={20} /> View Real-Time Dashboard
                    </button>
                    <button className={`nav-item ${activeNav === 'threats' ? 'active' : ''}`} onClick={() => setActiveNav('threats')}>
                        <ShieldAlert size={20} /> Monitor Threat Feed
                        <span className="nav-badge pulse-badge">{mappedThreatFeed.filter(t => t.status === "Blocked").length}</span>
                    </button>
                    <button className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`} onClick={() => setActiveNav('reports')}>
                        <FileText size={20} /> View Incident Reports
                    </button>
                    <button className={`nav-item ${activeNav === 'analytics' ? 'active' : ''}`} onClick={() => setActiveNav('analytics')}>
                        <TrendingUp size={20} /> Analytics
                    </button>
                    <button className={`nav-item ${activeNav === 'users' ? 'active' : ''}`} onClick={() => setActiveNav('users')}>
                        <Users size={20} /> Users
                    </button>
                    <button className={`nav-item ${activeNav === 'policies' ? 'active' : ''}`} onClick={() => setActiveNav('policies')}>
                        <Settings size={20} /> Policies
                    </button>
                </nav>

                <div className="system-health">
                    <div className="health-header">
                        <span>System Health</span>
                        <span className="status-good">Optimal</span>
                    </div>
                    <div className="progress-bg"><div className="progress-fill" style={{ width: '98%' }}></div></div>
                    <p>AI Core: Online • Latency: {systemHealth?.responseTime ?? 'N/A'}ms</p>
                </div>

                    <div className="topbar-actions">
                        <div className="notification-icon">
                            <Bell size={24} />
                            <div className="indicator"></div>
                        </div>
                        <div className="admin-profile">
                            <img src="https://i.pravatar.cc/100?img=33" alt="Admin" className="avatar" />
                            <div className="profile-info">
                                <span className="name">A. Security</span>
                                <span className="role">Global Admin</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Cards */}
                <div className="stats-grid">
                    <div className="stat-card glass-panel-light">
                        <div className="stat-header">
                            <h3>Total Threats (24h)</h3>
                            <ShieldAlert size={20} />
                        </div>
                        <div className="stat-value">{mappedThreatFeed.length}</div>
                        <div className="stat-trend positive">
                            ↑ +12% vs yesterday
                        </div>
                    </div>
                  </div>

                    <div className="stat-card glass-panel-light highlight-danger">
                        <div className="stat-header">
                            <h3>Phishing Blocked</h3>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="stat-value">{mappedThreatFeed.filter(t => t.status === 'Blocked').length}</div>
                        <div className="stat-trend negative">
                            ↑ +4% escalation
                        </div>
                    </div>

                    <div className="stat-card glass-panel-light highlight-cyan">
                        <div className="stat-header">
                            <h3>Detection Accuracy</h3>
                            <ShieldCheck size={20} />
                        </div>
                        <div className="stat-value">
                            {mappedThreatFeed.length > 0
                                ? `${Math.round((mappedThreatFeed.filter(t => t.status !== 'Allowed').length / mappedThreatFeed.length) * 100)}%`
                                : 'N/A'}
                        </div>
                        <div className="stat-trend positive">
                            ↑ +0.01% optimized
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="live-feed glass-panel">
                <div className="section-header">
                  <h3>Real-Time Activity List</h3>
                  <span className="live-indicator">LIVE</span>
                </div>
                <div className="feed-list">
                  {realtimeThreats.map((threat) => (
                    <div
                      key={threat.id}
                      className={`feed-item ${scoreBand(threat.score).toLowerCase()}`}
                      onClick={() => onSelectThreat?.(threat)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="feed-time">{formatDate(threat.createdAt)}</div>
                      <div className="feed-details">
                        <span className="type">{threat.type}</span>
                        <span className="target">{threat.input}</span>
                      </div>
                      <div className="feed-action">
                        <span className={`status-badge ${threat.status}`}>{threat.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                    {/* Right Column: Live Feed */}
                    <div className="live-feed glass-panel">
                        <div className="section-header">
                            <h3>Live Threat Feed</h3>
                            <span className="live-indicator">LIVE</span>
                        </div>
                        <div className="feed-list">
                            {mappedThreatFeed.map(threat => (
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
                                        <span className={`status-badge ${threat.status.toLowerCase()}`}>
                                            {threat.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                        </>
                    )}
                    
                    {/* Add View for Incident Reports */}
                    {activeNav === 'reports' && (
                        <div className="reports-view fade-in glass-panel" style={{ width: '100%', padding: '30px' }}>
                            <div className="section-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                                <h3>Incident Reports</h3>
                                <button className="btn-primary" type="button">
                                    <DownloadCloud size={18} style={{marginRight: '8px'}} /> Generate Reports
                                </button>
                            </div>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'var(--text-secondary)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                        <th style={{ padding: '12px 8px' }}>Threat ID</th>
                                        <th style={{ padding: '12px 8px' }}>Time</th>
                                        <th style={{ padding: '12px 8px' }}>Type</th>
                                        <th style={{ padding: '12px 8px' }}>Target</th>
                                        <th style={{ padding: '12px 8px' }}>Severity</th>
                                        <th style={{ padding: '12px 8px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappedThreatFeed.map(threat => (
                                        <tr key={threat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }} onClick={() => onSelectThreat && onSelectThreat(threat)}>
                                            <td style={{ padding: '12px 8px', color: 'var(--accent-cyan)' }}>{threat.id}</td>
                                            <td style={{ padding: '12px 8px' }}>{threat.time}</td>
                                            <td style={{ padding: '12px 8px' }}>{threat.type}</td>
                                            <td style={{ padding: '12px 8px' }}>{threat.target}</td>
                                            <td style={{ padding: '12px 8px', color: threat.severity === 'critical' ? 'var(--status-danger)' : 'var(--status-warning)' }}>
                                                {threat.severity.toUpperCase()}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <button className="btn-text" style={{ padding: 0 }} type="button" onClick={(e) => { e.stopPropagation(); }}>
                                                    <FileText size={16} /> Export
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {activeNav === 'reports' ? (
          <div className="reports-view fade-in glass-panel" style={{ width: '100%', padding: 24 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h3>Report Generation & Export</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={exportCsv}>
                  <DownloadCloud size={18} style={{ marginRight: 8 }} /> Export CSV
                </button>
                <button className="btn-primary" onClick={exportPdf}>
                  <FileText size={18} style={{ marginRight: 8 }} /> Export PDF
                </button>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Time</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Score</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Input</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: 10 }}>{formatDate(incident.createdAt)}</td>
                    <td style={{ padding: 10 }}>{incident.type}</td>
                    <td style={{ padding: 10 }}>{incident.status}</td>
                    <td style={{ padding: 10 }}>{incident.score}</td>
                    <td style={{ padding: 10 }}>{incident.input}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeNav === 'users' && userRole === 'admin' ? (
          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="section-header">
              <h3>User Management Panel</h3>
            </div>
            {usersLoading ? <p>Loading users...</p> : null}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Created</th>
                  <th style={{ textAlign: 'left', padding: 10 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: 10 }}>{user.email}</td>
                    <td style={{ padding: 10 }}>{user.role}</td>
                    <td style={{ padding: 10 }}>{formatDate(user.createdAt)}</td>
                    <td style={{ padding: 10 }}>
                      <button className="btn-text" onClick={() => handleRoleUpdate(user._id, user.role === 'admin' ? 'analyst' : 'admin')}>
                        Switch to {user.role === 'admin' ? 'analyst' : 'admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeNav === 'policies' && userRole === 'admin' ? (
          <div className="glass-panel" style={{ padding: 24 }}>
            <div className="section-header">
              <h3>Policy Management Panel</h3>
            </div>
            {policyLoading || !policies ? <p>Loading policies...</p> : null}
            {policies ? (
              <div className="policy-form-grid">
                <label>
                  Auto Block Threshold
                  <input
                    type="number"
                    value={policies.autoBlockThreshold}
                    onChange={(event) =>
                      setPolicies((prev) => ({ ...prev, autoBlockThreshold: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Max Alerts / Minute
                  <input
                    type="number"
                    value={policies.maxAlertsPerMinute}
                    onChange={(event) =>
                      setPolicies((prev) => ({ ...prev, maxAlertsPerMinute: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(policies.autoQuarantine)}
                    onChange={(event) =>
                      setPolicies((prev) => ({ ...prev, autoQuarantine: event.target.checked }))
                    }
                  />
                  Auto Quarantine
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(policies.requireMfaForAdmins)}
                    onChange={(event) =>
                      setPolicies((prev) => ({ ...prev, requireMfaForAdmins: event.target.checked }))
                    }
                  />
                  Require MFA for Admins
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(policies.notifyOnCritical)}
                    onChange={(event) =>
                      setPolicies((prev) => ({ ...prev, notifyOnCritical: event.target.checked }))
                    }
                  />
                  Notify on Critical
                </label>
                <button className="btn-primary" onClick={handlePolicySave} disabled={policyLoading}>
                  {policyLoading ? 'Saving...' : 'Save Policies'}
                </button>
              </div>
            ) : null}
            {policyMessage ? <p style={{ marginTop: 12 }}>{policyMessage}</p> : null}
          </div>
        ) : null}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>
            Page {pagination.page} of {pagination.pages} • {pagination.total} incidents
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-text"
              disabled={pagination.page <= 1}
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))
              }
            >
              Previous
            </button>
            <button
              className="btn-text"
              disabled={pagination.page >= pagination.pages}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min(pagination.pages, (prev.page || 1) + 1),
                }))
              }
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
