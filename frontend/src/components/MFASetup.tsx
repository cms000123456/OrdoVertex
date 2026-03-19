import React, { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { mfaApi } from '../services/api';
import './MFASetup.css';

export function MFASetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await mfaApi.getStatus();
      setIsEnabled(response.data.data.enabled);
    } catch (error) {
      console.error('Failed to load MFA status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    try {
      const response = await mfaApi.setup();
      setSetupData(response.data.data);
      setShowSetup(true);
    } catch (error) {
      toast.error('Failed to setup MFA');
    }
  };

  const handleVerify = async () => {
    try {
      const response = await mfaApi.verify(verificationCode);
      setBackupCodes(response.data.data.backupCodes);
      setIsEnabled(true);
      setShowSetup(false);
      toast.success('MFA enabled successfully');
    } catch (error) {
      toast.error('Invalid verification code');
    }
  };

  const handleDisable = async () => {
    try {
      await mfaApi.disable(disableCode, disablePassword);
      setIsEnabled(false);
      setShowDisable(false);
      toast.success('MFA disabled');
    } catch (error) {
      toast.error('Failed to disable MFA');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return <div className="mfa-setup loading">Loading...</div>;
  }

  if (backupCodes.length > 0) {
    return (
      <div className="mfa-setup">
        <div className="mfa-success">
          <Shield size={48} className="success-icon" />
          <h2>MFA Enabled Successfully!</h2>
          <p className="warning">
            <AlertTriangle size={16} />
            Save these backup codes in a secure place. They can be used to access your account if you lose your authenticator device.
          </p>
          
          <div className="backup-codes">
            {backupCodes.map((code, index) => (
              <div key={index} className="backup-code">
                <code>{code}</code>
                <button onClick={() => copyToClipboard(code)}>
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
          
          <button
            className="btn btn-primary"
            onClick={() => setBackupCodes([])}
          >
            I've Saved My Backup Codes
          </button>
        </div>
      </div>
    );
  }

  if (showSetup && setupData) {
    return (
      <div className="mfa-setup">
        <h2>Setup Two-Factor Authentication</h2>
        
        <div className="setup-steps">
          <div className="step">
            <h3>1. Scan QR Code</h3>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <img src={setupData.qrCode} alt="MFA QR Code" className="qr-code" />
          </div>
          
          <div className="step">
            <h3>2. Or Enter Manually</h3>
            <div className="manual-code">
              <code>{setupData.manualEntryKey}</code>
              <button onClick={() => copyToClipboard(setupData.manualEntryKey)}>
                <Copy size={14} />
              </button>
            </div>
          </div>
          
          <div className="step">
            <h3>3. Verify Code</h3>
            <p>Enter the 6-digit code from your authenticator app</p>
            <div className="verification-input">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <button
                className="btn btn-primary"
                onClick={handleVerify}
                disabled={verificationCode.length !== 6}
              >
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
        
        <button
          className="btn btn-secondary"
          onClick={() => setShowSetup(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (showDisable) {
    return (
      <div className="mfa-setup">
        <h2>Disable Two-Factor Authentication</h2>
        <div className="disable-form">
          <div className="form-group">
            <label>Your Password</label>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <div className="form-group">
            <label>MFA Code</label>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
          </div>
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDisable(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDisable}
              disabled={!disablePassword || disableCode.length !== 6}
            >
              Disable MFA
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mfa-setup">
      <div className="mfa-header">
        <Shield size={32} className={isEnabled ? 'enabled' : ''} />
        <div>
          <h2>Two-Factor Authentication</h2>
          <p className="status">
            Status: <span className={isEnabled ? 'enabled' : 'disabled'}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </p>
        </div>
      </div>

      <div className="mfa-description">
        <p>
          Two-factor authentication adds an extra layer of security to your account.
          When enabled, you'll need to enter a code from your authenticator app in addition to your password.
        </p>
      </div>

      {isEnabled ? (
        <button
          className="btn btn-danger"
          onClick={() => setShowDisable(true)}
        >
          Disable MFA
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleSetup}
        >
          <Shield size={18} />
          Enable MFA
        </button>
      )}
    </div>
  );
}
