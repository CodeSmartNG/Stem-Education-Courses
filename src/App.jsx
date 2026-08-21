import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import './styles/payments.css';
import StudentProfile from './components/StudentProfile';
import CourseCatalog from './components/CourseCatalog';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import TeacherRegisterForm from './components/TeacherRegisterForm';
import EmailConfirmation from './components/EmailConfirmation';
import DiscussionForum from './components/DiscussionForum';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminCourseManagement from './components/AdminCourseManagement';
import About from './components/About';
import FAQs from './components/FAQs';
import Contact from './components/Contact';
import Blog from './components/Blog';
import Resources from './components/Resources';
import Careers from './components/Careers';
import Support from './components/Support';

// Firebase imports
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  listenToUser,
  updateUserProfile,
  resendVerificationEmail,
  canAccessLesson,
  purchaseLesson,
  getTeacherWhatsAppUrl,
  createAdminUser,
  checkAdminExists
} from './firebase/storageService';

// Constants
const USER_ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
const INACTIVITY_WARNING_TIME = 55 * 60 * 1000;
const INACTIVITY_LOGOUT_TIME = 60 * 60 * 1000;

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUserState] = useState(null);
  const [students, setStudentsState] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [confirmationToken, setConfirmationToken] = useState('');
  const [showConfirmationInfo, setShowConfirmationInfo] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribeUser, setUnsubscribeUser] = useState(null);
  const [error, setError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Refs for timer management
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  // Define handleLogout first
  const handleLogout = useCallback(async () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (unsubscribeUser) {
      unsubscribeUser();
      setUnsubscribeUser(null);
    }

    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }

    setCurrentUserState(null);
    setCurrentView('login');
    setMessage('');
    setShowConfirmationInfo(false);
    setShowInactivityWarning(false);
    localStorage.removeItem('hausaStem_currentView');
    setAuthChecked(false);
  }, [unsubscribeUser]);

  // Auto-logout handler
  const handleAutoLogout = useCallback(() => {
    setMessage('You have been automatically logged out due to inactivity.');
    handleLogout();
  }, [handleLogout]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    if (currentUser) {
      warningTimerRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
      }, INACTIVITY_WARNING_TIME);

      logoutTimerRef.current = setTimeout(() => {
        handleAutoLogout();
      }, INACTIVITY_LOGOUT_TIME);
    }
  }, [currentUser, handleAutoLogout]);

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    if (currentUser) {
      resetInactivityTimer();
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    }
  }, [currentUser, resetInactivityTimer, showInactivityWarning]);

  // Initialize Firebase and load data
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🔄 Initializing Firebase...');
        console.log('🔍 Environment:', import.meta.env.MODE);
        console.log('🔍 Firebase Config:', {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
        });
        
        setIsLoading(true);
        setError(null);

        // Get current user from Firebase
        const user = await getCurrentUser();
        console.log('✅ Loaded current user:', user);
        console.log('✅ Loaded current user role:', user?.role);

        if (user) {
          setCurrentUserState(user);
          setAuthChecked(true);

          // Set up real-time listener for user data changes
          if (user.uid) {
            const unsubscribe = listenToUser(user.uid, (updatedUser) => {
              if (updatedUser) {
                console.log('🔄 User data updated in real-time:', updatedUser);
                setCurrentUserState(prev => ({
                  ...prev,
                  ...updatedUser
                }));
              }
            });
            setUnsubscribeUser(() => unsubscribe);
          }

          // Determine correct view based on role
          const role = user.role;
          console.log('🔍 User role detected:', role);

          if (role === 'admin') {
            console.log('👑 Setting admin view');
            setCurrentView('admin');
          } else if (role === 'teacher') {
            console.log('👨‍🏫 Setting teacher view');
            setCurrentView('teacher');
          } else if (role === 'student') {
            console.log('👨‍🎓 Setting student dashboard view');
            setCurrentView('dashboard');
          } else {
            console.warn('⚠️ Unknown role:', role);
            setCurrentView('dashboard');
          }
        } else {
          console.log('👤 No current user, showing login');
          setCurrentView('login');
          setAuthChecked(true);
          
          // Try to create admin user if no users exist (optional)
          try {
            const adminExists = await checkAdminExists();
            if (!adminExists) {
              console.log('Creating admin user...');
              await createAdminUser();
              console.log('✅ Admin user created! Login with: codesmartng1@gmail.com / Kb1217@#$%&');
            }
          } catch (adminError) {
            console.error('Admin creation error:', adminError);
          }
        }

        setStudentsState([]);
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setError(error.message || 'Failed to initialize app');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    // Cleanup function
    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  // Set up activity listeners when user is logged in
  useEffect(() => {
    if (currentUser) {
      USER_ACTIVITY_EVENTS.forEach(event => {
        document.addEventListener(event, handleUserActivity);
      });

      resetInactivityTimer();

      return () => {
        USER_ACTIVITY_EVENTS.forEach(event => {
          document.removeEventListener(event, handleUserActivity);
        });
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
        }
        if (warningTimerRef.current) {
          clearTimeout(warningTimerRef.current);
        }
      };
    }
  }, [currentUser, handleUserActivity, resetInactivityTimer]);

  // Check for confirmation token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const mode = urlParams.get('mode');

    if (mode === 'verifyEmail') {
      setMessage('✅ Email verified successfully! You can now log in.');
      setCurrentView('login');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (token) {
      handleEmailConfirmation(token);
    }
  }, []);

  // Login handler with Firebase
  const handleLogin = useCallback(async (email, password) => {
    try {
      console.log('🔐 Attempting login with email:', email);
      setIsLoading(true);
      setError(null);
      setMessage('');

      const result = await loginUser(email, password);
      console.log('🔐 loginUser returned:', result);

      if (result.success && result.user) {
        console.log('✅ Login successful!');
        console.log('User role:', result.user.role);
        console.log('User email:', result.user.email);
        console.log('Email verified:', result.user.isEmailVerified);

        if (!result.user.isEmailVerified) {
          setMessage('⚠️ Please verify your email before logging in. Check your inbox (and spam folder) for the verification link.');
          setIsLoading(false);
          return false;
        }

        setCurrentUserState(result.user);
        setAuthChecked(true);

        if (result.user.uid) {
          const unsubscribe = listenToUser(result.user.uid, (updatedUser) => {
            if (updatedUser) {
              console.log('🔄 User data updated in real-time:', updatedUser);
              setCurrentUserState(prev => ({
                ...prev,
                ...updatedUser
              }));
            }
          });
          setUnsubscribeUser(() => unsubscribe);
        }

        resetInactivityTimer();

        if (result.user.role === 'admin') {
          console.log('👑 Navigating to admin dashboard');
          setCurrentView('admin');
          localStorage.setItem('hausaStem_currentView', 'admin');
        } else if (result.user.role === 'teacher') {
          console.log('👨‍🏫 Navigating to teacher dashboard');
          setCurrentView('teacher');
          localStorage.setItem('hausaStem_currentView', 'teacher');
        } else {
          console.log('👨‍🎓 Navigating to student dashboard');
          setCurrentView('dashboard');
          localStorage.setItem('hausaStem_currentView', 'dashboard');
        }

        setMessage('✅ Login successful! Welcome back.');
        setIsLoading(false);
        return true;
      } else {
        console.log('❌ Login failed: No user returned');
        setMessage('Invalid email or password. Please check your credentials.');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      if (error.message?.includes('verify your email')) {
        setMessage('⚠️ Please verify your email before logging in. Check your inbox for the verification link.');
      } else if (error.code === 'auth/invalid-credential') {
        setMessage('Invalid email or password. Please check your credentials.');
      } else if (error.code === 'auth/user-not-found') {
        setMessage('No account found with this email. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        setMessage('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        setMessage('Network error. Please check your internet connection.');
      } else {
        setMessage(error.message || 'Login failed. Please try again.');
      }
      
      setIsLoading(false);
      return false;
    }
  }, [resetInactivityTimer]);

  // Student registration with Firebase
  const handleStudentRegister = useCallback(async (name, email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage('');
      console.log('📝 Registering student:', { name, email });

      const result = await registerUser(email, password, {
        name,
        role: 'student',
        level: 'Beginner'
      });

      if (result.success) {
        console.log('✅ Student registered successfully!');
        setMessage(
          `✅ Confirmation email sent to ${email}. Please check your inbox and verify your email before logging in.`
        );
        setCurrentView('login');
        setIsLoading(false);
        return true;
      } else {
        setMessage('Registration failed. Please try again.');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Registration failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Teacher registration with Firebase
  const handleTeacherRegister = useCallback(async (teacherData) => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage('');
      console.log('📝 Registering teacher:', teacherData);

      const result = await registerUser(teacherData.email, teacherData.password, {
        name: teacherData.name,
        role: 'teacher',
        specialization: teacherData.specialization || 'General',
        bio: teacherData.bio || '',
        whatsappNumber: teacherData.whatsappNumber || '',
        isApproved: false,
        earnings: 0,
        courses: []
      });

      if (result.success) {
        console.log('✅ Teacher registered successfully!');
        setMessage(
          `✅ Confirmation email sent to ${teacherData.email}. Please check your inbox and verify your email. ` +
          `Your account will be reviewed by an admin before you can log in.`
        );
        setCurrentView('login');
        setIsLoading(false);
        return true;
      } else {
        setMessage('Teacher registration failed. Please try again.');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Teacher registration error:', error);
      setMessage(error.message || 'Teacher registration failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Email confirmation handler
  const handleEmailConfirmation = useCallback(async (token) => {
    try {
      setMessage('Email verification is handled through Firebase Auth.');
      setCurrentView('login');
      setPendingUser(null);
      setConfirmationToken('');
      setShowConfirmationInfo(false);
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    } catch (error) {
      console.error('Email confirmation error:', error);
      setMessage(error.message || 'Email confirmation failed. Please try again.');
      return false;
    }
  }, []);

  // Resend confirmation email
  const handleResendConfirmation = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await resendVerificationEmail();
      if (result.success) {
        setMessage('✅ Confirmation email resent successfully! Please check your inbox.');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setMessage(error.message || 'Failed to resend confirmation email. Please try again.');
      setIsLoading(false);
    }
  }, []);

  // Update student data
  const updateStudentData = useCallback(async (updatedStudent) => {
    try {
      setIsLoading(true);

      if (currentUser?.uid) {
        await updateUserProfile(currentUser.uid, {
          name: updatedStudent.name,
          level: updatedStudent.level,
          progress: updatedStudent.progress || {},
          completedLessons: updatedStudent.completedLessons || [],
          points: updatedStudent.points || 0,
          badges: updatedStudent.badges || [],
          enrolledCourses: updatedStudent.enrolledCourses || [],
          purchasedLessons: updatedStudent.purchasedLessons || [],
          paymentHistory: updatedStudent.paymentHistory || []
        });
      }

      const { password, ...studentWithoutPassword } = updatedStudent;
      setCurrentUserState(prev => ({
        ...prev,
        ...studentWithoutPassword
      }));

      setStudentsState(prev =>
        prev.map(s => s.id === updatedStudent.id ? updatedStudent : s)
      );

      setMessage('✅ Profile updated successfully!');
      setIsLoading(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage('Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  }, [currentUser]);

  // Update current user
  const updateCurrentUser = useCallback(async (updatedUser) => {
    try {
      setIsLoading(true);

      if (currentUser?.uid) {
        await updateUserProfile(currentUser.uid, updatedUser);
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      setCurrentUserState(prev => ({
        ...prev,
        ...userWithoutPassword
      }));

      setMessage('✅ Profile updated successfully!');
      setIsLoading(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage('Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  }, [currentUser]);

  // Lesson purchase with Firebase
  const handleLessonPurchase = useCallback(async (courseKey, lessonId) => {
    try {
      if (!currentUser) {
        setMessage('Please log in to purchase lessons');
        return false;
      }

      setIsLoading(true);
      const success = await purchaseLesson(currentUser.uid, courseKey, lessonId);

      if (success) {
        setMessage('✅ Lesson purchased successfully!');
        const updatedUser = await getCurrentUser();
        if (updatedUser) {
          setCurrentUserState(updatedUser);
        }
        setIsLoading(false);
        return true;
      } else {
        setMessage('❌ Failed to purchase lesson. Please try again.');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error purchasing lesson:', error);
      setMessage('❌ Error processing payment: ' + error.message);
      setIsLoading(false);
      return false;
    }
  }, [currentUser]);

  // Check lesson access with Firebase
  const checkLessonAccess = useCallback(async (courseKey, lessonId) => {
    if (!currentUser) return false;
    try {
      return await canAccessLesson(currentUser.uid, courseKey, lessonId);
    } catch (error) {
      console.error('Error checking lesson access:', error);
      return false;
    }
  }, [currentUser]);

  // Get teacher WhatsApp URL
  const getTeacherContactUrl = useCallback((teacherId) => {
    return getTeacherWhatsAppUrl(teacherId);
  }, []);

  // Inactivity Warning Modal Component
  const InactivityWarning = useCallback(() => {
    if (!showInactivityWarning) return null;

    return (
      <div className="inactivity-warning-overlay">
        <div className="inactivity-warning-modal">
          <div className="warning-header">
            <h3>Session Timeout Warning</h3>
          </div>
          <div className="warning-body">
            <p>Your session will expire in 5 minutes due to inactivity.</p>
            <p>Would you like to continue your session?</p>
          </div>
          <div className="warning-actions">
            <button
              className="continue-btn"
              onClick={() => {
                resetInactivityTimer();
                setShowInactivityWarning(false);
              }}
            >
              Continue Session
            </button>
            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Log Out Now
            </button>
          </div>
        </div>
      </div>
    );
  }, [showInactivityWarning, resetInactivityTimer, handleLogout]);

  // Demo confirmation info display
  const ConfirmationInfoDisplay = useCallback(() => {
    if (!showConfirmationInfo || !confirmationToken) return null;

    return (
      <div className="confirmation-demo-display">
        <h3>📧 Demo Email Confirmation</h3>
        <p>Since this is a demo, here's your confirmation token:</p>
        <div className="confirmation-token">{confirmationToken}</div>
        <p>You can:</p>
        <ul>
          <li>Click the confirmation button below to simulate email confirmation</li>
          <li>Or manually navigate to: {window.location.origin}/confirm-email?token={confirmationToken}</li>
        </ul>
        <div className="demo-buttons">
          <button
            onClick={() => handleEmailConfirmation(confirmationToken)}
            className="confirm-email-btn"
          >
            Confirm Email Now
          </button>
          <button
            onClick={() => setShowConfirmationInfo(false)}
            className="close-info-btn"
          >
            Close
          </button>
        </div>
      </div>
    );
  }, [showConfirmationInfo, confirmationToken, handleEmailConfirmation]);

  const MessageDisplay = useCallback(() => {
    if (!message) return null;

    const isSuccess = message.includes('✅') || message.includes('success');
    const isError = message.includes('❌') || message.includes('error') || message.includes('failed');
    const isWarning = message.includes('⚠️');
    const isInfo = message.includes('📧') || message.includes('email');

    let className = 'message';
    if (isSuccess) className += ' success';
    if (isError) className += ' error';
    if (isWarning) className += ' warning';
    if (isInfo) className += ' info';

    return (
      <div className={className}>
        {message}
        <button className="message-close" onClick={() => setMessage('')}>×</button>
      </div>
    );
  }, [message]);

  const ErrorDisplay = useCallback(() => {
    if (!error) return null;
    return (
      <div className="error-display">
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }, [error]);

  // Render view based on current view and user role
  const renderView = useCallback(() => {
    console.log('🎯 renderView called with currentView:', currentView);
    console.log('🎯 currentUser:', currentUser);
    console.log('🎯 currentUser role:', currentUser?.role);

    if (!currentUser) {
      console.log('👤 No current user, showing login/register views');
      switch(currentView) {
        case 'register':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <RegisterForm
                onRegister={handleStudentRegister}
                onSwitchToLogin={() => {
                  setMessage('');
                  setCurrentView('login');
                }}
                isRegistering={isLoading}
              />
            </>
          );
        case 'teacher-register':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <TeacherRegisterForm
                onRegister={handleTeacherRegister}
                onSwitchToLogin={() => {
                  setMessage('');
                  setCurrentView('login');
                }}
                onSwitchToStudentRegister={() => {
                  setMessage('');
                  setCurrentView('register');
                }}
              />
            </>
          );
        case 'email-confirmation':
          return (
            <>
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <EmailConfirmation
                email={pendingUser?.email}
                onConfirm={handleEmailConfirmation}
                onResend={handleResendConfirmation}
                onCancel={() => {
                  setMessage('');
                  setPendingUser(null);
                  setConfirmationToken('');
                  setShowConfirmationInfo(false);
                  setCurrentView('login');
                }}
              />
            </>
          );
        case 'login':
        default:
          return (
            <div className="login-container">
              <MessageDisplay />
              <ConfirmationInfoDisplay />
              <LoginForm
                onLogin={handleLogin}
                onSwitchToRegister={() => {
                  setMessage('');
                  setCurrentView('register');
                }}
                onSwitchToTeacherRegister={() => {
                  setMessage('');
                  setCurrentView('teacher-register');
                }}
                isLoading={isLoading}
              />
            </div>
          );
      }
    }

    const userRole = currentUser?.role || 'student';
    const isAdmin = userRole === 'admin';
    const isTeacher = userRole === 'teacher';
    const isStudent = userRole === 'student';

    console.log('🎯 User roles - Admin:', isAdmin, 'Teacher:', isTeacher, 'Student:', isStudent);
    console.log('🎯 Current view:', currentView);

    if (isAdmin && currentView !== 'admin' && currentView !== 'admin-courses') {
      console.log('👑 Admin user, ensuring admin view');
      setCurrentView('admin');
      return null;
    }

    if (isTeacher && currentView !== 'teacher' && currentView !== 'profile') {
      console.log('👨‍🏫 Teacher user, ensuring teacher view');
      setCurrentView('teacher');
      return null;
    }

    switch(currentView) {
      case 'about':
        return <About />;
      case 'faqs':
        return <FAQs />;
      case 'contact':
        return <Contact />;
      case 'blog':
        return <Blog />;
      case 'resources':
        return <Resources />;
      case 'careers':
        return (
          <Careers
            setCurrentView={setCurrentView}
            setMessage={setMessage}
            onTeacherRegister={handleTeacherRegister}
            currentUser={currentUser}
          />
        );
      case 'support':
        return <Support />;
      case 'admin-courses':
        if (isAdmin) {
          return <AdminCourseManagement currentUser={currentUser} />;
        } else {
          return (
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to access course management.</p>
              <button
                className="back-button"
                onClick={() => setCurrentView(isAdmin ? 'admin' : isTeacher ? 'teacher' : 'dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          );
        }
      default:
        break;
    }

    if (isAdmin && currentView === 'admin') {
      console.log('🎯 Rendering admin dashboard');
      return <AdminDashboard currentUser={currentUser} setCurrentView={setCurrentView} />;
    }

    if (isTeacher && currentView === 'teacher') {
      console.log('🎯 Rendering teacher dashboard');
      return <TeacherDashboard currentUser={currentUser} setCurrentUser={updateCurrentUser} />;
    }

    if (isStudent) {
      console.log('🎯 Rendering student views for:', currentView);
      switch(currentView) {
        case 'profile':
          return <StudentProfile student={currentUser} setStudent={updateStudentData} />;
        case 'courses':
          return (
            <CourseCatalog
              student={currentUser}
              setStudent={updateStudentData}
              onLessonPurchase={handleLessonPurchase}
              onCheckLessonAccess={checkLessonAccess}
              onGetTeacherContact={getTeacherContactUrl}
            />
          );
        case 'discussion':
          return <DiscussionForum currentUser={currentUser} />;
        case 'dashboard':
        default:
          return (
            <>
              <MessageDisplay />
              <Dashboard student={currentUser} setStudent={updateStudentData} />
            </>
          );
      }
    }

    console.warn('⚠️ No specific view matched, showing default dashboard');
    if (isAdmin) {
      return <AdminDashboard currentUser={currentUser} setCurrentView={setCurrentView} />;
    } else if (isTeacher) {
      return <TeacherDashboard currentUser={currentUser} setCurrentUser={updateCurrentUser} />;
    } else {
      return (
        <>
          <MessageDisplay />
          <Dashboard student={currentUser} setStudent={updateStudentData} />
        </>
      );
    }
  }, [
    currentUser,
    currentView,
    handleLogin,
    handleStudentRegister,
    handleTeacherRegister,
    handleEmailConfirmation,
    handleResendConfirmation,
    handleLogout,
    updateStudentData,
    updateCurrentUser,
    handleLessonPurchase,
    checkLessonAccess,
    getTeacherContactUrl,
    MessageDisplay,
    ConfirmationInfoDisplay,
    pendingUser,
    isLoading
  ]);

  // Show error if there is one
  if (error) {
    return (
      <div className="loading-screen">
        <ErrorDisplay />
      </div>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{isLoading ? 'Loading...' : 'Loading STEM Platform...'}</p>
        {error && (
          <div className="loading-error">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
      </div>
    );
  }

  console.log('🎯 Rendering main App component');
  console.log('🎯 Current user:', currentUser);
  console.log('🎯 Current view:', currentView);

  return (
    <div className="App">
      <InactivityWarning />

      {currentUser && (
        <Navigation
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentUser={currentUser}
          onLogout={handleLogout}
          isAdmin={currentUser.role === 'admin'}
          isTeacher={currentUser.role === 'teacher'}
          isStudent={currentUser.role === 'student'}
        />
      )}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
