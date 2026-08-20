import React, { useState, useEffect } from 'react';
import { 
  getCourses, 
  getCurrentUser, 
  canAccessLesson, 
  purchaseLesson, 
  getTeacherWhatsAppUrl,
  getLessons,
  updateProgress,
  enrollStudent,
  getCourseById
} from '../firebase/storageService';

import Quiz from './Quiz';
import MultimediaViewer from './MultimediaViewer';
import PaymentModal from './payments/PaymentModal';
import { processTeacherPayment } from '../utils/teacherPaymentService';
import './CourseCatalog.css';

const CourseCatalog = ({ student, setStudent }) => {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load courses from Firebase
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await getCourses();
      console.log('Loaded courses:', coursesData);
      
      // Convert array to object for backward compatibility
      const coursesObject = {};
      if (Array.isArray(coursesData)) {
        coursesData.forEach(course => {
          coursesObject[course.id] = course;
        });
      }
      
      setCourses(coursesObject || {});
      setError(null);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError(err);
      setCourses({});
    } finally {
      setLoading(false);
    }
  };

  // Safe Object.entries wrapper
  const safeObjectEntries = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') {
        return [];
      }
      return Object.entries(obj);
    } catch (err) {
      console.error('Error in safeObjectEntries:', err);
      return [];
    }
  };

  // Safe Object.keys wrapper
  const safeObjectKeys = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') {
        return [];
      }
      return Object.keys(obj);
    } catch (err) {
      console.error('Error in safeObjectKeys:', err);
      return [];
    }
  };

  // Toggle course expansion
  const toggleCourseExpansion = (courseKey) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseKey]: !prev[courseKey]
    }));
  };

  // Expand all courses
  const expandAllCourses = () => {
    try {
      const courseKeys = safeObjectKeys(courses);
      const allExpanded = {};
      courseKeys.forEach(key => {
        allExpanded[key] = true;
      });
      setExpandedCourses(allExpanded);
    } catch (err) {
      console.error('Error expanding courses:', err);
    }
  };

  // Collapse all courses
  const collapseAllCourses = () => {
    setExpandedCourses({});
  };

  const handleStartQuiz = (courseKey, lessonIndex) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];
      
      if (lesson?.quiz) {
        setCurrentQuiz(lesson.quiz);
        setShowQuiz(true);
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
    }
  };

  const handleQuizComplete = async (scorePercentage, passed) => {
    try {
      if (!selectedCourse || !courses[selectedCourse]) return;

      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }

      const lessonId = courses[selectedCourse].lessons?.[currentLesson]?.id;
      const studentId = currentUser.uid;

      if (passed && lessonId) {
        // Update progress in Firebase
        await updateProgress(studentId, selectedCourse, 
          courses[selectedCourse].progress || 0, 
          lessonId
        );
        
        // Update local student state
        const updatedStudent = { ...student };
        const lessonKey = `${selectedCourse}-${lessonId}`;
        
        if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
        if (!updatedStudent.completedLessons.includes(lessonKey)) {
          updatedStudent.completedLessons.push(lessonKey);
          
          const totalLessons = courses[selectedCourse].lessons?.length || 0;
          const completedLessons = courses[selectedCourse].lessons?.filter(
            lesson => updatedStudent.completedLessons?.includes(`${selectedCourse}-${lesson.id}`)
          ).length || 0;

          if (!updatedStudent.progress) updatedStudent.progress = {};
          updatedStudent.progress[selectedCourse] = Math.min((completedLessons / totalLessons) * 100, 100);
        }
        
        setStudent(updatedStudent);
      }

      setShowQuiz(false);
      setCurrentQuiz(null);
    } catch (err) {
      console.error('Error completing quiz:', err);
    }
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  // Check if student can access lesson
  const canAccessLessonContent = async (courseKey, lessonId) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    return await canAccessLesson(currentUser.uid, courseKey, lessonId);
  };

  // Handle lesson purchase
  const handlePurchaseLesson = async (courseKey, lessonIndex) => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in to purchase lessons');
        return;
      }

      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];

      if (!lesson) {
        console.error('Lesson not found');
        return;
      }

      if (window.confirm(`Are you sure you want to purchase "${lesson.title}" for ₦${lesson.price}?`)) {
        const paymentResult = await purchaseLesson(currentUser.uid, courseKey, lesson.id, {
          paymentId: `pay_${Date.now()}`,
          amount: lesson.price || 5000,
          gateway: 'paystack',
          timestamp: new Date().toISOString()
        });

        if (paymentResult) {
          alert('✅ Payment successful! You now have access to this lesson.');
          // Reload courses to reflect the purchase
          await loadCourses();
          // Start the lesson
          setSelectedCourse(courseKey);
          setCurrentLesson(lessonIndex);
        } else {
          alert('❌ Payment failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error purchasing lesson:', error);
      alert('❌ Error processing payment: ' + error.message);
    }
  };

  // Handle starting a lesson with payment system
  const handleStartLesson = (courseKey, lessonIndex) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const course = courses[courseKey];
      const lesson = course.lessons?.[lessonIndex];

      if (!lesson) {
        console.error('Lesson not found');
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in to access lessons');
        return;
      }

      // Check if lesson is paid and if student has access
      if (!lesson.isFree && !canAccessLesson(currentUser.uid, courseKey, lesson.id)) {
        // Show payment modal for paid lessons without access
        setSelectedLesson({ 
          courseKey, 
          lessonIndex, 
          lesson: { 
            ...lesson, 
            title: lesson.title || 'Untitled Lesson',
            courseId: courseKey,
            price: lesson.price || 500,
            teacherId: course.teacherId || 'default_teacher',
            teacherName: course.teacherName || 'Course Teacher'
          } 
        });
        setShowPaymentModal(true);
        return;
      }

      // Check if lesson is locked (backward compatibility)
      if (lesson.isLocked && !canAccessLesson(currentUser.uid, courseKey, lesson.id)) {
        setSelectedLesson({ 
          courseKey, 
          lessonIndex, 
          lesson: { 
            ...lesson, 
            title: lesson.title || 'Untitled Lesson',
            courseId: courseKey,
            price: lesson.price || 500,
            teacherId: course.teacherId || 'default_teacher',
            teacherName: course.teacherName || 'Course Teacher'
          } 
        });
        setShowPaymentModal(true);
        return;
      }

      setSelectedCourse(courseKey);
      setCurrentLesson(lessonIndex);
      setShowQuiz(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error starting lesson:', err);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Payment successful:', paymentData);
      
      if (selectedLesson) {
        // 1. Process teacher payment and payout
        const teacherPaymentSuccess = await processTeacherPayment(
          paymentData, 
          selectedLesson.lesson, 
          student
        );

        // 2. Reload courses to reflect the purchase
        await loadCourses();
        
        // 3. Start the lesson
        setSelectedCourse(selectedLesson.courseKey);
        setCurrentLesson(selectedLesson.lessonIndex);
        setShowPaymentModal(false);
        setSelectedLesson(null);
        
        // 4. Show appropriate success message
        if (teacherPaymentSuccess) {
          alert('🎉 Payment successful! Lesson unlocked and teacher payment processed.');
        } else {
          alert('🎉 Payment successful! Lesson unlocked. Teacher payment is being processed.');
        }
      }
    } catch (error) {
      console.error('Error processing teacher payment:', error);
      
      // Still proceed with lesson access
      setSelectedCourse(selectedLesson?.courseKey);
      setCurrentLesson(selectedLesson?.lessonIndex);
      setShowPaymentModal(false);
      setSelectedLesson(null);
      
      alert('🎉 Payment successful! Lesson unlocked. There was an issue with teacher payout - support will handle it.');
    }
  };

  const completeLesson = async (courseKey, lessonId) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in to complete lessons');
        return;
      }

      const updatedStudent = { ...student };
      const lessonKey = `${courseKey}-${lessonId}`;

      if (!updatedStudent.completedLessons?.includes(lessonKey)) {
        if (!updatedStudent.completedLessons) updatedStudent.completedLessons = [];
        updatedStudent.completedLessons.push(lessonKey);

        // Update course progress
        const totalLessons = courses[courseKey].lessons?.length || 0;
        const completedLessons = courses[courseKey].lessons?.filter(
          lesson => updatedStudent.completedLessons?.includes(`${courseKey}-${lesson.id}`)
        ).length || 0;

        if (!updatedStudent.progress) updatedStudent.progress = {};
        updatedStudent.progress[courseKey] = Math.min((completedLessons / totalLessons) * 100, 100);

        setStudent(updatedStudent);
        
        // Update progress in Firebase
        await updateProgress(currentUser.uid, courseKey, updatedStudent.progress[courseKey], lessonId);
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
    }
  };

  const handleViewCertificate = (courseKey) => {
    try {
      if (!courses || !courses[courseKey]) return;

      const course = courses[courseKey];
      alert(`🏆 Congratulations to ${student?.name || 'Student'}!\n\nYou have completed the course: ${course.title}\n\nDate: ${new Date().toLocaleDateString()}\n\nYou can get your certificate at the office!`);
    } catch (err) {
      console.error('Error viewing certificate:', err);
    }
  };

  // Get teacher WhatsApp URL
  const getTeacherContactUrl = (teacherId) => {
    return getTeacherWhatsAppUrl(teacherId);
  };

  // Safety check for empty courses
  const courseEntries = safeObjectEntries(courses);
  
  if (loading) {
    return (
      <div className="course-catalog">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  if (courseEntries.length === 0) {
    return (
      <div className="course-catalog">
        <h2>STEM Courses</h2>
        <div className="no-courses">
          <p>No courses available. Please check back later.</p>
        </div>
      </div>
    );
  }

  // If a course is selected, show its lessons
  if (selectedCourse && courses[selectedCourse]) {
    const course = courses[selectedCourse];
    const lesson = course.lessons?.[currentLesson];

    if (!lesson) {
      return (
        <div className="course-lesson">
          <button onClick={() => setSelectedCourse(null)} className="back-btn">
            ← Back to Courses
          </button>
          <div className="error-message">
            <h2>Lesson Not Found</h2>
            <p>The requested lesson could not be found.</p>
          </div>
        </div>
      );
    }

    const isCompleted = student.completedLessons?.includes(`${selectedCourse}-${lesson.id}`);
    const currentUser = getCurrentUser();
    const hasAccess = currentUser ? canAccessLesson(currentUser.uid, selectedCourse, lesson.id) : false;

    return (
      <div className="course-lesson">
        <button onClick={() => setSelectedCourse(null)} className="back-btn">
          ← Back to Courses
        </button>

        <div className="lesson-header">
          <h2>{lesson.title || 'Untitled Lesson'}</h2>
          {isCompleted && <span className="completion-badge">Completed ✓</span>}
          {!lesson.isFree && (
            <span className={`price-badge ${hasAccess ? 'purchased' : ''}`}>
              {hasAccess ? '✅ Purchased' : `₦${lesson.price}`}
            </span>
          )}
        </div>

        {course.teacherName && (
          <div className="teacher-info">
            <strong>Instructor:</strong> {course.teacherName}
            {course.teacherId && getTeacherContactUrl(course.teacherId) && (
              <a 
                href={getTeacherContactUrl(course.teacherId)}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-contact-btn"
              >
                💬 Chat on WhatsApp
              </a>
            )}
          </div>
        )}

        {!hasAccess && !lesson.isFree ? (
          <div className="payment-required">
            <div className="payment-prompt">
              <h3>🔒 Premium Content</h3>
              <p>This lesson requires payment to access the content.</p>
              <div className="price-display">₦{lesson.price}</div>
              <button 
                onClick={() => handlePurchaseLesson(selectedCourse, currentLesson)}
                className="purchase-access-btn"
              >
                Purchase Access
              </button>
            </div>
          </div>
        ) : (
          <>
            {lesson.multimedia && lesson.multimedia.length > 0 && (
              <div className="multimedia-container">
                <MultimediaViewer multimedia={lesson.multimedia} />
              </div>
            )}

            <div className="lesson-content">
              <p>{lesson.content}</p>
              <p><strong>Duration:</strong> {lesson.duration}</p>
            </div>

            {lesson.quiz && !showQuiz && (
              <div className="quiz-section">
                <h3>Knowledge Test</h3>
                <p>Test your knowledge about this lesson:</p>
                <button 
                  onClick={() => handleStartQuiz(selectedCourse, currentLesson)}
                  className="start-quiz-btn"
                >
                  Start Quiz
                </button>
              </div>
            )}

            {showQuiz && currentQuiz && (
              <Quiz 
                quiz={currentQuiz}
                onComplete={handleQuizComplete}
                onClose={handleCloseQuiz}
              />
            )}
          </>
        )}

        <div className="lesson-navigation">
          {currentLesson > 0 && (
            <button onClick={() => setCurrentLesson(currentLesson - 1)}>
              ← Previous Lesson
            </button>
          )}

          <button 
            onClick={() => completeLesson(selectedCourse, lesson.id)}
            className="complete-btn"
            disabled={isCompleted || (!hasAccess && !lesson.isFree)}
          >
            {isCompleted ? 'Completed' : 'Complete Lesson'}
          </button>

          {currentLesson < (course.lessons?.length || 0) - 1 && (
            <button onClick={() => setCurrentLesson(currentLesson + 1)}>
              Next Lesson →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main course catalog view
  return (
    <div className="course-catalog">
      <div className="catalog-header">
        <h2>STEM Courses</h2>
        <div className="course-controls">
          <button onClick={expandAllCourses} className="control-btn">
            Expand All
          </button>
          <button onClick={collapseAllCourses} className="control-btn">
            Collapse All
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>Error loading courses: {error.message}</p>
          <button onClick={loadCourses}>Retry</button>
        </div>
      )}

      <div className="courses-grid">
        {courseEntries.map(([key, course]) => {
          const currentUser = getCurrentUser();
          const paidLessonsCount = course.lessons?.filter(lesson => !lesson.isFree).length || 0;
          const freeLessonsCount = course.lessons?.filter(lesson => lesson.isFree).length || 0;

          return (
            <div key={key} className="course-card">
              <div className="course-header">
                <span className="course-thumbnail">{course.thumbnail}</span>
                <div className="course-title-section">
                  <h3>{course.title || 'Untitled Course'}</h3>
                  {course.teacherName && (
                    <div className="course-teacher">
                      <small>By: {course.teacherName}</small>
                      {course.teacherId && getTeacherContactUrl(course.teacherId) && (
                        <a 
                          href={getTeacherContactUrl(course.teacherId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="teacher-whatsapp-btn"
                        >
                          💬 Contact
                        </a>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => toggleCourseExpansion(key)}
                    className="expand-btn"
                  >
                    {expandedCourses[key] ? '▼ Hide' : '► Show'} Lessons ({course.lessons?.length || 0})
                  </button>
                </div>
              </div>

              <p className="course-description">{course.description}</p>

              <div className="course-pricing-summary">
                <span className="free-lessons">{freeLessonsCount} Free</span>
                {paidLessonsCount > 0 && (
                  <span className="paid-lessons">{paidLessonsCount} Paid</span>
                )}
              </div>

              <div className="course-meta">
                <span className="progress-text">
                  Progress: {student.progress?.[key] || 0}%
                </span>
                <span className="completed-lessons">
                  Completed: {course.lessons?.filter(lesson => 
                    student.completedLessons?.includes(`${key}-${lesson.id}`)
                  ).length || 0} / {course.lessons?.length || 0}
                </span>
              </div>

              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${student.progress?.[key] || 0}%`}}
                >
                  {student.progress?.[key] || 0}%
                </div>
              </div>

              {student.progress?.[key] === 100 && (
                <button 
                  onClick={() => handleViewCertificate(key)}
                  className="certificate-btn"
                >
                  🏆 Get Certificate
                </button>
              )}

              {expandedCourses[key] && (
                <div className="lessons-list">
                  {course.lessons?.map((lesson, index) => {
                    const isLessonCompleted = student.completedLessons?.includes(`${key}-${lesson.id}`);
                    const hasAccess = currentUser ? canAccessLesson(currentUser.uid, key, lesson.id) : false;
                    const isPaidLesson = !lesson.isFree;

                    return (
                      <div key={lesson.id} className={`lesson-item ${isLessonCompleted ? 'completed' : ''} ${isPaidLesson && !hasAccess ? 'locked' : ''}`}>
                        <div className="lesson-info">
                          <div className="lesson-main-info">
                            <span className="lesson-title">
                              {lesson.title || 'Untitled Lesson'}
                              {isPaidLesson && !hasAccess && <span className="lock-icon"> 🔒</span>}
                              {isPaidLesson && (
                                <span className={`lesson-price ${hasAccess ? 'purchased' : ''}`}>
                                  {hasAccess ? ' ✅ Purchased' : ` - ₦${lesson.price}`}
                                </span>
                              )}
                            </span>
                            <span className="lesson-duration">{lesson.duration}</span>
                          </div>
                          <div className="lesson-features">
                            {lesson.multimedia && lesson.multimedia.length > 0 && (
                              <span className="media-indicator" title="Has learning materials">🎬</span>
                            )}
                            {lesson.quiz && (
                              <span className="quiz-indicator" title="Has quiz questions">📝</span>
                            )}
                            {isLessonCompleted && (
                              <span className="completion-indicator" title="Lesson completed">✅</span>
                            )}
                            {isPaidLesson && !hasAccess && (
                              <span className="lock-indicator" title="Paid lesson">💰</span>
                            )}
                          </div>
                        </div>
                        <div className="lesson-actions">
                          <button 
                            onClick={() => handleStartLesson(key, index)}
                            disabled={isLessonCompleted}
                            className={
                              isLessonCompleted ? 'completed-btn' : 
                              isPaidLesson && !hasAccess ? 'purchase-btn' : 'start-btn'
                            }
                          >
                            {isLessonCompleted ? 'Completed' : 
                             isPaidLesson && !hasAccess ? `Purchase - ₦${lesson.price}` : 'Start Lesson'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PaymentModal
        isOpen={showPaymentModal && selectedLesson?.lesson}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedLesson(null);
        }}
        lesson={selectedLesson?.lesson}
        student={student}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default CourseCatalog;
