import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLogin }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [issuedResetToken, setIssuedResetToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (mode === 'forgot') {
            if (!email) {
                setError('Please enter your email.');
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await fetch('/api/v1/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const json = await res.json();
                if (!res.ok) {
                    setError(json?.message || 'Unable to issue reset token.');
                    return;
                }
                setSuccess('Reset token issued. Use it to set a new password.');
                if (json?.data?.resetToken) {
                    setIssuedResetToken(json.data.resetToken);
                }
                setMode('reset');
            } catch {
                setError('Unable to reach backend authentication service.');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (mode === 'reset') {
            if (!resetToken || !newPassword) {
                setError('Please provide token and new password.');
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await fetch('/api/v1/auth/reset-password', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, newPassword }),
                });
                const json = await res.json();
                if (!res.ok) {
                    setError(json?.message || 'Password reset failed.');
                    return;
                }
                setSuccess('Password reset successful. Please sign in.');
                setMode('login');
                setResetToken('');
                setNewPassword('');
                setIssuedResetToken('');
                setPassword('');
                setConfirmPassword('');
            } catch {
                setError('Unable to reach backend authentication service.');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        if (mode === 'signup' && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setIsSubmitting(true);
        try {
            const endpoint = mode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/login';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const json = await res.json();
            if (!res.ok || !json?.data?.user || !json?.data?.accessToken || !json?.data?.refreshToken) {
                setError(json?.message || (mode === 'signup' ? 'Signup failed.' : 'Login failed.'));
                return;
            }
            onLogin({
                user: json.data.user,
                accessToken: json.data.accessToken,
                refreshToken: json.data.refreshToken,
            });
        } catch {
            setError('Unable to reach backend authentication service.');
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
                    <p>{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Recover your account' : mode === 'reset' ? 'Set a new password' : 'Sign in to your account'}</p>
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

                    {(mode === 'login' || mode === 'signup') && (
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
                    )}
                    {mode === 'signup' && (
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
                    )}
                    {mode === 'reset' && (
                        <>
                            <div className="form-group">
                                <label>Reset Token</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Paste reset token"
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {issuedResetToken ? (
                                <p style={{ color: '#00f3ff', marginTop: '8px', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                                    Dev reset token: {issuedResetToken}
                                </p>
                            ) : null}
                        </>
                    )}

                    {error && <p style={{ color: '#ff5f7a', marginTop: '8px' }}>{error}</p>}
                    {success && <p style={{ color: '#00ff88', marginTop: '8px' }}>{success}</p>}
                    <button type="submit" className="auth-btn" disabled={isSubmitting}>
                        {isSubmitting
                            ? (mode === 'signup' ? 'Creating Account...' : mode === 'forgot' ? 'Issuing Token...' : mode === 'reset' ? 'Resetting Password...' : 'Signing In...')
                            : (mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Issue Reset Token' : mode === 'reset' ? 'Reset Password' : 'Sign In')}
                    </button>
                </form>
                <div className="auth-toggle">
                    {mode === 'signup' ? 'Already have an account?' : mode === 'login' ? "Don't have an account?" : 'Need a different action?'}
                    <button
                        type="button"
                        onClick={() => {
                            if (mode === 'login') setMode('signup');
                            else if (mode === 'signup') setMode('login');
                            else if (mode === 'forgot') setMode('login');
                            else setMode('forgot');
                            setError('');
                            setSuccess('');
                            setConfirmPassword('');
                        }}
                    >
                        {mode === 'signup' ? 'Sign in' : mode === 'login' ? 'Sign up' : mode === 'forgot' ? 'Back to sign in' : 'Forgot password'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
