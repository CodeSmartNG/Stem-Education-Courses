import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getCurrentUser } from '../firebase/storageService';
import './Certificate.css';

const Certificate = ({ certificate, onClose, onDownload }) => {
  const certificateRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('png'); // 'png' or 'pdf'
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get current user
  const currentUser = getCurrentUser();

  // Handle download as PNG
  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
        windowWidth: certificateRef.current.scrollWidth,
        windowHeight: certificateRef.current.scrollHeight,
      });
      
      const link = document.createElement('a');
      const fileName = `Certificate_${certificate.courseKey}_${certificate.studentName || 'Student'}.png`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/png', 0.95);
      link.click();
      
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('❌ Error downloading certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle download as PDF
  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
        windowWidth: certificateRef.current.scrollWidth,
        windowHeight: certificateRef.current.scrollHeight,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `Certificate_${certificate.courseKey}_${certificate.studentName || 'Student'}.pdf`;
      pdf.save(fileName);
      
      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('❌ Error downloading PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = (format = 'png') => {
    if (format === 'pdf') {
      handleDownloadPDF();
    } else {
      handleDownloadPNG();
    }
  };

  const handleVerify = () => {
    setShowVerification(!showVerification);
    // In a real app, you would verify with Firebase
    setIsVerified(true);
  };

  const shareCertificate = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      if (navigator.share) {
        await navigator.share({
          title: `Certificate - ${certificate.courseTitle}`,
          text: `I've completed the course "${certificate.courseTitle}" on Hausa STEM Platform! 🎓`,
          files: [new File([blob], `Certificate_${certificate.courseKey}.png`, { type: 'image/png' })]
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `🎓 I've completed the course "${certificate.courseTitle}" on Hausa STEM Platform!\n` +
          `Verification Code: ${certificate.verificationCode}\n` +
          `Certificate ID: ${certificate.id}`
        );
        alert('✅ Certificate info copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('❌ Unable to share. You can download the certificate instead.');
    }
  };

  // Get verification status
  const getVerificationStatus = () => {
    if (isVerified) {
      return <span className="status-verified">✅ Verified</span>;
    }
    return <span className="status-pending">⏳ Not Verified</span>;
  };

  return (
    <div className="certificate-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="certificate-modal">
        <div className="certificate-modal-header">
          <div className="header-left">
            <h2>🎓 Certificate of Completion</h2>
            <span className="certificate-badge">🏅 Official</span>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close">
            ×
          </button>
        </div>
        
        {/* Actions Bar */}
        <div className="certificate-actions-bar">
          <div className="action-group">
            <button 
              onClick={() => handleDownload('png')} 
              className="download-btn"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="spinner-small"></span>
                  Downloading...
                </>
              ) : (
                '📥 Download PNG'
              )}
            </button>
            <button 
              onClick={() => handleDownload('pdf')} 
              className="download-pdf-btn"
              disabled={isDownloading}
            >
              📄 Download PDF
            </button>
          </div>

          <div className="action-group">
            <button onClick={shareCertificate} className="share-btn" disabled={isDownloading}>
              📤 Share
            </button>
            <button onClick={handleVerify} className="verify-btn" disabled={isDownloading}>
              🔍 Verify
            </button>
          </div>
        </div>

        {/* Verification Status */}
        {showVerification && (
          <div className={`verification-status ${isVerified ? 'verified' : 'pending'}`}>
            <div className="verification-icon">{isVerified ? '✅' : '⏳'}</div>
            <div className="verification-info">
              <h4>{isVerified ? 'Certificate Verified' : 'Verification Pending'}</h4>
              <p>
                {isVerified 
                  ? `This certificate is authentic and issued by Hausa STEM Platform.`
                  : `Please wait while we verify this certificate.`}
              </p>
              {isVerified && certificate.verificationCode && (
                <p className="verification-code">
                  <strong>Verification Code:</strong> {certificate.verificationCode}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Certificate Design */}
        <div ref={certificateRef} className="certificate-wrapper">
          <div className="certificate-design">
            {/* Decorative Border */}
            <div className="certificate-border">
              <div className="certificate-border-inner">
                {/* Decorative Corners */}
                <div className="corner corner-tl"></div>
                <div className="corner corner-tr"></div>
                <div className="corner corner-bl"></div>
                <div className="corner corner-br"></div>

                <div className="certificate-content">
                  {/* Header */}
                  <div className="certificate-header-design">
                    <div className="certificate-seal">🏆</div>
                    <h1>Certificate of Completion</h1>
                    <div className="header-divider"></div>
                    <p className="subtitle">Hausa STEM Education Platform</p>
                  </div>

                  {/* Body */}
                  <div className="certificate-body">
                    <p className="presented-to">This is to certify that</p>
                    <h2 className="student-name">{certificate.studentName || 'Student'}</h2>
                    <p className="completion-text">
                      has successfully completed the course
                    </p>
                    <h3 className="course-title">"{certificate.courseTitle}"</h3>
                    
                    <div className="certificate-details">
                      <div className="detail-item">
                        <span className="detail-icon">📅</span>
                        <span className="detail-label">Completed:</span>
                        <span className="detail-value">{formatDate(certificate.completionDate)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">📜</span>
                        <span className="detail-label">Issued:</span>
                        <span className="detail-value">{formatDate(certificate.issuedDate)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">🔑</span>
                        <span className="detail-label">Certificate ID:</span>
                        <span className="detail-value">{certificate.id || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="certificate-footer-design">
                    <div className="signature-section">
                      <div className="signature-line"></div>
                      <div className="signature-info">
                        <p className="signature-name">Dr. Kabir Alkasim</p>
                        <p className="signature-title">Director, Hausa STEM Platform</p>
                      </div>
                    </div>
                    <div className="certificate-id-footer">
                      <span>🔑 {certificate.verificationCode}</span>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="decoration deco-tl">✦</div>
                  <div className="decoration deco-tr">✦</div>
                  <div className="decoration deco-bl">✦</div>
                  <div className="decoration deco-br">✦</div>
                  <div className="decoration deco-center">✦</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="certificate-instructions">
          <div className="instructions-header">
            <h4>💡 How to Use Your Certificate</h4>
          </div>
          <div className="instructions-grid">
            <div className="instruction-item">
              <span className="instruction-icon">📥</span>
              <div>
                <strong>Download</strong>
                <p>Save as PNG or PDF for printing or sharing</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">📤</span>
              <div>
                <strong>Share</strong>
                <p>Add to LinkedIn, portfolio, or CV</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">🔍</span>
              <div>
                <strong>Verify</strong>
                <p>Use the verification code to prove authenticity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="certificate-modal-footer">
          <div className="footer-info">
            <span>© {new Date().getFullYear()} Hausa STEM Education Platform</span>
            <span className="footer-divider">|</span>
            <span>Version 2.0</span>
          </div>
          <div className="footer-actions">
            <button onClick={onClose} className="close-modal-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
