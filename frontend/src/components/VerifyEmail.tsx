import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token.');
        return;
      }

      try {
        const response = await authApi.verifyEmail(token);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Your email has been verified successfully!');
          
          // If auto-login is enabled and we got a token, set auth
          if (response.data.data?.token && response.data.data?.user) {
            useAuthStore.getState().setAuth(response.data.data.user, response.data.data.token);
          }
          
          // Start countdown for redirect
          let count = 5;
          interval = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(interval);
              navigate('/workflows');
            }
          }, 1000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Invalid or expired verification token.');
      }
    };

    verifyToken();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, navigate]);

  return (
    <div className="verify-email-page" style={{
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
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '24px' }}>
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
          {status === 'verifying' && (
            <Loader2 size={36} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'success' && (
            <CheckCircle size={36} style={{ color: '#22c55e' }} />
          )}
          {status === 'error' && (
            <XCircle size={36} style={{ color: '#ef4444' }} />
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text-primary, #f1f5f9)',
          margin: '0 0 12px'
        }}>
          {status === 'verifying' && 'Verifying Email'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary, #94a3b8)',
          margin: '0 0 24px',
          lineHeight: 1.5
        }}>
          {message}
        </p>

        {/* Success countdown */}
        {status === 'success' && (
          <p style={{
            fontSize: '14px',
            color: 'var(--text-tertiary, #64748b)',
            margin: '0 0 24px'
          }}>
            Redirecting to workflows in {countdown} seconds...
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {status === 'success' && (
            <button
              onClick={() => navigate('/workflows')}
              style={{
                padding: '12px 24px',
                background: 'var(--accent, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              Go to Workflows
            </button>
          )}
          
          {status === 'error' && (
            <>
              <Link
                to="/resend-verification"
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Mail size={18} />
                Resend Verification Email
              </Link>
              
              <Link
                to="/login"
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'block'
                }}
              >
                Back to Login
              </Link>
            </>
          )}
          
          {status === 'verifying' && (
            <div style={{ color: 'var(--text-tertiary, #64748b)', fontSize: '14px' }}>
              Please wait while we verify your email address...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
