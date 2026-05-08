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
    const [showResetLink, setShowResetLink] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);


    
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
                const res = await fetch('/api/v1/auth/forgot-password-otp', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const json = await res.json();
                if (!res.ok) {
                    setError(json?.message || 'Unable to send OTP.');
                    return;
                }
                setSuccess('OTP sent to your email.');
                setOtpSent(true);
                setMode('otp_verify');
            } catch {
                setError('Unable to reach backend authentication service.');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (mode === 'otp_verify') {
            if (!otp) {
                setError('Please enter the OTP.');
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await fetch('/api/v1/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email, otp }),
                });
                const json = await res.json();
                if (!res.ok) {
                    setError(json?.message || 'Invalid OTP.');
                    return;
                }
                setSuccess('OTP verified. Set your new password.');
                setMode('reset_final');
            } catch {
                setError('Unable to reach backend authentication service.');
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (mode === 'reset_final') {
            if (!newPassword || !confirmPassword) {
                setError('Please fill in both fields.');
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
            setIsSubmitting(true);
            try {
                const res = await fetch('/api/v1/auth/reset-password-otp', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email, otp, newPassword }),
                });
                const json = await res.json();
                if (!res.ok) {
                    setError(json?.message || 'Password reset failed.');
                    return;
                }
                setSuccess('Password updated successfully. Please login.');
                setMode('login');
                setOtp('');
                setOtpSent(false);
                setNewPassword('');
                setConfirmPassword('');
                setPassword('');
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
                if (mode === 'login' && json?.data?.userExists) {
                    setShowResetLink(true);
                } else {
                    setShowResetLink(false);
                }
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
                    <p>
                        {mode === 'signup' 
                            ? 'Create your account' 
                            : mode === 'forgot' 
                            ? 'Recover your account' 
                            : mode === 'otp_verify'
                            ? 'Enter the 6-digit OTP'
                            : mode === 'reset_final'
                            ? 'Set your new password'
                            : 'Sign in to your account'}
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
                    {mode === 'otp_verify' && (
                        <div className="form-group">
                            <label>6-Digit OTP</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="XXXXXX"
                                maxLength="6"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {mode === 'reset_final' && (
                        <>
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
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {error && <p style={{ color: '#ff5f7a', marginTop: '8px' }}>{error}</p>}
                    {success && <p style={{ color: '#00ff88', marginTop: '8px' }}>{success}</p>}
                    <button type="submit" className="auth-btn" disabled={isSubmitting}>
                        {isSubmitting
                            ? (mode === 'signup' ? 'Creating Account...' : mode === 'forgot' ? 'Sending OTP...' : mode === 'otp_verify' ? 'Verifying...' : mode === 'reset_final' ? 'Updating...' : 'Signing In...')
                            : (mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send OTP' : mode === 'otp_verify' ? 'Verify OTP' : mode === 'reset_final' ? 'Update Password' : 'Sign In')}
                    </button>
                    {mode === 'login' && showResetLink && (
                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                            <button 
                                type="button" 
                                className="btn-text danger-text" 
                                onClick={() => { setMode('forgot'); setShowResetLink(false); setError(''); }}
                                style={{ fontSize: '0.85rem', color: '#ff5f7a', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Forgot password? Click here to reset.
                            </button>
                        </div>
                    )}
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
                        {mode === 'signup' ? 'Sign in' : mode === 'login' ? 'Sign up' : 'Back to sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
