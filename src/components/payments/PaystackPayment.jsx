import React, { useState } from 'react';
import Button from '../ui/Button';
import Loader from '../ui/Loader';

const PaystackPayment = ({ lesson, student, onSuccess, onClose, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStep, setPaymentStep] = useState('init'); // init, redirect, success, failed

  // Simulate Paystack payment
  const simulatePaystackPayment = () => {
    return new Promise((resolve, reject) => {
      // Simulate API call to Paystack
      setTimeout(() => {
        const isSuccess = Math.random() > 0.2; // 80% success rate for demo
        if (isSuccess) {
          resolve({
            reference: `PSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transaction: `TXN_${Date.now()}`,
            status: 'success',
            message: 'Payment successful'
          });
        } else {
          reject(new Error('Payment failed. Please check your card details and try again.'));
        }
      }, 3000);
    });
  };

  const handlePaymentSuccess = (reference) => {
    setIsProcessing(false);
    setPaymentStep('success');
    console.log('Payment successful:', reference);
    
    // Simulate successful payment processing
    setTimeout(() => {
      onSuccess({
        paymentId: reference.reference,
        gateway: 'paystack',
        amount: lesson.price,
        lessonId: lesson.id,
        studentId: student.id,
        timestamp: new Date().toISOString(),
        transactionData: reference
      });
    }, 1500);
  };

  const handlePaymentError = (error) => {
    setIsProcessing(false);
    setPaymentStep('failed');
    console.error('Payment error:', error);
    setError(error.message || 'Payment failed. Please try again.');
    onError(error);
  };

  const handlePaymentClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setPaymentStep('redirect');
    setError(null);
    
    try {
      // Simulate Paystack payment
      const paymentResult = await simulatePaystackPayment();
      handlePaymentSuccess(paymentResult);
    } catch (err) {
      handlePaymentError(err);
    }
  };

  const handleRetryPayment = () => {
    setPaymentStep('init');
    setError(null);
  };

  // Payment redirect screen (simulating Paystack page)
  if (paymentStep === 'redirect') {
    return (
      <div className="payment-redirect">
        <Loader size="large" />
        <h3>Redirecting to Paystack...</h3>
        <p>You are being redirected to Paystack's secure payment page.</p>
        <div className="payment-demo-card">
          <h4>💳 Demo Card Details:</h4>
          <ul>
            <li><strong>Card Number:</strong> 4084 0840 8408 4081</li>
            <li><strong>Expiry:</strong> Any future date</li>
            <li><strong>CVV:</strong> 408</li>
            <li><strong>OTP:</strong> 123456</li>
          </ul>
        </div>
      </div>
    );
  }

  // Payment success screen
  if (paymentStep === 'success') {
    return (
      <div className="payment-success-screen">
        <div className="success-icon">🎉</div>
        <h3>Payment Successful!</h3>
        <p>Your payment of <strong>₦{lesson.price.toLocaleString()}</strong> has been processed successfully.</p>
        <p>You now have access to <strong>{lesson.title}</strong></p>
        <div className="success-actions">
          <Button 
            onClick={() => onClose()}
            className="btn-primary"
          >
            Continue to Lesson
          </Button>
        </div>
      </div>
    );
  }

  // Payment failed screen
  if (paymentStep === 'failed') {
    return (
      <div className="payment-failed-screen">
        <div className="failed-icon">❌</div>
        <h3>Payment Failed</h3>
        <p>{error}</p>
        <div className="failed-actions">
          <Button 
            onClick={handleRetryPayment}
            className="btn-primary"
          >
            Try Again
          </Button>
          <Button 
            onClick={onClose}
            className="btn-outline"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Initial payment screen
  return (
    <div className="paystack-payment">
      {error && (
        <div className="payment-error alert alert-error">
          <p>{error}</p>
        </div>
      )}
      
      <div className="payment-summary">
        <h3>Order Summary</h3>
        <div className="summary-item">
          <span>Lesson:</span>
          <span>{lesson.title}</span>
        </div>
        <div className="summary-item">
          <span>Course:</span>
          <span>{lesson.courseTitle}</span>
        </div>
        <div className="summary-item total">
          <span>Total Amount:</span>
          <span>₦{lesson.price.toLocaleString()}</span>
        </div>
      </div>

      <div className="payment-methods">
        <h4>Select Payment Method</h4>
        <div className="payment-option">
          <input type="radio" id="card" name="payment" defaultChecked />
          <label htmlFor="card">💳 Debit/Credit Card</label>
        </div>
        <div className="payment-option">
          <input type="radio" id="transfer" name="payment" />
          <label htmlFor="transfer">🏦 Bank Transfer</label>
        </div>
        <div className="payment-option">
          <input type="radio" id="ussd" name="payment" />
          <label htmlFor="ussd">📱 USSD</label>
        </div>
        <div className="payment-option">
          <input type="radio" id="mobile" name="payment" />
          <label htmlFor="mobile">📱 Mobile Money</label>
        </div>
      </div>

      <div className="payment-info">
        <p>You will be redirected to Paystack's secure payment page to complete your transaction.</p>
      </div>
      
      <Button
        onClick={handlePaymentClick}
        disabled={isProcessing}
        className={`payment-btn paystack-btn ${isProcessing ? 'processing' : ''}`}
        fullWidth
      >
        {isProcessing ? (
          <>
            <Loader size="small" />
            Processing...
          </>
        ) : (
          `Pay ₦${lesson.price.toLocaleString()}`
        )}
      </Button>
      
      <p className="payment-note">
        🔒 Secure payment encrypted with SSL technology
      </p>
      
      <div className="payment-security">
        <div className="security-features">
          <span>✅ PCI DSS Compliant</span>
          <span>✅ 3D Secure</span>
          <span>✅ SSL Encrypted</span>
        </div>
      </div>

      <div className="payment-footer">
        <Button 
          onClick={onClose}
          className="btn-link"
          fullWidth
        >
          Cancel Payment
        </Button>
      </div>
    </div>
  );
};

export default PaystackPayment;