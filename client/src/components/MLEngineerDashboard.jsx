import React, { useEffect, useMemo, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Database, TrendingUp, RefreshCw, BarChart2, Activity, Share2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import './MLEngineerDashboard.css';

const MLEngineerDashboard = () => {
    const [isUpdatingModels, setIsUpdatingModels] = useState(false);
    const [pipelineMessage, setPipelineMessage] = useState('');
    const [activeTab, setActiveTab] = useState('threat-intel');
    const [metricsRows, setMetricsRows] = useState([]);
    const [mlReadiness, setMlReadiness] = useState(null);
    const [blockedAttempts, setBlockedAttempts] = useState(0);
    const [lastRefreshAt, setLastRefreshAt] = useState(null);
    const [backendReachable, setBackendReachable] = useState(true);


    
    const loadDashboardData = async () => {
        const requests = await Promise.allSettled([
            apiFetch('/api/v1/ml/metrics?days=14'),
            apiFetch('/api/v1/ml/readiness'),
            apiFetch('/api/v1/stats/blocked-attempts'),
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

        const [metricsJson, readinessJson, blockedJson] = await Promise.all(requests.map(parseJsonIfOk));
        const anySuccess = requests.some((result) => result.status === 'fulfilled' && result.value?.ok);

        setBackendReachable(anySuccess);

        if (Array.isArray(metricsJson?.data?.rows)) {
            setMetricsRows(metricsJson.data.rows);
        }

        if (readinessJson?.data) {
            setMlReadiness(readinessJson.data);
        }

        if (blockedJson?.data) {
            setBlockedAttempts(Number(blockedJson.data.blocked_attempts || 0));
        }

        setLastRefreshAt(new Date().toISOString());
    };

    useEffect(() => {
        loadDashboardData();
        const intervalId = setInterval(loadDashboardData, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const modelPerformanceData = useMemo(() => {
        return metricsRows.map((row) => {
            const total = (row.truePositives || 0) + (row.trueNegatives || 0) + (row.falsePositives || 0) + (row.falseNegatives || 0);
            const accuracy = total > 0 ? ((row.truePositives || 0) + (row.trueNegatives || 0)) / total : 0;
            const precisionDenominator = (row.truePositives || 0) + (row.falsePositives || 0);
            const precision = precisionDenominator > 0 ? (row.truePositives || 0) / precisionDenominator : 0;
            return {
                day: row.date?.slice(5) || 'N/A',
                accuracy: Number((accuracy * 100).toFixed(2)),
                precision: Number((precision * 100).toFixed(2)),
            };
        });
    }, [metricsRows]);

    const blockedStatsData = useMemo(() => {
        return metricsRows.map((row) => ({
            name: row.date?.slice(5) || 'N/A',
            url: row.byType?.url?.feedbackCount || 0,
            email: row.byType?.email?.feedbackCount || 0,
            webpage: row.byType?.webpage?.feedbackCount || 0,
            falsePositives: row.falsePositives || 0,
            falseNegatives: row.falseNegatives || 0,
        }));
    }, [metricsRows]);

    const handleRefreshMetrics = async () => {
        setIsUpdatingModels(true);
        setPipelineMessage('');
        try {
            const retrainResp = await apiFetch('/api/v1/ml/retrain', { method: 'POST' });
            const retrainJson = await retrainResp.json().catch(() => ({}));
            if (!retrainResp.ok) {
                const detail = retrainJson?.data?.message || retrainJson?.message || 'Retraining failed.';
                setPipelineMessage(detail);
                return;
            }
            await loadDashboardData();
            const detail = retrainJson?.data?.message || retrainJson?.message || 'Retraining completed and metrics refreshed.';
            setPipelineMessage(detail);
        } finally {
            setIsUpdatingModels(false);
        }
    };

    const latest = metricsRows.at(-1) || null;
    const latestTotal = latest
        ? (latest.truePositives || 0) + (latest.trueNegatives || 0) + (latest.falsePositives || 0) + (latest.falseNegatives || 0)
        : 0;
    const latestErrorRate = latestTotal > 0
        ? (((latest.falsePositives || 0) + (latest.falseNegatives || 0)) / latestTotal) * 100
        : null;
    const latestFeedbackCount = metricsRows.reduce((sum, row) => sum + Number(row.feedbackCount || 0), 0);
    const modelVersions = mlReadiness?.modelVersions || {};
    const latestModelUpdate = Object.values(modelVersions)
        .map((item) => item?.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1);
    const modelVersionLabel = Object.values(modelVersions)
        .map((item) => item?.version)
        .filter(Boolean)
        .join(' / ');

    return (
        <div className="ml-dashboard-layout">
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
                        <BarChart2 size={20} /> Feedback And Error Statistics
                    </button>
                    <button className={`nav-item ${activeTab === 'model-perf' ? 'active' : ''}`} onClick={() => setActiveTab('model-perf')}>
                        <Activity size={20} /> Model Performance
                    </button>
                </nav>

                 <div className="system-health">
                    <div className="health-header">
                        <span>Latest Error Rate</span>
                        <span className="status-good">
                            {latestErrorRate === null ? 'N/A' : `${latestErrorRate.toFixed(2)}%`}
                        </span>
                    </div>
                </div>
            </aside>

            <main className="ml-main-content">
                <header className="ml-topbar glass-panel-light">
                    <h2>{activeTab === 'threat-intel' ? 'Threat Intelligence Management' :
                         activeTab === 'blocked-stats' ? 'Feedback And Error Statistics' :
                         'Model Performance Metrics'}</h2>
                </header>

                <div className="ml-content-area">
                    {activeTab === 'threat-intel' && (
                        <div className="threat-intel-view fade-in">
                            <div className="info-cards">
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>New Incident Data</h3>
                                        <Database size={20} className="magenta-icon" />
                                    </div>
                                    <div className="stat-value">{latestFeedbackCount}</div>
                                    <p className="description">Validated feedback records available for retraining</p>
                                </div>
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>Current Model Version</h3>
                                        <Share2 size={20} className="cyan-icon" />
                                    </div>
                                    <div className="stat-value version-value">{modelVersionLabel || 'Unavailable'}</div>
                                    <p className="description">
                                        {!backendReachable
                                            ? 'Backend ML endpoints are unreachable.'
                                            : mlReadiness?.ready
                                                ? 'ML system ready.'
                                                : 'ML system not fully ready.'}
                                        {' '}
                                        Last artifact update: {latestModelUpdate ? new Date(latestModelUpdate).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="info-cards">
                                <div className="stat-card glass-panel-light">
                                    <div className="stat-header">
                                        <h3>Total Reported Blocks</h3>
                                        <BarChart2 size={20} className="cyan-icon" />
                                    </div>
                                    <div className="stat-value">{blockedAttempts}</div>
                                    <p className="description">User-reported suspicious links recorded by the platform</p>
                                </div>
                            </div>

                            <div className="action-panel glass-panel">
                                <h3>Update Threat Intelligence Pipeline</h3>
                                <p>Process validated ML feedback, refresh incremental datasets, retrain all three phishing models, and update the latest production artifacts.</p>
                                <p className="description">Last dashboard refresh: {lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : 'N/A'}</p>
                                {!backendReachable ? (
                                    <p className="description" style={{ color: '#ff8c8c' }}>
                                        Backend is currently unreachable. Start the backend and ML service with `npm run dev` from the repo root.
                                    </p>
                                ) : null}

                                <div className="pipeline-steps">
                                    <div className={`step ${isUpdatingModels ? 'processing' : ''}`}>1. Export Feedback</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-1' : ''}`}>2. Retrain Models</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-2' : ''}`}>3. Validate Metrics</div>
                                    <div className={`step ${isUpdatingModels ? 'processing delay-3' : ''}`}>4. Publish Artifacts</div>
                                </div>

                                <button
                                    className={`btn-primary large-btn ${isUpdatingModels ? 'loading' : ''}`}
                                    onClick={handleRefreshMetrics}
                                    disabled={isUpdatingModels}
                                >
                                    {isUpdatingModels ? (
                                        <><RefreshCw className="spin" size={20} /> Running Retraining...</>
                                    ) : (
                                        <><TrendingUp size={20} /> Run Retraining + Refresh Metrics</>
                                    )}
                                </button>
                                {pipelineMessage ? <p style={{ marginTop: 12, color: 'var(--accent-cyan)' }}>{pipelineMessage}</p> : null}
                            </div>
                        </div>
                    )}

                    {activeTab === 'blocked-stats' && (
                        <div className="blocked-stats-view fade-in">
                            <div className="charts-section glass-panel">
                                <div className="section-header">
                                    <h3>Daily Feedback Volume And Error Counts</h3>
                                </div>
                                <div className="chart-container" style={{ height: '400px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={blockedStatsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#a0a0b0" />
                                            <YAxis stroke="#a0a0b0" />
                                            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#111118', border: '1px solid #333' }} />
                                            <Bar dataKey="url" stackId="a" fill="#00f3ff" name="URL Feedback" />
                                            <Bar dataKey="email" stackId="a" fill="#9d00ff" name="Email Feedback" />
                                            <Bar dataKey="webpage" stackId="a" fill="#6f7cff" name="Webpage Feedback" />
                                            <Bar dataKey="falsePositives" stackId="b" fill="#ff0055" name="False Positives" />
                                            <Bar dataKey="falseNegatives" stackId="b" fill="#ff8c00" name="False Negatives" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {!blockedStatsData.length ? (
                                    <p className="description">No ML feedback has been recorded yet, so there are no daily feedback/error statistics to chart.</p>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {activeTab === 'model-perf' && (
                        <div className="model-perf-view fade-in">
                             <div className="charts-section glass-panel">
                                <div className="section-header">
                                    <h3>Daily Accuracy And Precision History</h3>
                                </div>
                                <div className="chart-container" style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={modelPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="day" stroke="#a0a0b0" />
                                            <YAxis stroke="#00f3ff" domain={[0, 100]} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#111118', border: '1px solid #333' }} />
                                            <Line type="monotone" dataKey="accuracy" stroke="#00f3ff" strokeWidth={3} dot={{r: 4}} name="Accuracy (%)" />
                                            <Line type="monotone" dataKey="precision" stroke="#ff0055" strokeWidth={3} dot={{r: 4}} name="Precision (%)" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                {!modelPerformanceData.length ? (
                                    <p className="description">No validated ML feedback metrics are available yet, so accuracy and precision history is still empty.</p>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MLEngineerDashboard;
