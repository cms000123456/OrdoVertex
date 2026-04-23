import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Loader2, Mail, CheckCircle, ArrowLeft, Send } from 'lucide-react';
import { getErrorMessage, getAxiosErrorData } from '../utils/error-helper';

export function ResendVerification() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await authApi.resendVerification(email);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message || 'If an account exists with this email, a verification link has been sent.');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error: unknown) {
      setStatus('error');
      setMessage(getAxiosErrorData(error)?.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="resend-verification-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0f172a)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'var(--bg-secondary, #1e293b)',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary, #f1f5f9)',
            margin: 0
          }}>
            Ordo<span style={{ color: 'var(--accent, #3b82f6)' }}>Vertex</span>
          </h1>
        </div>

        {/* Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: status === 'success' 
            ? 'rgba(34, 197, 94, 0.1)' 
            : status === 'error' 
              ? 'rgba(239, 68, 68, 0.1)' 
              : 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          {status === 'loading' ? (
            <Loader2 size={36} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          ) : status === 'success' ? (
            <CheckCircle size={36} style={{ color: '#22c55e' }} />
          ) : (
            <Mail size={36} style={{ color: '#3b82f6' }} />
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text-primary, #f1f5f9)',
          margin: '0 0 12px',
          textAlign: 'center'
        }}>
          {status === 'success' ? 'Email Sent!' : 'Resend Verification Email'}
        </h2>

        {/* Description */}
        {status !== 'success' && (
          <p style={{
            fontSize: '15px',
            color: 'var(--text-secondary, #94a3b8)',
            margin: '0 0 24px',
            lineHeight: 1.5,
            textAlign: 'center'
          }}>
            Enter your email address and we'll send you a new verification link.
          </p>
        )}

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            background: status === 'success' 
              ? 'rgba(34, 197, 94, 0.1)' 
              : status === 'error' 
                ? 'rgba(239, 68, 68, 0.1)' 
                : 'transparent',
            color: status === 'success' 
              ? '#22c55e' 
              : status === 'error' 
                ? '#ef4444' 
                : 'inherit',
            border: status === 'success' 
              ? '1px solid rgba(34, 197, 94, 0.2)' 
              : status === 'error' 
                ? '1px solid rgba(239, 68, 68, 0.2)' 
                : 'none'
          }}>
            {message}
          </div>
        )}

        {/* Form */}
        {status !== 'success' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label 
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #94a3b8)',
                  marginBottom: '6px'
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: 'var(--bg-tertiary, #334155)',
                  border: '1px solid var(--border, #475569)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #f1f5f9)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'var(--accent, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Verification Email
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to login */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link
            to="/login"
            style={{
              color: 'var(--accent, #3b82f6)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>

        {/* Help text */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--bg-tertiary, rgba(51, 65, 85, 0.5))',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--text-tertiary, #64748b)',
          lineHeight: 1.5
        }}>
          <strong style={{ color: 'var(--text-secondary, #94a3b8)' }}>Didn't receive the email?</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '16px' }}>
            <li>Check your spam or junk folder</li>
            <li>Verify that you entered the correct email address</li>
            <li>Wait a few minutes and try again</li>
            <li>Contact support if the problem persists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
