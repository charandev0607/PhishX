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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const typeCategory = (type) => {
  if (type === 'email') return 'email';
  if (type === 'url') return 'url';
  return 'webpage';
};

const formatDate = (value) => new Date(value).toLocaleString();

const COLORS = {
  Critical: '#ff0055',
  High: '#ffb800',
  Medium: '#00f3ff',
  Low: '#00ff88',
};

const AdminDashboard = ({ onSelectThreat, liveAlerts, systemHealth, userRole }) => {
  const [activeNav, setActiveNav] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    startDate: '',
    endDate: '',
    minScore: '',
    maxScore: '',
    page: 1,
    limit: 20,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [policies, setPolicies] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await getUsers({ page: 1, limit: 50 });
      setUsers(response.items || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      setPolicyLoading(true);
      setPolicyMessage('');
      const response = await getPolicies();
      setPolicies(response);
    } catch (error) {
      setPolicyMessage(error.message || 'Failed to load policies');
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        setLoadError('');

        const query = {
          type: filters.type || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          minScore: filters.minScore || undefined,
          maxScore: filters.maxScore || undefined,
          page: filters.page,
          limit: filters.limit,
        };

        const response = await getIncidents(query);
        let items = response.items || [];

        if (filters.search) {
          const searchValue = filters.search.toLowerCase();
          items = items.filter(
            (item) =>
              item.input?.toLowerCase().includes(searchValue) ||
              item.type?.toLowerCase().includes(searchValue) ||
              item.status?.toLowerCase().includes(searchValue)
          );
        }

        setIncidents(items);
        setPagination(response.pagination || { page: 1, pages: 1, total: items.length, limit: filters.limit });
      } catch (error) {
        setLoadError(error.message || 'Failed to load incidents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, [filters, refreshKey]);

  useEffect(() => {
    if (activeNav === 'users' && userRole === 'admin') {
      fetchUsers();
    }

    if (activeNav === 'policies' && userRole === 'admin') {
      fetchPolicies();
    }
  }, [activeNav, userRole]);

  const categoryData = useMemo(() => {
    const totals = { email: 0, url: 0, webpage: 0 };
    incidents.forEach((incident) => {
      totals[typeCategory(incident.type)] += 1;
    });

    return [
      { name: 'Email', value: totals.email, color: '#00f3ff' },
      { name: 'URL', value: totals.url, color: '#ff0055' },
      { name: 'Webpage', value: totals.webpage, color: '#9d00ff' },
    ];
  }, [incidents]);

  const riskData = useMemo(() => {
    const totals = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    incidents.forEach((incident) => {
      totals[scoreBand(incident.score)] += 1;
    });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name],
    }));
  }, [incidents]);

  const trendData = useMemo(() => {
    const grouped = new Map();

    incidents.forEach((incident) => {
      const dateKey = new Date(incident.createdAt).toISOString().slice(0, 10);
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([date, threats]) => ({ date, threats }));
  }, [incidents]);

  const locationData = useMemo(() => {
    const grouped = new Map();

    incidents.forEach((incident) => {
      const location = incident.metadata?.location || incident.metadata?.country || 'Unknown';
      grouped.set(location, (grouped.get(location) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [incidents]);

  const realtimeThreats = useMemo(() => {
    const transformed = (liveAlerts || []).map((alert) => ({
      id: alert.id,
      createdAt: alert.payload?.createdAt || new Date().toISOString(),
      input: alert.payload?.input || alert.detail,
      type: alert.payload?.type || 'realtime',
      score: alert.payload?.score || 0,
      status: alert.severity || 'suspicious',
      metadata: alert.payload?.metadata || {},
      reasons: alert.payload?.reasons || [alert.detail],
    }));

    return transformed.slice(0, 10);
  }, [liveAlerts]);

  const topStats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((incident) => incident.score >= 85).length;
    const phishing = incidents.filter((incident) => incident.status === 'phishing').length;
    const avgScore =
      total === 0
        ? 0
        : Math.round(incidents.reduce((sum, incident) => sum + (incident.score || 0), 0) / total);

    return { total, critical, phishing, avgScore };
  }, [incidents]);

  const exportCsv = () => {
    const headers = ['id', 'createdAt', 'type', 'status', 'score', 'input'];
    const rows = incidents.map((incident) =>
      [incident._id, incident.createdAt, incident.type, incident.status, incident.score, incident.input]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `incidents-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Sentinel AI Incident Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated at ${new Date().toLocaleString()}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Time', 'Type', 'Status', 'Score', 'Input']],
      body: incidents.map((incident) => [
        formatDate(incident.createdAt),
        incident.type,
        incident.status,
        String(incident.score),
        incident.input,
      ]),
      styles: { fontSize: 8 },
      columnStyles: {
        4: { cellWidth: 120 },
      },
    });

    doc.save(`incidents-${Date.now()}.pdf`);
  };

  const handleRoleUpdate = async (userId, role) => {
    try {
      await updateUserRole({ userId, role });
      fetchUsers();
    } catch {
      // keep current list if role update fails
    }
  };

  const handlePolicySave = async () => {
    try {
      setPolicyLoading(true);
      await updatePolicies({
        autoBlockThreshold: Number(policies.autoBlockThreshold),
        autoQuarantine: Boolean(policies.autoQuarantine),
        requireMfaForAdmins: Boolean(policies.requireMfaForAdmins),
        notifyOnCritical: Boolean(policies.notifyOnCritical),
        maxAlertsPerMinute: Number(policies.maxAlertsPerMinute),
      });
      setPolicyMessage('Policies saved successfully');
    } catch (error) {
      setPolicyMessage(error.message || 'Failed to save policies');
    } finally {
      setPolicyLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="logo-pulse"></div>
          <h2>Sentinel AI</h2>
          <span className="badge">ENTERPRISE</span>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeNav === 'overview' ? 'active' : ''}`} onClick={() => setActiveNav('overview')}>
            <Activity size={20} /> Real-Time Dashboard
          </button>
          <button className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`} onClick={() => setActiveNav('reports')}>
            <FileText size={20} /> Incident Reports
          </button>
          {userRole === 'admin' ? (
            <>
              <button className={`nav-item ${activeNav === 'users' ? 'active' : ''}`} onClick={() => setActiveNav('users')}>
                <Users size={20} /> User Management
              </button>
              <button className={`nav-item ${activeNav === 'policies' ? 'active' : ''}`} onClick={() => setActiveNav('policies')}>
                <Settings size={20} /> Policy Management
              </button>
            </>
          ) : null}
        </nav>

        <div className="system-health">
          <div className="health-header">
            <span>System Health</span>
            <span className="status-good">Online</span>
          </div>
          <div className="progress-bg">
            <div className="progress-fill" style={{ width: `${Math.max(10, 100 - Math.round((systemHealth?.memory?.heapUsed || 0) / 5000000))}%` }}></div>
          </div>
          <p>Uptime: {Math.round(systemHealth?.uptime || 0)}s • Latency: {systemHealth?.responseTime || 0}ms</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="search-bar glass-panel-light">
            <Search size={18} />
            <input
              type="text"
              value={filters.search}
              placeholder="Search incidents by URL, type or status"
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
          </div>

          <div className="topbar-actions">
            <div className="notification-icon">
              <Bell size={22} />
              {realtimeThreats.length > 0 ? <div className="indicator"></div> : null}
            </div>
          </div>
        </header>

        {activeNav === 'overview' ? (
          <>
            <div className="stats-grid">
              <div className="stat-card glass-panel-light">
                <div className="stat-header">
                  <h3>Total Threats</h3>
                  <ShieldAlert size={20} />
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

            <div className="filters-grid glass-panel" style={{ padding: 16, marginBottom: 16 }}>
              <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}>
                <option value="">All Types</option>
                <option value="url">URL</option>
                <option value="email">Email</option>
                <option value="webpage">Webpage</option>
              </select>
              <input type="date" value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} />
              <input type="date" value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} />
              <input type="number" placeholder="Min score" value={filters.minScore} onChange={(event) => setFilters((prev) => ({ ...prev, minScore: event.target.value }))} />
              <input type="number" placeholder="Max score" value={filters.maxScore} onChange={(event) => setFilters((prev) => ({ ...prev, maxScore: event.target.value }))} />
              <button
                className="btn-primary"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, page: 1 }));
                  setRefreshKey((prev) => prev + 1);
                }}
              >
                Apply Filters
              </button>
            </div>

            {isLoading ? <p>Loading incidents...</p> : null}
            {loadError ? <p style={{ color: 'var(--status-danger)' }}>{loadError}</p> : null}

            <div className="dashboard-content">
              <div className="charts-column">
                <div className="charts-section glass-panel">
                  <div className="section-header">
                    <h3>Historical Threat Trend</h3>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="date" stroke="#a0a0b0" />
                        <YAxis stroke="#a0a0b0" />
                        <Tooltip />
                        <Area type="monotone" dataKey="threats" stroke="#00f3ff" fill="rgba(0,243,255,0.2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="small-charts-row">
                  <div className="chart-card glass-panel">
                    <div className="section-header">
                      <h3>Threat Category Breakdown</h3>
                    </div>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {categoryData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card glass-panel">
                    <div className="section-header">
                      <h3>Risk Score Distribution</h3>
                    </div>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={riskData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="name" stroke="#a0a0b0" />
                          <YAxis stroke="#a0a0b0" />
                          <Tooltip />
                          <Bar dataKey="value">
                            {riskData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
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

                <div className="section-header" style={{ marginTop: 16 }}>
                  <h3>Threat Activity Map/List</h3>
                </div>
                <div className="location-list">
                  {locationData.map((location) => (
                    <div key={location.location} className="location-item">
                      <span>{location.location}</span>
                      <strong>{location.count}</strong>
                    </div>
                  ))}
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
