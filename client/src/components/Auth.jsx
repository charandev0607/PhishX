import React, { useState } from 'react';
import './Auth.css';
import { login } from '../services/api';

const Auth = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            const auth = await login({ email, password });
            onLoginSuccess(auth);
        } catch (loginError) {
            setError(loginError.message || 'Failed to sign in.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-panel glass-panel">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-pulse"></div>
                        <h2>Sentinel AI</h2>
                    </div>
                    <p>Sign in to your secured security operations portal</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            className="form-input" 
                            placeholder="you@company.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            className="form-input" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error ? <p style={{ color: 'var(--status-danger)', fontSize: '0.9rem' }}>{error}</p> : null}

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                        Access is role-based and determined by your backend account (admin or analyst).
                    </p>

                    <button type="submit" className="auth-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Auth;
