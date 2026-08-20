// src/components/html2canvas.jsx
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './html2canvas.css';

const Html2CanvasComponent = ({ 
  children, 
  onCapture, 
  onError,
  fileName = 'download',
  type = 'image', // 'image', 'pdf'
  quality = 0.95,
  scale = 2,
  backgroundColor = '#ffffff',
  className = '',
  captureButtonText = '📸 Capture',
  downloadButtonText = '⬇️ Download',
  showControls = true,
  autoCapture = false,
  captureDelay = 1000
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [captureError, setCaptureError] = useState(null);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef(null);
  const captureTimeoutRef = useRef(null);

  // Auto-capture on mount if enabled
  useEffect(() => {
    if (autoCapture) {
      captureTimeoutRef.current = setTimeout(() => {
        handleCapture();
      }, captureDelay);
    }
    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, [autoCapture, captureDelay]);

  const handleCapture = async () => {
    if (!contentRef.current) {
      setCaptureError('Content not found to capture');
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);
    setProgress(0);

    try {
      // Show progress
      setProgress(20);

      // Configure html2canvas options
      const canvas = await html2canvas(contentRef.current, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: backgroundColor,
        logging: false,
        onclone: (document) => {
          setProgress(50);
        },
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      setProgress(80);

      const imageData = canvas.toDataURL('image/png', quality);
      setCapturedImage(imageData);
      setProgress(100);

      // Call onCapture callback if provided
      if (onCapture) {
        onCapture(imageData, canvas);
      }

      console.log('✅ Capture successful!');
    } catch (error) {
      console.error('❌ Capture error:', error);
      setCaptureError(error.message || 'Failed to capture content');
      if (onError) {
        onError(error);
      }
    } finally {
      setIsCapturing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownload = () => {
    if (!capturedImage) {
      setCaptureError('No captured image to download');
      return;
    }

    setIsDownloading(true);
    setCaptureError(null);

    try {
      if (type === 'pdf') {
        downloadAsPDF();
      } else {
        downloadAsImage();
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      setCaptureError(error.message || 'Failed to download');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsImage = () => {
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = capturedImage;
    link.click();
    console.log('✅ Image downloaded successfully');
  };

  const downloadAsPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [contentRef.current?.scrollWidth || 800, contentRef.current?.scrollHeight || 600]
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (contentRef.current?.scrollHeight || 600) * (imgWidth / (contentRef.current?.scrollWidth || 800));

    pdf.addImage(capturedImage, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${fileName}.pdf`);
    console.log('✅ PDF downloaded successfully');
  };

  const handleReset = () => {
    setCapturedImage(null);
    setCaptureError(null);
    setProgress(0);
  };

  return (
    <div className={`html2canvas-container ${className}`}>
      {/* Controls */}
      {showControls && (
        <div className="html2canvas-controls">
          <div className="controls-left">
            <button
              className="capture-btn"
              onClick={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <>
                  <span className="spinner-small"></span>
                  Capturing...
                </>
              ) : (
                captureButtonText
              )}
            </button>

            {capturedImage && (
              <>
                <button
                  className="download-btn"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <span className="spinner-small"></span>
                      Downloading...
                    </>
                  ) : (
                    downloadButtonText
                  )}
                </button>

                <button
                  className="reset-btn"
                  onClick={handleReset}
                  disabled={isDownloading || isCapturing}
                >
                  🔄 Reset
                </button>
              </>
            )}
          </div>

          {/* Type selector */}
          {capturedImage && (
            <div className="controls-right">
              <span className="file-type-badge">
                {type === 'pdf' ? '📄 PDF' : '🖼️ PNG'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isCapturing && progress > 0 && progress < 100 && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            <span className="progress-text">{progress}%</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {captureError && (
        <div className="error-container">
          <span className="error-icon">❌</span>
          <span className="error-text">{captureError}</span>
          <button className="error-close" onClick={() => setCaptureError(null)}>×</button>
        </div>
      )}

      {/* Content to Capture */}
      <div ref={contentRef} className="html2canvas-content">
        {children}
      </div>

      {/* Preview of Captured Image */}
      {capturedImage && (
        <div className="capture-preview-container">
          <div className="preview-header">
            <h4>📋 Preview</h4>
            <span className="preview-size">
              {(new Blob([capturedImage]).size / 1024).toFixed(0)} KB
            </span>
          </div>
          <div className="preview-wrapper">
            <img 
              src={capturedImage} 
              alt="Captured content" 
              className="capture-preview"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Custom hook for using html2canvas
export const useHtml2Canvas = (options = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const capture = async (element, customOptions = {}) => {
    if (!element) {
      setError('Element not found');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ...options,
        ...customOptions
      });

      const imageData = canvas.toDataURL('image/png');
      setResult({ canvas, imageData });
      return { canvas, imageData };
    } catch (error) {
      console.error('Capture error:', error);
      setError(error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (imageData, fileName = 'download.png') => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageData;
    link.click();
  };

  const downloadPDF = (imageData, fileName = 'download.pdf') => {
    const pdf = new jsPDF();
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297);
    pdf.save(fileName);
  };

  return {
    capture,
    downloadImage,
    downloadPDF,
    isLoading,
    error,
    result,
    reset: () => {
      setResult(null);
      setError(null);
    }
  };
};

// Certificate specific component
export const CertificateCapture = ({ 
  certificate, 
  onDownload, 
  onClose,
  studentName,
  courseName,
  completionDate,
  verificationCode
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const certificateRef = useRef(null);

  const handleCapture = async () => {
    if (!certificateRef.current) return;
    
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
      });
      
      const imageData = canvas.toDataURL('image/png');
      setCapturedImage(imageData);
      
      if (onDownload) {
        onDownload(imageData);
      }
    } catch (error) {
      console.error('Certificate capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = (format = 'png') => {
    if (!capturedImage) return;

    if (format === 'pdf') {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [certificateRef.current?.scrollWidth || 1200, certificateRef.current?.scrollHeight || 800]
      });
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (certificateRef.current?.scrollHeight || 800) * (imgWidth / (certificateRef.current?.scrollWidth || 1200));
      pdf.addImage(capturedImage, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`certificate-${studentName || 'student'}.pdf`);
    } else {
      const link = document.createElement('a');
      link.download = `certificate-${studentName || 'student'}.png`;
      link.href = capturedImage;
      link.click();
    }
  };

  return (
    <div className="certificate-capture-modal">
      <div className="certificate-capture-content">
        <div className="certificate-capture-header">
          <h2>🎓 Certificate</h2>
          <div className="certificate-actions">
            <button 
              className="capture-btn" 
              onClick={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? '📸 Capturing...' : '📸 Capture'}
            </button>
            {capturedImage && (
              <>
                <button 
                  className="download-png-btn" 
                  onClick={() => handleDownload('png')}
                >
                  ⬇️ PNG
                </button>
                <button 
                  className="download-pdf-btn" 
                  onClick={() => handleDownload('pdf')}
                >
                  📄 PDF
                </button>
              </>
            )}
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="certificate-preview" ref={certificateRef}>
          {certificate || (
            <div className="certificate-template">
              <div className="certificate-border">
                <div className="certificate-inner">
                  <h1>🎓 Certificate of Completion</h1>
                  <p className="certificate-text">This certifies that</p>
                  <h2 className="student-name">{studentName || 'Student'}</h2>
                  <p className="certificate-text">has successfully completed</p>
                  <h3 className="course-name">{courseName || 'Course'}</h3>
                  <p className="completion-date">
                    Completed on: {completionDate || new Date().toLocaleDateString()}
                  </p>
                  {verificationCode && (
                    <p className="verification-code">
                      Verification Code: {verificationCode}
                    </p>
                  )}
                  <div className="certificate-footer">
                    <p>🏫 STEM Education Platform</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {capturedImage && (
          <div className="capture-success">
            <span className="success-icon">✅</span>
            <span>Certificate captured successfully! Download it now.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Html2CanvasComponent;
