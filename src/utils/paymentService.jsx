// utils/paymentService.js
import { getCurrentUser, processLessonPayment, purchaseLesson } from '../firebase/storageService';

// Simulated payment gateway service for Nigerian banks and mobile money
export const paymentService = {
  // Initialize payment with Paystack (supports Nigerian banks and mobile money)
  async initializePaystackPayment(email, amount, metadata = {}) {
    try {
      console.log('Initializing Paystack payment:', { email, amount, metadata });
      
      const paymentData = {
        reference: `paystack_${Date.now()}`,
        amount: amount * 100, // Paystack expects amount in kobo
        email: email,
        currency: 'NGN',
        metadata: {
          ...metadata,
          platform: 'STEM Education',
          timestamp: new Date().toISOString()
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'] // Support all Nigerian payment methods
      };

      // Store payment intent in localStorage for recovery
      try {
        const pendingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        pendingPayments.push({
          reference: paymentData.reference,
          amount: amount,
          email: email,
          metadata: metadata,
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
        localStorage.setItem('pending_payments', JSON.stringify(pendingPayments));
      } catch (storageError) {
        console.warn('Could not store payment intent:', storageError);
      }

      // Simulate API call to Paystack
      return new Promise((resolve) => {
        setTimeout(() => {
          const response = {
            status: true,
            message: 'Authorization URL created',
            data: {
              authorization_url: `https://paystack.com/pay/${paymentData.reference}`,
              access_code: `access_${paymentData.reference}`,
              reference: paymentData.reference
            }
          };
          resolve(response);
        }, 1000);
      });
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw new Error('Failed to initialize payment');
    }
  },

  // Verify Paystack payment
  async verifyPaystackPayment(reference) {
    try {
      console.log('Verifying Paystack payment:', reference);
      
      // Check if payment was verified before
      try {
        const verifiedPayments = JSON.parse(localStorage.getItem('verified_payments') || '[]');
        const existing = verifiedPayments.find(p => p.reference === reference);
        if (existing) {
          return {
            status: true,
            message: 'Payment already verified',
            data: existing
          };
        }
      } catch (storageError) {
        console.warn('Could not check verified payments:', storageError);
      }
      
      // Simulate API call to verify payment
      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate successful verification 80% of the time
          const isSuccess = Math.random() > 0.2;
          
          if (isSuccess) {
            const result = {
              status: true,
              message: 'Verification successful',
              data: {
                status: 'success',
                reference: reference,
                amount: 0, // Would be actual amount from API
                gateway_response: 'Approved',
                paid_at: new Date().toISOString()
              }
            };
            
            // Store verified payment
            try {
              const verifiedPayments = JSON.parse(localStorage.getItem('verified_payments') || '[]');
              verifiedPayments.push({
                reference: reference,
                verifiedAt: new Date().toISOString(),
                data: result.data
              });
              localStorage.setItem('verified_payments', JSON.stringify(verifiedPayments));
            } catch (storageError) {
              console.warn('Could not store verified payment:', storageError);
            }
            
            resolve(result);
          } else {
            resolve({
              status: false,
              message: 'Payment verification failed'
            });
          }
        }, 1500);
      });
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw new Error('Payment verification failed');
    }
  },

  // Initialize Flutterwave payment (supports Nigerian banks and mobile money)
  async initializeFlutterwavePayment(email, amount, metadata = {}) {
    try {
      console.log('Initializing Flutterwave payment:', { email, amount, metadata });
      
      const paymentData = {
        tx_ref: `flutterwave_${Date.now()}`,
        amount: amount,
        currency: 'NGN',
        payment_options: 'card,account,ussd,banktransfer,mobilemoneyghana',
        redirect_url: `${window.location.origin}/payment-callback`,
        customer: {
          email: email,
        },
        meta: {
          ...metadata,
          platform: 'STEM Education'
        },
        customizations: {
          title: 'STEM Learning Platform',
          description: metadata.lessonTitle || 'Lesson Purchase'
        }
      };

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'success',
            message: 'Payment initialized',
            data: {
              link: `https://flutterwave.com/pay/${paymentData.tx_ref}`
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
      throw new Error('Failed to initialize payment');
    }
  },

  // Direct bank transfer simulation (OPay, PalmPay, etc.)
  async initializeDirectBankTransfer(amount, bankDetails) {
    try {
      console.log('Initializing direct bank transfer:', { amount, bankDetails });
      
      // Generate virtual account number for the transaction
      const virtualAccount = `70${Math.random().toString().substr(2, 8)}`;
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'success',
            message: 'Virtual account generated',
            data: {
              virtual_account: virtualAccount,
              bank_name: bankDetails.bankName || 'GTBank',
              account_name: 'STEM Learning Platform',
              amount: amount,
              expires_in: '24 hours'
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Bank transfer initialization error:', error);
      throw new Error('Failed to generate virtual account');
    }
  },

  // USSD payment simulation
  async generateUSSDCode(amount, bankCode) {
    try {
      console.log('Generating USSD code:', { amount, bankCode });
      
      const banks = {
        'OPAY': '*955*',
        'PALMPAY': '*933*',
        'GTB': '*737*',
        'ZENITH': '*966*',
        'ACCESS': '*901*',
        'UBA': '*919*',
        'FIRSTBANK': '*894*'
      };
      
      const ussdPrefix = banks[bankCode.toUpperCase()] || '*322*';
      const transactionAmount = Math.floor(amount);
      const ussdCode = `${ussdPrefix}${transactionAmount}#`;
      
      return {
        status: 'success',
        data: {
          ussd_code: ussdCode,
          bank: bankCode,
          amount: amount,
          instructions: `Dial ${ussdCode} on your phone to complete payment`
        }
      };
    } catch (error) {
      console.error('USSD generation error:', error);
      throw new Error('Failed to generate USSD code');
    }
  },

  // Mobile money payment (for OPay, PalmPay apps)
  async initializeMobileMoneyPayment(phoneNumber, amount, provider) {
    try {
      console.log('Initializing mobile money payment:', { phoneNumber, amount, provider });
      
      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Please enter a valid phone number');
      }
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 'success',
            message: `Payment request sent to ${phoneNumber}`,
            data: {
              provider: provider,
              phone_number: phoneNumber,
              amount: amount,
              transaction_id: `mm_${Date.now()}`,
              instructions: `Check your ${provider} app to approve the payment`
            }
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Mobile money initialization error:', error);
      throw new Error('Failed to initialize mobile money payment');
    }
  },

  // Process payment with Firebase
  async processPaymentWithFirebase(paymentData, lessonData) {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('Please log in to make a payment');
      }

      // Validate payment data
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Process lesson payment in Firebase
      const result = await processLessonPayment(
        currentUser.uid,
        lessonData.teacherId || 'default_teacher',
        lessonData.courseId || lessonData.courseKey,
        lessonData.id || 'default_lesson',
        paymentData.amount
      );

      if (result.success) {
        // Purchase the lesson
        await purchaseLesson(
          currentUser.uid,
          lessonData.courseId || lessonData.courseKey,
          lessonData.id,
          paymentData
        );

        // Store successful transaction
        try {
          const transactions = JSON.parse(localStorage.getItem('payment_transactions') || '[]');
          transactions.push({
            id: paymentData.paymentId || `pay_${Date.now()}`,
            amount: paymentData.amount,
            lessonId: lessonData.id,
            courseId: lessonData.courseId || lessonData.courseKey,
            userId: currentUser.uid,
            status: 'completed',
            date: new Date().toISOString(),
            gateway: paymentData.gateway || 'paystack'
          });
          localStorage.setItem('payment_transactions', JSON.stringify(transactions));
        } catch (storageError) {
          console.warn('Could not store transaction:', storageError);
        }

        return { success: true, data: result };
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  },

  // Get payment history for user
  async getPaymentHistory(userId) {
    try {
      // Try to get from localStorage first
      const transactions = JSON.parse(localStorage.getItem('payment_transactions') || '[]');
      const userTransactions = transactions.filter(t => t.userId === userId);
      
      // In production, this would come from Firebase
      return {
        success: true,
        transactions: userTransactions,
        total: userTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      return { success: false, transactions: [], total: 0 };
    }
  },

  // Validate payment data
  validatePayment(amount, email) {
    const errors = [];
    
    if (!amount || amount <= 0) {
      errors.push('Invalid payment amount');
    }
    
    if (!email || !email.includes('@')) {
      errors.push('Invalid email address');
    }
    
    if (amount > 1000000) {
      errors.push('Amount exceeds maximum allowed (₦1,000,000)');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Generate payment receipt
  generateReceipt(paymentData, lessonData) {
    return {
      receiptId: `RCPT_${Date.now()}`,
      paymentId: paymentData.paymentId || `PAY_${Date.now()}`,
      amount: paymentData.amount,
      currency: 'NGN',
      date: new Date().toISOString(),
      lessonTitle: lessonData.title || 'Untitled Lesson',
      lessonId: lessonData.id || 'unknown',
      status: 'completed',
      paymentMethod: paymentData.gateway || 'paystack',
      customerName: paymentData.customerName || 'Student',
      customerEmail: paymentData.email || 'unknown@email.com'
    };
  },

  // Get supported payment methods
  getSupportedPaymentMethods() {
    return {
      banks: ['OPAY', 'PALMPAY', 'GTB', 'ZENITH', 'ACCESS', 'UBA', 'FIDELITY', 'FIRSTBANK', 'STERLING', 'UNION'],
      mobileMoney: ['OPAY', 'PALMPAY', 'CARBON', 'KUDA'],
      ussd: ['OPAY', 'PALMPAY', 'GTB', 'ZENITH', 'ACCESS', 'UBA', 'FIRSTBANK']
    };
  }
};

// Payment gateway configuration
export const paymentConfig = {
  paystack: {
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_paystack_public_key',
    secretKey: import.meta.env.VITE_PAYSTACK_SECRET_KEY || 'sk_test_your_paystack_secret_key'
  },
  flutterwave: {
    publicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST_your_flutterwave_public_key',
    secretKey: import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST_your_flutterwave_secret_key'
  },
  supportedBanks: [
    'OPAY', 'PALMPAY', 'GTB', 'ZENITH', 'ACCESS', 'UBA', 
    'FIDELITY', 'FIRSTBANK', 'STERLING', 'UNION'
  ],
  supportedMobileMoney: ['OPAY', 'PALMPAY', 'CARBON', 'KUDA'],
  maxPaymentAmount: 1000000, // ₦1,000,000 maximum
  minPaymentAmount: 100 // ₦100 minimum
};

export default paymentService;
