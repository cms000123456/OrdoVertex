import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import './Onboarding.css';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

export function Onboarding() {
  const navigate = useNavigate();
  const { user, setAuth, logout } = useAuthStore();
  
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If no user or onboarding already completed, redirect
  if (!user || user.onboardingCompleted !== false) {
    navigate('/workflows');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authApi.completeOnboarding(email, password);
      const { user: updatedUser, token } = response.data.data;
      
      // Update auth store with new token and user
      setAuth(updatedUser, token);
      
      toast.success('Setup completed successfully! Welcome to OrdoVertex.');
      navigate('/workflows');
    } catch (error: unknown) {
      const message = (getAxiosErrorData(error)?.message || getErrorMessage(error)) || getAxiosErrorData(error)?.error || getErrorMessage(error) || 'Failed to complete setup';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1>Welcome to OrdoVertex!</h1>
          <p className="subtitle">Let's secure your account</p>
        </div>
        
        <div className="onboarding-info">
          <div className="info-icon">🔒</div>
          <p>
            For security reasons, please change the default email and password 
            before continuing. This helps protect your workflow automation platform.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
            <small className="help-text">
              This will be your new login email
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={isLoading}
              minLength={6}
            />
            <small className="help-text">
              Must be at least 6 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
            
            <button
              type="button"
              className="btn-secondary"
              onClick={handleLogout}
              disabled={isLoading}
            >
              Log Out
            </button>
          </div>
        </form>

        <div className="onboarding-footer">
          <small>
            Default credentials should never be used in production.
          </small>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
