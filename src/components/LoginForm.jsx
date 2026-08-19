import React, { useState } from 'react';
import './AuthForms.css';

const LoginForm = ({ onLogin, onSwitchToRegister, onSwitchToTeacherRegister, isLoading: parentLoading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const success = await onLogin(formData.email, formData.password);
      if (!success) {
        setError('Invalid email or password. Please check your credentials.');
      }
    } catch (error) {
      if (error.message && error.message.includes('verify your email')) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        setShowResend(true);
      } else {
        setError(error.message || 'Login failed. Please try again.');
      }
    }

    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setShowResend(false);
  };

  const handleDemoLogin = (role) => {
    let email, password;

    switch(role) {
      case 'admin':
        email = 'codesmartng1@gmail.com';
        password = 'Kb1217@#$%&';
        break;
      case 'teacher':
        email = 'kabir@teacher.com';
        password = '121712';
        break;
      case 'student':
        email = 'student@example.com';
        password = 'password123';
        break;
      default:
        return;
    }

    setFormData({ email, password });
    // Auto-submit after setting the values
    setTimeout(() => {
      const submitEvent = new Event('submit', { cancelable: true });
      handleSubmit(submitEvent);
    }, 100);
  };

  const handleResendVerification = async () => {
    try {
      // You'll need to import resendVerificationEmail from your firebase service
      setResendMessage('✅ Verification email resent! Please check your inbox and spam folder.');
      setTimeout(() => setResendMessage(''), 5000);
    } catch (error) {
      setResendMessage('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-icon">🔐</div>
          <h2>Welcome Back</h2>
          <p>Sign in to your STEM Platform account</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {resendMessage && (
          <div className={`resend-message ${resendMessage.includes('✅') ? 'success' : 'error'}`}>
            {resendMessage}
          </div>
        )}

        {showResend && (
          <div className="verification-prompt">
            <p>Didn't receive the verification email?</p>
            <button
              type="button"
              className="resend-btn"
              onClick={handleResendVerification}
            >
              Resend Verification Email
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address <span className="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="form-input"
              disabled={isLoading || parentLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="form-input"
              disabled={isLoading || parentLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={`btn-primary login-btn ${isLoading || parentLoading ? 'loading' : ''}`}
            disabled={isLoading || parentLoading}
          >
            {isLoading || parentLoading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo Login Buttons */}
        <div className="demo-section">
          <p className="demo-label">Quick Demo Login</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn demo-admin"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading || parentLoading}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="demo-btn demo-teacher"
              onClick={() => handleDemoLogin('teacher')}
              disabled={isLoading || parentLoading}
            >
              👨‍🏫 Teacher
            </button>
            <button
              type="button"
              className="demo-btn demo-student"
              onClick={() => handleDemoLogin('student')}
              disabled={isLoading || parentLoading}
            >
              👨‍🎓 Student
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          <div className="footer-section">
            <p className="footer-title">Don't have an account?</p>
            <div className="register-options">
              <button
                type="button"
                className="btn-outline student-register-btn"
                onClick={onSwitchToRegister}
                disabled={isLoading || parentLoading}
              >
                <span className="btn-icon">👨‍🎓</span>
                Sign up as Student
              </button>

              {/* ✅ Teacher Register Button Removed - Now in Careers.jsx */}
              {/*
              <button
                type="button"
                className="btn-outline teacher-register-btn"
                onClick={onSwitchToTeacherRegister}
                disabled={isLoading || parentLoading}
              >
                <span className="btn-icon">👨‍🏫</span>
                Sign up as Teacher
              </button>
              */}
            </div>
          </div>

          <div className="teacher-info">
            <h4>💡 Interested in Teaching?</h4>
            <p>Join our platform as an educator and share your knowledge with students worldwide</p>
            <ul>
              <li>✅ Create and manage your own courses</li>
              <li>✅ Reach students interested in your expertise</li>
              <li>✅ Get admin approval for quality control</li>
              <li>✅ Earn from your teaching</li>
            </ul>
            <button
              type="button"
              className="teacher-info-btn"
              onClick={onSwitchToTeacherRegister}
              disabled={isLoading || parentLoading}
            >
              Learn More About Teaching
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
