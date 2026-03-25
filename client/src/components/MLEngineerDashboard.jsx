import React, { useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Database, TrendingUp, RefreshCw, BarChart2, Activity, Share2 } from 'lucide-react';
import './MLEngineerDashboard.css';

// Mock Data for ML Engineer View
const modelPerformanceData = [
    { epoch: '1', accuracy: 85, loss: 0.15 },
    { epoch: '2', accuracy: 88, loss: 0.12 },
    { epoch: '3', accuracy: 92, loss: 0.08 },
    { epoch: '4', accuracy: 95, loss: 0.05 },
    { epoch: '5', accuracy: 96, loss: 0.04 },
    { epoch: '6', accuracy: 97, loss: 0.03 },
    { epoch: '7', accuracy: 99.1, loss: 0.01 },
];

const blockedStatsData = [
     { name: 'Mon', phishing: 1200, malware: 300, spam: 800 },
     { name: 'Tue', phishing: 1500, malware: 450, spam: 900 },
     { name: 'Wed', phishing: 1100, malware: 200, spam: 750 },
     { name: 'Thu', phishing: 1800, malware: 600, spam: 1100 },
     { name: 'Fri', phishing: 2200, malware: 800, spam: 1300 },
     { name: 'Sat', phishing: 900,  malware: 150, spam: 500 },
     { name: 'Sun', phishing: 800,  malware: 100, spam: 400 },
];

const MLEngineerDashboard = () => {
    const [isUpdatingModels, setIsUpdatingModels] = useState(false);
    const [activeTab, setActiveTab] = useState('threat-intel');

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
                                    <div className="stat-value">12,450</div>
                                    <p className="description">Unprocessed records ready for training</p>
                                </div>
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>Current Model Version</h3>
                                        <Share2 size={20} className="cyan-icon" />
                                    </div>
                                    <div className="stat-value">Sentinel-v4.2</div>
                                    <p className="description">Last updated: 4 hours ago</p>
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
