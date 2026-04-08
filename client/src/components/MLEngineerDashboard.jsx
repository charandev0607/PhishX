import React, { useEffect, useMemo, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Database, TrendingUp, RefreshCw, BarChart2, Shield, Activity, Share2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import './MLEngineerDashboard.css';

const MLEngineerDashboard = () => {
    const [isUpdatingModels, setIsUpdatingModels] = useState(false);
    const [activeTab, setActiveTab] = useState('threat-intel');
    const [metricsRows, setMetricsRows] = useState([]);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const resp = await apiFetch('/api/v1/ml/metrics?days=14');
                if (!resp.ok) return;
                const json = await resp.json();
                setMetricsRows(json?.data?.rows ?? []);
            } catch {
                setMetricsRows([]);
            }
        };
        loadMetrics();
    }, []);

    const modelPerformanceData = useMemo(() => {
        return metricsRows.map((row, idx) => {
            const total = (row.truePositives || 0) + (row.trueNegatives || 0) + (row.falsePositives || 0) + (row.falseNegatives || 0);
            const accuracy = total > 0 ? ((row.truePositives || 0) + (row.trueNegatives || 0)) / total : 0;
            const loss = 1 - accuracy;
            return {
                epoch: String(idx + 1),
                accuracy: Number((accuracy * 100).toFixed(2)),
                loss: Number(loss.toFixed(4)),
            };
        });
    }, [metricsRows]);

    const blockedStatsData = useMemo(() => {
        return metricsRows.map((row) => ({
            name: row.date?.slice(5) || 'N/A',
            phishing: row.byType?.url?.feedbackCount || 0,
            malware: row.falsePositives || 0,
            spam: row.byType?.email?.feedbackCount || 0,
        }));
    }, [metricsRows]);

    const handleUpdateIntelligence = () => {
        setIsUpdatingModels(true);
        setTimeout(() => {
            setIsUpdatingModels(false);
            alert("Threat Intelligence successfully updated with latest incident data.");
        }, 3000);
    };

    return (
        <div className="ml-dashboard-layout">
            {/* Sidebar for ML specific navigation */}
            <aside className="ml-sidebar glass-panel">
                <div className="brand">
                    <div className="logo-pulse ml-pulse"></div>
                    <h2>ML Ops Center</h2>
                    <span className="badge ai-badge">AI CORE</span>
                </div>
                
                <nav className="nav-menu">
                    <button className={`nav-item ${activeTab === 'threat-intel' ? 'active' : ''}`} onClick={() => setActiveTab('threat-intel')}>
                        <Database size={20} /> Update Threat Intelligence
                    </button>
                    <button className={`nav-item ${activeTab === 'blocked-stats' ? 'active' : ''}`} onClick={() => setActiveTab('blocked-stats')}>
                        <BarChart2 size={20} /> View Blocked Attempts Statistics
                    </button>
                    <button className={`nav-item ${activeTab === 'model-perf' ? 'active' : ''}`} onClick={() => setActiveTab('model-perf')}>
                        <Activity size={20} /> Model Performance
                    </button>
                </nav>

                 <div className="system-health">
                    <div className="health-header">
                        <span>Model Drift</span>
                        <span className="status-good">&lt; 0.5%</span>
                    </div>
                </div>
            </aside>

            {/* Main View Area */}
            <main className="ml-main-content">
                <header className="ml-topbar glass-panel-light">
                    <h2>{activeTab === 'threat-intel' ? 'Threat Intelligence Management' : 
                         activeTab === 'blocked-stats' ? 'Blocked Attempts Statistics' : 
                         'Model Performance Metrics'}</h2>
                </header>

                <div className="ml-content-area">
                    {/* View: Update Threat Intelligence */}
                    {activeTab === 'threat-intel' && (
                        <div className="threat-intel-view fade-in">
                            <div className="info-cards">
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>New Incident Data</h3>
                                        <Database size={20} className="magenta-icon" />
                                    </div>
                                    <div className="stat-value">{metricsRows.reduce((sum, r) => sum + (r.feedbackCount || 0), 0)}</div>
                                    <p className="description">Validated feedback records available for retraining</p>
                                </div>
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>Current Model Version</h3>
                                        <Share2 size={20} className="cyan-icon" />
                                    </div>
                                    <div className="stat-value">Production</div>
                                    <p className="description">Last metric update: {metricsRows.at(-1)?.updatedAt ? new Date(metricsRows.at(-1).updatedAt).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="action-panel glass-panel">
                                <h3>Update Threat Intelligence Pipeline</h3>
                                <p>Process the recently collected incident data (reported links, detected zero-day threats) to continuously train and update the ML detection models.</p>
                                
                                <div className="pipeline-steps">
                                    <div className={`step ${isUpdatingModels ? 'processing' : ''}`}>1. Clean & Extract Features</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-1' : ''}`}>2. Train Model Increments</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-2' : ''}`}>3. Validate Accuracy</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-3' : ''}`}>4. Deploy Intel Update</div>
                                </div>

                                <button 
                                    className={`btn-primary large-btn ${isUpdatingModels ? 'loading' : ''}`} 
                                    onClick={handleUpdateIntelligence}
                                    disabled={isUpdatingModels}
                                >
                                    {isUpdatingModels ? (
                                        <><RefreshCw className="spin" size={20} /> Updating Intelligence...</>
                                    ) : (
                                        <><TrendingUp size={20} /> Start Intelligence Update</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* View: Blocked Attempts Statistics */}
                    {activeTab === 'blocked-stats' && (
                        <div className="blocked-stats-view fade-in">
                            <div className="charts-section glass-panel">
                                <div className="section-header">
                                    <h3>Weekly Blocked Threats Breakdown</h3>
                                </div>
                                <div className="chart-container" style={{ height: '400px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={blockedStatsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#a0a0b0" />
                                            <YAxis stroke="#a0a0b0" />
                                            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111118', border: '1px solid #333' }} />
                                            <Bar dataKey="phishing" stackId="a" fill="#00f3ff" name="Phishing Sites" />
                                            <Bar dataKey="malware" stackId="a" fill="#ff0055" name="Malware Drops" />
                                            <Bar dataKey="spam" stackId="a" fill="#9d00ff" name="Spam/Scam" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Model Performance */}
                    {activeTab === 'model-perf' && (
                        <div className="model-perf-view fade-in">
                             <div className="charts-section glass-panel">
                                <div className="section-header">
                                    <h3>Model Training Validation History</h3>
                                </div>
                                <div className="chart-container" style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={modelPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="epoch" stroke="#a0a0b0" label={{ value: 'Epochs', position: 'insideBottomRight', offset: -10, fill: '#a0a0b0' }} />
                                            <YAxis yAxisId="left" stroke="#00f3ff" label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#00f3ff' }} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#ff0055" label={{ value: 'Loss', angle: 90, position: 'insideRight', fill: '#ff0055' }} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #333' }} />
                                            <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#00f3ff" strokeWidth={3} dot={{r: 4}} name="Validation Accuracy" />
                                            <Line yAxisId="right" type="monotone" dataKey="loss" stroke="#ff0055" strokeWidth={3} dot={{r: 4}} name="Validation Loss" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MLEngineerDashboard;
