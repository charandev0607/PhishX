import React, { useState } from 'react';
import './Auth.css';

const Auth = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('user'); // 'user' or 'admin'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate authentication
        if (email && password) {
            onLogin({ email, role });
        } else {
            alert('Please enter both email and password.');
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
                    <p>{isLogin ? 'Sign in to your account' : 'Create an account to continue'}</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Account Role</label>
                        <div className="role-selector">
                            <button 
                                type="button" 
                                className={`role-btn ${role === 'user' ? 'active' : ''}`}
                                onClick={() => setRole('user')}
                            >
                                End User
                            </button>
                            <button 
                                type="button" 
                                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                                onClick={() => setRole('admin')}
                            >
                                Security Admin
                            </button>
                        </div>
                    </div>

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

                    <button type="submit" className="auth-btn">
                        {isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-toggle">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button type="button" onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
