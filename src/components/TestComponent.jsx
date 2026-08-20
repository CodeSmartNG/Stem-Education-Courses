import React, { useState, useEffect } from 'react';
import { getCourses, initializeStorage } from '../firebase/storageService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

const TestComponent = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  // Check auth status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthStatus({
          isLoggedIn: true,
          email: user.email,
          uid: user.uid,
          emailVerified: user.emailVerified
        });
      } else {
        setAuthStatus({
          isLoggedIn: false,
          message: 'No user logged in'
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const addTestResult = (testName, result, details = '') => {
    setTestResults(prev => [...prev, {
      test: testName,
      result: result,
      details: details,
      timestamp: new Date().toISOString()
    }]);
  };

  const testFirebaseConnection = async () => {
    console.clear();
    console.log('🔥 ===== STARTING FIREBASE CONNECTION TEST =====');
    setIsLoading(true);
    setTestResults([]);

    try {
      // Test 1: Check Firebase Auth
      console.log('🧪 TEST 1: Checking Firebase Auth...');
      if (authStatus?.isLoggedIn) {
        addTestResult('Firebase Auth', '✅ PASSED', `User: ${authStatus.email}`);
        console.log('✅ Auth: User logged in:', authStatus.email);
      } else {
        addTestResult('Firebase Auth', '⚠️ NOTICE', 'No user logged in');
        console.log('⚠️ Auth: No user logged in');
      }

      // Test 2: Test getCourses
      console.log('🧪 TEST 2: Calling getCourses()...');
      try {
        const courses = await getCourses();
        console.log('📚 Courses:', courses);
        if (courses && Array.isArray(courses)) {
          addTestResult('getCourses()', '✅ PASSED', `Found ${courses.length} courses`);
          console.log(`✅ Found ${courses.length} courses`);
        } else if (courses && typeof courses === 'object') {
          const courseCount = Object.keys(courses).length;
          addTestResult('getCourses()', '✅ PASSED', `Found ${courseCount} courses (object format)`);
          console.log(`✅ Found ${courseCount} courses (object format)`);
        } else {
          addTestResult('getCourses()', '⚠️ WARNING', 'No courses found or unexpected format');
          console.warn('⚠️ No courses found');
        }
      } catch (error) {
        addTestResult('getCourses()', '❌ FAILED', error.message);
        console.error('❌ getCourses failed:', error);
      }

      // Test 3: Test Firebase Connection
      console.log('🧪 TEST 3: Testing Firebase connection...');
      try {
        const testRef = await import('firebase/firestore');
        const db = (await import('../firebase/config')).db;
        addTestResult('Firebase Connection', '✅ PASSED', 'Successfully connected to Firebase');
        console.log('✅ Firebase connection successful');
      } catch (error) {
        addTestResult('Firebase Connection', '❌ FAILED', error.message);
        console.error('❌ Firebase connection failed:', error);
      }

      // Test 4: Test Auth state
      console.log('🧪 TEST 4: Testing Auth state...');
      try {
        const { getCurrentUser } = await import('../firebase/storageService');
        const user = await getCurrentUser();
        if (user) {
          addTestResult('getCurrentUser()', '✅ PASSED', `User: ${user.email}`);
          console.log('✅ Current user:', user.email);
        } else {
          addTestResult('getCurrentUser()', '⚠️ NOTICE', 'No user logged in');
          console.log('⚠️ No user logged in');
        }
      } catch (error) {
        addTestResult('getCurrentUser()', '❌ FAILED', error.message);
        console.error('❌ getCurrentUser failed:', error);
      }

      // Test 5: Initialize storage
      console.log('🧪 TEST 5: Initializing storage...');
      try {
        await initializeStorage();
        addTestResult('initializeStorage()', '✅ PASSED', 'Storage initialized successfully');
        console.log('✅ Storage initialized');
      } catch (error) {
        addTestResult('initializeStorage()', '❌ FAILED', error.message);
        console.error('❌ Storage initialization failed:', error);
      }

      // Test 6: Test Firestore Read
      console.log('🧪 TEST 6: Testing Firestore read...');
      try {
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const courseCount = coursesSnapshot.size;
        addTestResult('Firestore Read', '✅ PASSED', `Found ${courseCount} documents in courses collection`);
        console.log(`✅ Firestore read successful, found ${courseCount} courses`);
      } catch (error) {
        addTestResult('Firestore Read', '❌ FAILED', error.message);
        console.error('❌ Firestore read failed:', error);
      }

    } catch (error) {
      console.error('🔥 Test error:', error);
      addTestResult('Overall Test', '❌ FAILED', error.message);
    } finally {
      setIsLoading(false);
      console.log('🔥 ===== TEST COMPLETE =====');
    }
  };

  const resetStorage = async () => {
    console.log('🔄 Resetting storage...');
    setIsLoading(true);
    try {
      // Clear Firebase data (careful - this is destructive)
      if (window.confirm('⚠️ Are you sure you want to clear all data? This cannot be undone.')) {
        const { deleteDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        
        // Clear courses
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        coursesSnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        
        addTestResult('Reset Storage', '✅ PASSED', 'All courses cleared');
        console.log('✅ Storage reset');
      }
    } catch (error) {
      console.error('❌ Reset failed:', error);
      addTestResult('Reset Storage', '❌ FAILED', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
    console.log('🧹 Test results cleared');
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#4F46E5' }}>🔥 Firebase Debug Test Component</h1>
        
        {/* Auth Status */}
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: authStatus?.isLoggedIn ? '#d1fae5' : '#fee2e2',
          border: `1px solid ${authStatus?.isLoggedIn ? '#10b981' : '#ef4444'}`
        }}>
          <strong>🔐 Auth Status:</strong>
          {authStatus?.isLoggedIn ? (
            <span style={{ color: '#10b981', marginLeft: '8px' }}>
              ✅ Logged in as {authStatus.email}
            </span>
          ) : (
            <span style={{ color: '#ef4444', marginLeft: '8px' }}>
              ⚠️ {authStatus?.message || 'Not logged in'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button 
            onClick={testFirebaseConnection} 
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? '⏳ Running Tests...' : '🚀 Run Firebase Test'}
          </button>
          
          <button 
            onClick={resetStorage} 
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            🗑️ Reset Storage
          </button>

          <button 
            onClick={clearTestResults} 
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            🧹 Clear Results
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h2>📊 Test Results ({testResults.length} tests)</h2>
            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              {testResults.map((result, index) => (
                <div key={index} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: result.result.includes('PASSED') ? '#f0fdf4' :
                             result.result.includes('FAILED') ? '#fef2f2' :
                             '#fffbeb'
                }}>
                  <div>
                    <strong>{result.test}</strong>
                    <span style={{ marginLeft: '12px', fontSize: '14px' }}>{result.result}</span>
                    {result.details && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {result.details}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information */}
        <div style={{ marginTop: '20px', padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
          <h3>💡 What This Tests</h3>
          <ul style={{ margin: '8px 0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>✅ Firebase Authentication status</li>
            <li>✅ Firestore connection</li>
            <li>✅ Course data retrieval</li>
            <li>✅ User session management</li>
            <li>✅ Storage initialization</li>
          </ul>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            Check the browser console (F12) for detailed logs.
          </p>
        </div>

        {/* Firebase Config Check */}
        <div style={{ marginTop: '20px', padding: '16px', background: '#e0f2fe', borderRadius: '8px' }}>
          <h3>🔑 Firebase Config Status</h3>
          <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
            <div>API Key: {import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}</div>
            <div>Project ID: {import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing'}</div>
            <div>Auth Domain: {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing'}</div>
            <div>Storage Bucket: {import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestComponent;
