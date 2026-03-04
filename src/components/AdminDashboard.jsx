import React, { useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Activity, Users, Settings, Bell, Search, TrendingUp, AlertTriangle
} from 'lucide-react';
import { mockThreatFeed, threatTrendData, riskDistributionData, categoryData } from '../data/mockData';
import './AdminDashboard.css';

const AdminDashboard = ({ onSelectThreat }) => {
    const [activeFilter, setActiveFilter] = useState('24h');
    const [activeNav, setActiveNav] = useState('overview');

    // Custom Tooltip for Recharts
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
                        <Activity size={20} /> Overview
                    </button>
                    <button className={`nav-item ${activeNav === 'threats' ? 'active' : ''}`} onClick={() => setActiveNav('threats')}>
                        <ShieldAlert size={20} /> Live Threats
                        <span className="nav-badge pulse-badge">{mockThreatFeed.filter(t => t.status === "Blocked").length}</span>
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
                    <p>AI Core: Online • Latency: 12ms</p>
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
                        <div className="notification-icon" onClick={() => alert("You have 3 new security alerts.")}>
                            <Bell size={24} />
                            <div className="indicator"></div>
                        </div>
                        <div className="admin-profile" onClick={() => alert("Opening Admin Profile Settings...")}>
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
                        <div className="stat-value">24,592</div>
                        <div className="stat-trend positive">
                            ↑ +12% vs yesterday
                        </div>
                    </div>

                    <div className="stat-card glass-panel-light highlight-danger">
                        <div className="stat-header">
                            <h3>Phishing Blocked</h3>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="stat-value">8,104</div>
                        <div className="stat-trend negative">
                            ↑ +4% escalation
                        </div>
                    </div>

                    <div className="stat-card glass-panel-light highlight-cyan">
                        <div className="stat-header">
                            <h3>Detection Accuracy</h3>
                            <ShieldCheck size={20} />
                        </div>
                        <div className="stat-value">99.98%</div>
                        <div className="stat-trend positive">
                            ↑ +0.01% optimized
                        </div>
                    </div>
                </div>

                {/* Complex Content Area */}
                <div className="dashboard-content">
                    <div className="charts-column">
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
                            {mockThreatFeed.map(threat => (
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
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
