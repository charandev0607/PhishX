import React, { useEffect, useMemo, useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Activity, Users, Settings, Bell, Search, TrendingUp, AlertTriangle, FileText, DownloadCloud
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import './AdminDashboard.css';

// Keep chart tooltip component stable across renders for lint + performance.
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip glass-panel-light">
                <p className="label">{`${label}`}</p>
                <p className="intro" style={{ color: payload[0].stroke || payload[0].fill }}>
                    {`${payload[0].name}: ${payload[0].value}`}
                </p>
            </div>
        );
    }
    return null;
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
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Topbar */}
                <header className="topbar">
                    <div className="search-bar glass-panel-light">
                        <Search size={18} />
                        <input type="text" placeholder="Search domains, IPs, or threat ID..." />
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

                {/* Complex Content Area */}
                <div className="dashboard-content">
                    {activeNav === 'overview' && (
                        <>
                        <div className="charts-column fade-in">
                            {/* Main Trend Chart */}
                            <div className="charts-section glass-panel">
                            <div className="section-header">
                                <h3>Threat Volume Trend</h3>
                                <div className="filters">
                                    {['24h', '7d', '30d'].map(f => (
                                        <button
                                            key={f}
                                            className={activeFilter === f ? 'active' : ''}
                                            onClick={() => setActiveFilter(f)}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="chart-container" style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={threatTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00f3ff" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="time" stroke="#606070" tick={{ fill: '#a0a0b0', fontSize: 12 }} />
                                        <YAxis stroke="#606070" tick={{ fill: '#a0a0b0', fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="threats" stroke="#00f3ff" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" name="Blocked Threats" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Small Charts Row */}
                        <div className="small-charts-row">
                            <div className="chart-card glass-panel">
                                <div className="section-header">
                                    <h3>Risk Distribution</h3>
                                </div>
                                <div className="chart-container" style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={riskDistributionData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {riskDistributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="chart-legend">
                                    {riskDistributionData.map(d => (
                                        <div key={d.name} className="legend-item">
                                            <span className="dot" style={{ backgroundColor: d.color }}></span>
                                            <span className="name">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-card glass-panel">
                                <div className="section-header">
                                    <h3>Top Attack Vectors</h3>
                                </div>
                                <div className="chart-container" style={{ height: '200px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="chart-legend">
                                    {categoryData.map(d => (
                                        <div key={d.name} className="legend-item">
                                            <span className="dot" style={{ backgroundColor: d.color }}></span>
                                            <span className="name">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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
            </main>
        </div>
    );
};

export default AdminDashboard;
