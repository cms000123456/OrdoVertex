import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, mfaApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [backupCodeMode, setBackupCodeMode] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authApi.login(formData.email, formData.password, mfaCode || undefined);
        
        // Check if MFA is required
        if (response.data.data.mfaRequired) {
          setMfaRequired(true);
          setIsLoading(false);
          return;
        }
      } else {
        response = await authApi.register(
          formData.email,
          formData.password,
          formData.name
        );
        
        // Check if verification is required after registration
        if (response.data.data?.requiresVerification) {
          setVerificationRequired(true);
          setVerificationMessage(response.data.message || 'Registration successful! Please check your email to verify your account.');
          setIsLoading(false);
          return;
        }
      }

      const { user, token } = response.data.data;
      setAuth(user, token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      navigate('/workflows');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await mfaApi.useBackupCode(formData.email, mfaCode);
      const { user, token } = response.data.data;
      setAuth(user, token);
      toast.success('Welcome back!');
      navigate('/workflows');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Invalid backup code';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <Zap size={32} className="logo-icon-large" />
          </div>
          <h1>OrdoVertex</h1>
          <p>Open source workflow automation</p>
        </div>

        <div className="auth-card">
          {mfaRequired ? (
            <>
              <div className="mfa-header">
                <Shield size={32} className="mfa-icon" />
                <h2>Two-Factor Authentication</h2>
                <p>Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={backupCodeMode ? handleBackupCode : handleSubmit}>
                <div className="form-group">
                  <label>{backupCodeMode ? 'Backup Code' : 'Verification Code'}</label>
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder={backupCodeMode ? 'XXXX-XXXX' : '000000'}
                    maxLength={backupCodeMode ? 9 : 6}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isLoading || mfaCode.length < (backupCodeMode ? 8 : 6)}
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>

                <div className="mfa-options">
                  <button
                    type="button"
                    className="toggle-auth"
                    onClick={() => {
                      setBackupCodeMode(!backupCodeMode);
                      setMfaCode('');
                    }}
                  >
                    {backupCodeMode ? 'Use authenticator code' : 'Use backup code'}
                  </button>
                  <button
                    type="button"
                    className="toggle-auth"
                    onClick={() => {
                      setMfaRequired(false);
                      setMfaCode('');
                      setBackupCodeMode(false);
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2>{isLogin ? 'Sign in' : 'Create account'}</h2>

              <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required={!isLogin}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isLoading}
                >
                  {isLoading
                    ? isLogin
                      ? 'Signing in...'
                      : 'Creating account...'
                    : isLogin
                    ? 'Sign in'
                    : 'Create account'}
                </button>
              </form>

              {/* Verification Required Message */}
              {verificationRequired && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    color: '#3b82f6',
                    fontSize: '14px',
                    margin: '0 0 12px',
                    lineHeight: 1.5
                  }}>
                    {verificationMessage}
                  </p>
                  <Link
                    to="/resend-verification"
                    style={{
                      color: '#3b82f6',
                      fontSize: '13px',
                      fontWeight: 500,
                      textDecoration: 'none'
                    }}
                  >
                    Didn't receive the email? Click here to resend
                  </Link>
                </div>
              )}

              <div className="auth-footer">
                <p>
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    className="toggle-auth"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setVerificationRequired(false);
                    }}
                  >
                    {isLogin ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="auth-disclaimer">
          By using OrdoVertex, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
