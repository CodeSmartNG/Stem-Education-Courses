import React, { useState } from 'react';
import { checkCertificateEligibility, generateCertificate } from '../firebase/storageService';
import Certificate from './Certificate';
import './CertificateAward.css';

const CertificateAward = ({ student, courseKey, onClose }) => {
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const checkEligibility = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await checkCertificateEligibility(student.uid || student.id, courseKey);
        setEligibility(result);
        
        // If already has certificate, show it
        if (result.certificate) {
          setCertificate(result.certificate);
        }
      } catch (error) {
        console.error('Error checking eligibility:', error);
        setError('Failed to check certificate eligibility. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (student && courseKey) {
      checkEligibility();
    }
  }, [student, courseKey]);

  const handleGenerateCertificate = async () => {
    try {
      setLoading(true);
      const newCertificate = await generateCertificate(student.uid || student.id, courseKey);
      setCertificate(newCertificate);
      setShowCertificate(true);
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = () => {
    setShowCertificate(true);
  };

  const handleDownload = () => {
    // In a real implementation, this would download the certificate as PDF
    // For now, we'll just log it
    console.log('Certificate downloaded:', certificate);
    
    // You could add a PDF generation library like jspdf or html2canvas
    // Example: window.print() or generate PDF
    alert('Download feature will be available soon!');
  };

  if (showCertificate && certificate) {
    return (
      <Certificate 
        certificate={certificate} 
        onClose={() => setShowCertificate(false)}
        onDownload={handleDownload}
      />
    );
  }

  if (loading) {
    return (
      <div className="certificate-award">
        <div className="award-header">
          <h2>🎓 Course Completion Certificate</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="loading-certificate">
          <div className="loading-spinner"></div>
          <p>Checking certificate eligibility...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-award">
        <div className="award-header">
          <h2>🎓 Course Completion Certificate</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="award-content">
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="certificate-award">
      <div className="award-header">
        <h2>🎓 Course Completion Certificate</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="award-content">
        {eligibility ? (
          <>
            {eligibility.eligible ? (
              <div className="eligible-section">
                <div className="success-message">
                  <div className="success-icon">🎉</div>
                  <h3>Congratulations!</h3>
                  <p>You've successfully completed the course and earned a certificate!</p>
                </div>
                
                <div className="course-info">
                  <h4>{eligibility.courseTitle || 'Course'}</h4>
                  <p>Progress: 100% completed</p>
                </div>
                
                <button 
                  onClick={handleGenerateCertificate}
                  className="generate-cert-btn"
                  disabled={loading}
                >
                  {loading ? 'Generating...' : '🏆 Generate Certificate'}
                </button>
                
                <div className="certificate-benefits">
                  <h4>Your Certificate Will Include:</h4>
                  <ul>
                    <li>✅ Your name and course title</li>
                    <li>✅ Completion date</li>
                    <li>✅ Unique verification code</li>
                    <li>✅ Professional design for sharing</li>
                  </ul>
                </div>
              </div>
            ) : eligibility.certificate ? (
              <div className="already-issued">
                <div className="issued-icon">✅</div>
                <h3>Certificate Already Issued</h3>
                <p>You already have a certificate for this course.</p>
                
                <div className="certificate-preview">
                  <div className="preview-row">
                    <strong>Issued on:</strong> 
                    <span>{new Date(eligibility.certificate.issuedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="preview-row">
                    <strong>Verification Code:</strong>
                    <span className="verification-code">{eligibility.certificate.verificationCode}</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleViewCertificate}
                  className="view-cert-btn"
                >
                  👁️ View Certificate
                </button>
              </div>
            ) : (
              <div className="not-eligible">
                <div className="warning-icon">📚</div>
                <h3>Course Not Completed</h3>
                <p>You need to complete the course to earn a certificate.</p>
                
                <div className="progress-info">
                  <strong>Current Progress:</strong> {eligibility.progress || 0}%
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${eligibility.progress || 0}%`}}
                    ></div>
                  </div>
                </div>
                
                <p className="encouragement">
                  Keep learning! You're {100 - (eligibility.progress || 0)}% away from your certificate.
                </p>
                
                <button onClick={onClose} className="continue-learning-btn">
                  Continue Learning
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-eligibility">
            <div className="info-icon">ℹ️</div>
            <h3>No Certificate Available</h3>
            <p>Certificate eligibility could not be determined.</p>
            <button onClick={onClose} className="close-btn">Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateAward;
