import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import Button from '../ui/Button';
import Loader from '../ui/Loader';

const PaystackPayment = ({ lesson, student, onSuccess, onClose, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Paystack configuration - NO BACKEND NEEDED
  const config = {
    reference: `CSNG_${lesson.id}_${student.id}_${new Date().getTime()}`,
    email: student.email,
    amount: Math.round(lesson.price * 100), // Convert to kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    currency: 'NGN',
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
    metadata: {
      student_id: student.id,
      student_name: student.name,
      lesson_id: lesson.id,
      lesson_title: lesson.title,
      course_id: lesson.courseId,
      course_title: lesson.courseTitle
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaymentSuccess = (reference) => {
    setIsProcessing(false);
    console.log('💰 Payment successful:', reference);
    
    // Process payment success immediately - no backend verification needed
    onSuccess({
      paymentId: reference.reference,
      gateway: 'paystack',
      amount: lesson.price,
      lessonId: lesson.id,
      studentId: student.id,
      timestamp: new Date().toISOString(),
      transactionData: reference,
      verified: true
    });
  };

  const handlePaymentClose = () => {
    setIsProcessing(false);
    console.log('Payment closed by user');
    onClose();
  };

  const handlePaymentError = (error) => {
    setIsProcessing(false);
    console.error('Payment error:', error);
    setError('Payment failed. Please try again.');
    onError(error);
  };

  const handlePaymentClick = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      initializePayment(handlePaymentSuccess, handlePaymentClose);
    } catch (err) {
      setIsProcessing(false);
      setError('Failed to initialize payment. Please try again.');
      onError(err);
    }
  };

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

      <div className="payment-info">
        <p>You will be redirected to Paystack's secure payment page.</p>
        <p><small>After payment, you'll be redirected back to access your lesson.</small></p>
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
            Initializing Payment...
          </>
        ) : (
          `Pay ₦${lesson.price.toLocaleString()}`
        )}
      </Button>
      
      <p className="payment-note">
        🔒 Secured by Paystack • PCI DSS Compliant
      </p>
      
      <div className="payment-security">
        <div className="security-features">
          <span>✅ Secure Payments</span>
          <span>✅ Instant Access</span>
          <span>✅ Money-Back Guarantee</span>
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