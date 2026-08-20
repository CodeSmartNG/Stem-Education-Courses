// components/AdminCourseManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  getAllCoursesForAdmin, 
  getCourseDetailsForAdmin,
  deleteCourseAsAdmin,
  deleteLessonAsAdmin,
  getCourseAnalyticsForAdmin,
  getTeachers,
  getTeacherCoursesForAdmin,
  getCurrentUser,
  approveTeacher,
  rejectTeacher
} from '../firebase/storageService';
import './AdminCourseManagement.css';

const AdminCourseManagement = ({ currentUser }) => {
  const [courses, setCourses] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allCourses = await getAllCoursesForAdmin();
      const allTeachers = await getTeachers();
      
      // Convert courses array to object for backward compatibility
      const coursesObject = {};
      if (Array.isArray(allCourses)) {
        allCourses.forEach(course => {
          coursesObject[course.id] = course;
        });
      }
      
      setCourses(coursesObject);
      setTeachers(allTeachers);
      setMessage('');
    } catch (error) {
      setMessage('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourseDetails = async (courseKey) => {
    try {
      const details = await getCourseDetailsForAdmin(courseKey);
      const courseAnalytics = await getCourseAnalyticsForAdmin(courseKey);
      setSelectedCourse(courseKey);
      setCourseDetails(details);
      setAnalytics(courseAnalytics);
    } catch (error) {
      setMessage('Error loading course details: ' + error.message);
    }
  };

  const handleDeleteCourse = async (courseKey, courseTitle) => {
    if (window.confirm(`Are you sure you want to delete the course "${courseTitle}"? This will remove it from all students and cannot be undone.`)) {
      try {
        await deleteCourseAsAdmin(courseKey);
        setMessage(`Course "${courseTitle}" deleted successfully.`);
        await loadData();
        setSelectedCourse(null);
        setCourseDetails(null);
        setAnalytics(null);
      } catch (error) {
        setMessage('Error deleting course: ' + error.message);
      }
    }
  };

  const handleDeleteLesson = async (courseKey, lessonId, lessonTitle) => {
    if (window.confirm(`Are you sure you want to delete the lesson "${lessonTitle}"?`)) {
      try {
        await deleteLessonAsAdmin(courseKey, lessonId);
        setMessage(`Lesson "${lessonTitle}" deleted successfully.`);
        // Reload course details to reflect changes
        if (selectedCourse === courseKey) {
          await handleViewCourseDetails(courseKey);
        }
      } catch (error) {
        setMessage('Error deleting lesson: ' + error.message);
      }
    }
  };

  const handleApproveTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to approve this teacher?')) {
      try {
        await approveTeacher(teacherId);
        setMessage('Teacher approved successfully.');
        await loadData();
      } catch (error) {
        setMessage('Error approving teacher: ' + error.message);
      }
    }
  };

  const handleRejectTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to reject this teacher?')) {
      try {
        await rejectTeacher(teacherId);
        setMessage('Teacher rejected successfully.');
        await loadData();
      } catch (error) {
        setMessage('Error rejecting teacher: ' + error.message);
      }
    }
  };

  // Filter courses by teacher
  const filteredCourses = selectedTeacher === 'all' 
    ? courses 
    : (Array.isArray(courses) 
        ? courses.filter(course => course.teacherId === selectedTeacher)
        : Object.fromEntries(
            Object.entries(courses).filter(([key, course]) => course.teacherId === selectedTeacher)
          )
      );

  if (loading) {
    return <div className="loading">Loading course data...</div>;
  }

  return (
    <div className="admin-course-management">
      <div className="admin-header">
        <h2>📚 Course Management</h2>
        <p>Manage all courses, lessons, and teachers in the system</p>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
          <button className="message-close" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="management-controls">
        <div className="filter-section">
          <label htmlFor="teacherFilter">Filter by Teacher:</label>
          <select
            id="teacherFilter"
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          >
            <option value="all">All Teachers</option>
            {teachers.map(teacher => (
              <option key={teacher.uid || teacher.id} value={teacher.uid || teacher.id}>
                {teacher.name} ({teacher.email})
              </option>
            ))}
          </select>
        </div>
        <button className="refresh-btn" onClick={loadData}>
          🔄 Refresh
        </button>
      </div>

      <div className="courses-grid">
        <div className="courses-list">
          <h3>Courses ({Object.keys(filteredCourses).length})</h3>
          <div className="courses-container">
            {Object.entries(filteredCourses).map(([courseKey, course]) => (
              <div key={courseKey} className="course-card">
                <div className="course-header">
                  <span className="course-thumbnail">{course.thumbnail || '📖'}</span>
                  <div className="course-info">
                    <h4>{course.title}</h4>
                    <p className="course-description">{course.description}</p>
                    <div className="course-meta">
                      <span>👨‍🏫 Teacher: {course.teacherName}</span>
                      <span>📚 Lessons: {course.lessons?.length || 0}</span>
                      <span className={`status ${course.isPublished ? 'published' : 'draft'}`}>
                        {course.isPublished ? '✅ Published' : '📝 Draft'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="course-actions">
                  <button 
                    className="view-btn"
                    onClick={() => handleViewCourseDetails(courseKey)}
                  >
                    👁️ View Details
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteCourse(courseKey, course.title)}
                  >
                    🗑️ Delete Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedCourse && courseDetails && (
          <div className="course-details">
            <button 
              className="close-details-btn"
              onClick={() => {
                setSelectedCourse(null);
                setCourseDetails(null);
                setAnalytics(null);
              }}
            >
              ×
            </button>
            
            <h3>📖 {courseDetails.title}</h3>
            
            <div className="details-section">
              <h4>📋 Basic Information</h4>
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{courseDetails.description}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Teacher:</span>
                <span className="detail-value">{courseDetails.teacherInfo?.name} ({courseDetails.teacherInfo?.email})</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span className="detail-value">{new Date(courseDetails.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value status ${courseDetails.isPublished ? 'published' : 'draft'}`}>
                  {courseDetails.isPublished ? '✅ Published' : '📝 Draft'}
                </span>
              </div>
            </div>

            {analytics && (
              <div className="analytics-section">
                <h4>📊 Analytics</h4>
                <div className="analytics-grid">
                  <div className="stat">
                    <span className="stat-number">{analytics.totalEnrolled}</span>
                    <span className="stat-label">👨‍🎓 Students Enrolled</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{analytics.completionRate}%</span>
                    <span className="stat-label">✅ Completion Rate</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{analytics.averageQuizScore}%</span>
                    <span className="stat-label">📝 Avg Quiz Score</span>
                  </div>
                </div>
              </div>
            )}

            <div className="lessons-section">
              <h4>📚 Lessons ({courseDetails.lessons?.length || 0})</h4>
              {courseDetails.lessons?.map(lesson => (
                <div key={lesson.id} className="lesson-item">
                  <div className="lesson-info">
                    <h5>{lesson.title}</h5>
                    <div className="lesson-meta">
                      <span>⏱️ Duration: {lesson.duration}</span>
                      <span className={`lesson-type ${lesson.isFree ? 'free' : 'paid'}`}>
                        {lesson.isFree ? '🆓 Free' : `💰 Paid - ₦${lesson.price}`}
                      </span>
                    </div>
                    <p className="lesson-content">{lesson.content?.substring(0, 100)}...</p>
                    <div className="lesson-badges">
                      {lesson.quiz && (
                        <span className="quiz-badge">📝 Quiz: {lesson.quiz.questions.length} questions</span>
                      )}
                      {lesson.multimedia && lesson.multimedia.length > 0 && (
                        <span className="media-badge">🎬 Media: {lesson.multimedia.length} files</span>
                      )}
                      {lesson.isLocked && (
                        <span className="locked-badge">🔒 Locked</span>
                      )}
                    </div>
                  </div>
                  <div className="lesson-actions">
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteLesson(selectedCourse, lesson.id, lesson.title)}
                    >
                      🗑️ Delete Lesson
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourseManagement;
