import React, { useState, useEffect } from 'react';
import { resendVerificationEmail, getCurrentUser } from '../firebase/storageService';
import './EmailConfirmation.css';

const EmailConfirmation = ({ 
  email, 
  onConfirm, 
  onResend, 
  onCancel,
  token // Optional token for manual entry
}) => {
  const [manualToken, setManualToken] = useState(token || '');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // Handle countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-confirm if token is provided
  useEffect(() => {
    if (token) {
      setManualToken(token);
    }
  }, [token]);

  const handleManualConfirm = async () => {
    if (!manualToken.trim()) {
      setError('Please enter a confirmation token');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await onConfirm(manualToken.trim());
    } catch (error) {
      console.error('Confirmation error:', error);
      setError(error.message || 'Failed to confirm email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    setResendMessage('');
    setError('');
    
    try {
      // Try using Firebase's built-in resend
      if (onResend) {
        await onResend();
      } else {
        // Fallback to Firebase's resendVerificationEmail
        const currentUser = getCurrentUser();
        if (currentUser && !currentUser.isEmailVerified) {
          await resendVerificationEmail();
        } else {
          throw new Error('Unable to resend verification email. Please try again later.');
        }
      }
      
      setResendMessage('✅ Confirmation email sent successfully! Please check your inbox and spam folder.');
      setCountdown(60); // Disable button for 60 seconds
    } catch (error) {
      console.error('Resend error:', error);
      setResendMessage('❌ Failed to resend email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && manualToken.trim()) {
      handleManualConfirm();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="email-confirmation-container">
      <div className="email-confirmation-card">
        <div className="confirmation-header">
          <div className="confirmation-icon">📧</div>
          <h2>Confirm Your Email Address</h2>
        </div>
        
        <div className="confirmation-content">
          <p className="confirmation-instructions">
            We've sent a confirmation email to:
          </p>
          <p className="confirmation-email">{email}</p>
          
          <div className="confirmation-steps">
            <h3>📋 To complete your registration:</h3>
            <ol>
              <li>📥 Check your email inbox (and spam folder)</li>
              <li>🔗 Click the confirmation link in the email</li>
              <li>✅ Return here to log in</li>
            </ol>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">❌</span>
              <span className="error-text">{error}</span>
              <button className="error-close" onClick={() => setError('')}>×</button>
            </div>
          )}

          {/* Manual Token Entry for Demo/Testing */}
          <div className="manual-confirmation">
            <h4>🔑 Manual Confirmation</h4>
            <p className="demo-note">
              Enter your confirmation token below:
            </p>
            <div className="token-input-group">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter confirmation token"
                className="token-input"
                disabled={isLoading}
              />
              <button
                onClick={handleManualConfirm}
                disabled={!manualToken.trim() || isLoading}
                className="confirm-token-btn"
              >
                {isLoading ? 'Confirming...' : 'Confirm Email'}
              </button>
            </div>
            {token && (
              <p className="token-hint">
                💡 Token: <span className="token-display">{token}</span>
              </p>
            )}
          </div>

          {/* Resend Email Section */}
          <div className="resend-section">
            <p className="resend-question">Didn't receive the email?</p>
            <button
              onClick={handleResend}
              disabled={isResending || countdown > 0}
              className="resend-btn"
            >
              {isResending ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${formatTime(countdown)}`
              ) : (
                '📤 Resend Confirmation Email'
              )}
            </button>
            {resendMessage && (
              <p className={`resend-message ${resendMessage.includes('success') ? 'success' : 'error'}`}>
                {resendMessage}
              </p>
            )}
          </div>

          {/* Help Tips */}
          <div className="help-tips">
            <h4>💡 Having trouble?</h4>
            <ul>
              <li>📂 Check your spam or junk folder</li>
              <li>📧 Make sure you entered the correct email address</li>
              <li>⏳ Wait a few minutes - emails can take time to arrive</li>
              <li>📱 Contact support if you continue having issues</li>
            </ul>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            onClick={onCancel}
            className="cancel-btn"
            disabled={isLoading}
          >
            ← Back to Login
          </button>
        </div>

        {/* Demo Information */}
        <div className="demo-info">
          <details>
            <summary>ℹ️ Demo Information</summary>
            <div className="demo-content">
              <p>
                <strong>How this works in demo mode:</strong>
              </p>
              <ul>
                <li>🔑 Confirmation tokens are stored in Firebase</li>
                <li>📧 Firebase sends actual verification emails</li>
                <li>🔄 Use the "Resend" button to get a new email</li>
                <li>✅ Check your spam folder if you don't see the email</li>
              </ul>
              <p className="demo-note">
                <strong>Note:</strong> In production, Firebase handles email verification automatically.
                The manual token entry is provided for testing purposes.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
