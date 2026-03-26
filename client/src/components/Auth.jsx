import React, { useState } from 'react';
import './Auth.css';
import { login, signup } from '../services/api';

const Auth = ({ onLoginSuccess }) => {
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        if (isSignupMode && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            const auth = isSignupMode
                ? await signup({ email, password })
                : await login({ email, password });
            onLoginSuccess(auth);
        } catch (loginError) {
            setError(loginError.message || `Failed to ${isSignupMode ? 'sign up' : 'sign in'}.`);
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
                    <p>
                        {isSignupMode
                            ? 'Create an account. New users are assigned the analyst role.'
                            : 'Sign in to your secured security operations portal'}
                    </p>
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

                    {isSignupMode ? (
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    ) : null}

                    {error ? <p style={{ color: 'var(--status-danger)', fontSize: '0.9rem' }}>{error}</p> : null}

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                        Access is role-based and determined by your backend account.
                    </p>

                    <button type="submit" className="auth-btn" disabled={isSubmitting}>
                        {isSubmitting ? (isSignupMode ? 'Creating Account...' : 'Signing In...') : (isSignupMode ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <div className="auth-toggle">
                    {isSignupMode ? 'Already have an account?' : 'Need an account?'}
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignupMode((prev) => !prev);
                            setError('');
                            setPassword('');
                            setConfirmPassword('');
                        }}
                    >
                        {isSignupMode ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
