// src/components/TeacherBankDetails.jsx
import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile } from '../firebase/storageService';
import './TeacherBankDetails.css';

const TeacherBankDetails = ({ currentUser, onUpdate, onClose }) => {
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    routingNumber: '',
    bankCode: '',
    swiftCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Load existing bank details if available
  useEffect(() => {
    if (currentUser?.bankDetails) {
      setBankDetails(currentUser.bankDetails);
      setIsEditing(true);
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Only allow numbers for account number
    if (name === 'accountNumber' && !/^\d*$/.test(value)) {
      return;
    }
    setBankDetails({ ...bankDetails, [name]: value });
    setError('');
  };

  const validateForm = () => {
    if (!bankDetails.bankName.trim()) {
      setError('Please enter your bank name');
      return false;
    }
    if (!bankDetails.accountNumber.trim()) {
      setError('Please enter your account number');
      return false;
    }
    if (bankDetails.accountNumber.length < 10) {
      setError('Account number must be at least 10 digits');
      return false;
    }
    if (!bankDetails.accountName.trim()) {
      setError('Please enter the account holder name');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('Please log in to save bank details');
      }

      // Update user profile with bank details
      await updateUserProfile(user.uid, {
        bankDetails: {
          ...bankDetails,
          updatedAt: new Date().toISOString()
        }
      });

      setSuccess('✅ Bank details saved successfully!');
      setIsEditing(true);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate({ bankDetails });
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 3000);

    } catch (error) {
      console.error('Error saving bank details:', error);
      setError(error.message || 'Failed to save bank details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  // Nigerian banks list
  const nigerianBanks = [
    'Access Bank',
    'Citibank',
    'Ecobank',
    'Fidelity Bank',
    'First Bank',
    'First City Monument Bank (FCMB)',
    'Globus Bank',
    'Guaranty Trust Bank (GTBank)',
    'Heritage Bank',
    'Keystone Bank',
    'Kuda Bank',
    'OPay',
    'PalmPay',
    'Polaris Bank',
    'Providus Bank',
    'Stanbic IBTC Bank',
    'Standard Chartered Bank',
    'Sterling Bank',
    'Suntrust Bank',
    'Titan Trust Bank',
    'Union Bank',
    'United Bank for Africa (UBA)',
    'Unity Bank',
    'Wema Bank',
    'Zenith Bank'
  ];

  return (
    <div className="teacher-bank-details">
      <div className="bank-details-card">
        <div className="card-header">
          <h2>🏦 Bank Account Details</h2>
          {isEditing && (
            <button onClick={handleEdit} className="edit-btn" disabled={loading}>
              ✏️ Edit
            </button>
          )}
          {onClose && (
            <button onClick={handleCancel} className="close-btn">×</button>
          )}
        </div>

        <div className="card-body">
          {isEditing && currentUser?.bankDetails ? (
            // View Mode
            <div className="view-mode">
              <div className="bank-info-display">
                <div className="info-row">
                  <span className="label">Bank Name:</span>
                  <span className="value">{currentUser.bankDetails.bankName}</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Number:</span>
                  <span className="value">{currentUser.bankDetails.accountNumber}</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Name:</span>
                  <span className="value">{currentUser.bankDetails.accountName}</span>
                </div>
                {currentUser.bankDetails.routingNumber && (
                  <div className="info-row">
                    <span className="label">Routing Number:</span>
                    <span className="value">{currentUser.bankDetails.routingNumber}</span>
                  </div>
                )}
                {currentUser.bankDetails.swiftCode && (
                  <div className="info-row">
                    <span className="label">SWIFT Code:</span>
                    <span className="value">{currentUser.bankDetails.swiftCode}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Last Updated:</span>
                  <span className="value">
                    {currentUser.bankDetails.updatedAt 
                      ? new Date(currentUser.bankDetails.updatedAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="verification-badge">
                <span className="badge verified">✅ Verified</span>
                <p className="verification-note">
                  Your bank details are securely stored and encrypted.
                </p>
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={handleSubmit} className="bank-form">
              <div className="form-group">
                <label htmlFor="bankName">Bank Name *</label>
                <select
                  id="bankName"
                  name="bankName"
                  value={bankDetails.bankName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="form-select"
                >
                  <option value="">Select your bank</option>
                  {nigerianBanks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="accountName">Account Holder Name *</label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  placeholder="e.g., John Doe"
                  value={bankDetails.accountName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="form-input"
                />
                <small className="help-text">
                  Name as it appears on your bank account
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="accountNumber">Account Number *</label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  placeholder="e.g., 0123456789"
                  value={bankDetails.accountNumber}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="form-input"
                  maxLength="10"
                  minLength="10"
                />
                <small className="help-text">
                  10-digit NUBAN account number
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="routingNumber">Routing Number (Optional)</label>
                <input
                  type="text"
                  id="routingNumber"
                  name="routingNumber"
                  placeholder="e.g., 011234567"
                  value={bankDetails.routingNumber}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="swiftCode">SWIFT/BIC Code (Optional)</label>
                <input
                  type="text"
                  id="swiftCode"
                  name="swiftCode"
                  placeholder="e.g., GTBANGLA"
                  value={bankDetails.swiftCode}
                  onChange={handleChange}
                  disabled={loading}
                  className="form-input"
                />
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  <span>{error}</span>
                  <button className="error-close" onClick={() => setError('')}>×</button>
                </div>
              )}

              {success && (
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <span>{success}</span>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="save-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    '💾 Save Bank Details'
                  )}
                </button>
                {onClose && (
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="security-notice">
                <p>🔒 Your bank details are encrypted and secure.</p>
                <p>We use industry-standard encryption to protect your financial information.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherBankDetails;
