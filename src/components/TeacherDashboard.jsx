import React, { useState, useEffect, useRef } from 'react';
import { 
  getTeacherCourses,
  addCourse, 
  addLessonToCourse, 
  updateCourse,
  deleteCourse,
  updateLesson,
  deleteLesson,
  addMultimediaToLesson,
  deleteMultimediaFromLesson,
  getTeacherStats,
  getTeacherWallet,
  withdrawFromWallet,
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getCurrentUser
} from '../firebase/storageService';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [courses, setCoursesState] = useState({});
  const [wallet, setWallet] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState({});

  // File upload states
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoFilePreview, setVideoFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Course Form States
  const [newCourseForm, setNewCourseForm] = useState({
    title: '',
    description: '',
    thumbnail: '📚',
    key: ''
  });

  // Lesson Form States with Video Upload Support
  const [newLessonForm, setNewLessonForm] = useState({
    courseKey: '',
    title: '',
    content: '',
    duration: '',
    videoFile: null,
    videoTitle: '',
    videoDescription: '',
    isFree: true,
    price: 0,
    isLocked: false,
    videoSource: 'upload',
    videoUrl: ''
  });

  // Quiz Form States
  const [quizForm, setQuizForm] = useState({
    title: '',
    passingScore: 70,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: 'text',
    options: ['', '', '', ''],
    correctAnswer: 0,
    imageUrl: ''
  });

  const [showQuizForm, setShowQuizForm] = useState(false);

  // Edit States
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseForm, setEditCourseForm] = useState({});
  const [editingLesson, setEditingLesson] = useState(null);
  const [editLessonForm, setEditLessonForm] = useState({});
  const [viewingCourseLessons, setViewingCourseLessons] = useState(null);

  // Multimedia States
  const [managingMultimedia, setManagingMultimedia] = useState(null);
  const [newMultimediaForm, setNewMultimediaForm] = useState({
    type: 'video',
    url: '',
    title: '',
    description: ''
  });

  // Payment & WhatsApp States
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  // Function to handle video file selection
  const handleVideoFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid video file (MP4, WebM, OGG, MOV, AVI)');
        e.target.value = '';
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        alert('Video file is too large. Maximum size is 100MB.');
        e.target.value = '';
        return;
      }

      setSelectedVideoFile(file);
      
      const previewUrl = URL.createObjectURL(file);
      setVideoFilePreview(previewUrl);
      
      setNewLessonForm(prev => ({
        ...prev,
        videoFile: file,
        videoTitle: file.name,
        videoSource: 'upload'
      }));
    }
  };

  // Function to simulate file upload
  const simulateFileUpload = () => {
    return new Promise((resolve) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setIsUploading(false);
          resolve(true);
        }
        setUploadProgress(Math.min(progress, 100));
      }, 300);
    });
  };

  // Function to get YouTube embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&]+)/,
      /youtube\.com\/v\/([^?]+)/,
      /youtube\.com\/watch\?.*v=([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    return url;
  };

  const isValidYouTubeUrl = (url) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  useEffect(() => {
    loadData();
    loadTeacherProfile();
    
    return () => {
      if (videoFilePreview) {
        URL.revokeObjectURL(videoFilePreview);
      }
    };
  }, []);

  useEffect(() => {
    if (newLessonForm.videoSource === 'upload' && selectedVideoFile) {
      setNewLessonForm(prev => ({
        ...prev,
        videoFile: selectedVideoFile,
        videoTitle: selectedVideoFile.name
      }));
    }
  }, [selectedVideoFile, newLessonForm.videoSource]);

  const loadData = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        console.error('No user logged in');
        return;
      }

      const teacherStats = await getTeacherStats(currentUser.uid);
      const teacherCourses = await getTeacherCourses(currentUser.uid);
      const walletData = await getTeacherWallet(currentUser.uid);

      // Convert courses array to object for backward compatibility
      const coursesObject = {};
      if (Array.isArray(teacherCourses)) {
        teacherCourses.forEach(course => {
          coursesObject[course.id] = course;
        });
      }

      setStats(teacherStats);
      setCoursesState(coursesObject);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadTeacherProfile = () => {
    try {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setTeacherProfile(currentUser);
        setWhatsappNumber(currentUser.whatsappNumber || '');
      }
    } catch (error) {
      console.error('Error loading teacher profile:', error);
    }
  };

  // Save WhatsApp number
  const saveWhatsAppNumber = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      await updateTeacherProfileWithWhatsApp(currentUser.uid, {
        whatsappNumber: whatsappNumber
      });
      alert('✅ WhatsApp number saved successfully!');
      loadTeacherProfile();
    } catch (error) {
      alert('❌ Error saving WhatsApp number: ' + error.message);
    }
  };

  // Process withdrawal
  const handleWithdrawal = async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      if (!withdrawalAmount || withdrawalAmount <= 0) {
        alert('Please enter a valid withdrawal amount');
        return;
      }

      if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
        alert('Please fill in all bank details');
        return;
      }

      if (window.confirm(`Are you sure you want to withdraw ₦${withdrawalAmount}?`)) {
        const updatedWallet = await withdrawFromWallet(currentUser.uid, parseFloat(withdrawalAmount), bankDetails);
        setWallet(updatedWallet);
        setWithdrawalAmount('');
        setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
        alert('✅ Withdrawal request submitted successfully!');
      }
    } catch (error) {
      alert('❌ Error processing withdrawal: ' + error.message);
    }
  };

  // Course Management Functions
  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        alert('Please log in first');
        return;
      }

      const courseData = {
        ...newCourseForm,
        teacherId: currentUser.uid,
        teacherName: currentUser.name,
        createdAt: new Date().toISOString(),
        lessons: []
      };

      await addCourse(courseData, currentUser.uid);
      alert('✅ Course added successfully!');
      setNewCourseForm({
        title: '',
        description: '',
        thumbnail: '📚',
        key: ''
      });
      await loadData();
      setActiveTab('my-courses');
    } catch (error) {
      alert('❌ Error adding course: ' + error.message);
    }
  };

  const startEditCourse = (courseKey) => {
    const course = courses[courseKey];
    setEditingCourse(courseKey);
    setEditCourseForm({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail
    });
  };

  const cancelEditCourse = () => {
    setEditingCourse(null);
    setEditCourseForm({});
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      await updateCourse(editingCourse, editCourseForm);
      alert('✅ Course updated successfully!');
      setEditingCourse(null);
      setEditCourseForm({});
      await loadData();
    } catch (error) {
      alert('❌ Error updating course: ' + error.message);
    }
  };

  const handleDeleteCourse = async (courseKey) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteCourse(courseKey);
        alert('✅ Course deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting course: ' + error.message);
      }
    }
  };

  // Quiz Management Functions
  const handleAddQuestion = () => {
    if (!currentQuestion.question.trim()) {
      alert('Please enter a question');
      return;
    }

    if (currentQuestion.options.some(opt => !opt.trim())) {
      alert('Please fill all options');
      return;
    }

    const newQuestion = {
      id: quizForm.questions.length + 1,
      ...currentQuestion,
      options: [...currentQuestion.options]
    };

    setQuizForm(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setCurrentQuestion({
      question: '',
      type: 'text',
      options: ['', '', '', ''],
      correctAnswer: 0,
      imageUrl: ''
    });
  };

  const handleRemoveQuestion = (questionId) => {
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentQuestion(prev => ({
      ...prev,
      correctAnswer: index
    }));
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: '',
      passingScore: 70,
      questions: []
    });
    setCurrentQuestion({
      question: '',
      type: 'text',
      options: ['', '', '', ''],
      correctAnswer: 0,
      imageUrl: ''
    });
    setShowQuizForm(false);
  };

  // Lesson Management Functions with Video Upload
  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      if (selectedVideoFile) {
        await simulateFileUpload();
      }

      const lessonData = {
        title: newLessonForm.title,
        content: newLessonForm.content,
        duration: newLessonForm.duration,
        completed: false,
        multimedia: [],
        quiz: null,
        isFree: newLessonForm.isFree,
        price: newLessonForm.isFree ? 0 : newLessonForm.price,
        isLocked: !newLessonForm.isFree
      };

      if (newLessonForm.videoSource === 'upload' && selectedVideoFile) {
        const videoUrl = videoFilePreview || URL.createObjectURL(selectedVideoFile);
        
        lessonData.multimedia.push({
          type: 'video',
          url: videoUrl,
          title: newLessonForm.videoTitle || selectedVideoFile.name,
          description: newLessonForm.videoDescription || 'Video content for this lesson',
          fileType: selectedVideoFile.type,
          fileSize: selectedVideoFile.size,
          fileName: selectedVideoFile.name,
          isUploaded: true,
          uploadedAt: new Date().toISOString()
        });
      } else if (newLessonForm.videoUrl && newLessonForm.videoSource === 'youtube') {
        const embedUrl = getYouTubeEmbedUrl(newLessonForm.videoUrl);
        lessonData.multimedia.push({
          type: 'video',
          url: embedUrl,
          title: newLessonForm.videoTitle || 'Lesson Video',
          description: newLessonForm.videoDescription || 'Video content for this lesson',
          originalUrl: newLessonForm.videoUrl,
          isYouTube: true
        });
      }

      if (quizForm.questions.length > 0) {
        lessonData.quiz = {
          title: quizForm.title || 'Lesson Quiz',
          passingScore: quizForm.passingScore,
          questions: quizForm.questions
        };
      }

      await addLessonToCourse(newLessonForm.courseKey, lessonData);
      alert('✅ Lesson added successfully!');

      setNewLessonForm({
        courseKey: '',
        title: '',
        content: '',
        duration: '',
        videoFile: null,
        videoTitle: '',
        videoDescription: '',
        isFree: true,
        price: 0,
        isLocked: false,
        videoSource: 'upload',
        videoUrl: ''
      });
      setSelectedVideoFile(null);
      setVideoFilePreview(null);
      setUploadProgress(0);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      resetQuizForm();
      await loadData();
    } catch (error) {
      alert('❌ Error adding lesson: ' + error.message);
    }
  };

  const startViewLessons = (courseKey) => {
    setViewingCourseLessons(courseKey);
    setActiveTab('manage-lessons');
  };

  const startEditLesson = (courseKey, lesson) => {
    setEditingLesson({ courseKey, lessonId: lesson.id });
    setEditLessonForm({
      title: lesson.title,
      content: lesson.content,
      duration: lesson.duration,
      isFree: lesson.isFree,
      price: lesson.price
    });
  };

  const cancelEditLesson = () => {
    setEditingLesson(null);
    setEditLessonForm({});
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    try {
      const updatedData = {
        ...editLessonForm,
        isLocked: !editLessonForm.isFree
      };
      
      await updateLesson(editingLesson.courseKey, editingLesson.lessonId, updatedData);
      alert('✅ Lesson updated successfully!');
      setEditingLesson(null);
      setEditLessonForm({});
      await loadData();
    } catch (error) {
      alert('❌ Error updating lesson: ' + error.message);
    }
  };

  const handleDeleteLesson = async (courseKey, lessonId, lessonTitle) => {
    if (window.confirm(`Are you sure you want to delete the lesson "${lessonTitle}"?`)) {
      try {
        await deleteLesson(courseKey, lessonId);
        alert('✅ Lesson deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting lesson: ' + error.message);
      }
    }
  };

  // Multimedia Management Functions
  const startManageMultimedia = (courseKey, lesson) => {
    setManagingMultimedia({ courseKey, lesson });
    setActiveTab('manage-multimedia');
  };

  const handleAddMultimedia = async (e) => {
    e.preventDefault();
    try {
      const multimediaData = { ...newMultimediaForm };

      if (multimediaData.type === 'video' && isValidYouTubeUrl(multimediaData.url)) {
        multimediaData.url = getYouTubeEmbedUrl(multimediaData.url);
      }

      await addMultimediaToLesson(
        managingMultimedia.courseKey, 
        managingMultimedia.lesson.id, 
        multimediaData
      );
      alert('✅ Multimedia content added successfully!');
      setNewMultimediaForm({
        type: 'video',
        url: '',
        title: '',
        description: ''
      });
      await loadData();
    } catch (error) {
      alert('❌ Error adding multimedia: ' + error.message);
    }
  };

  const handleDeleteMultimedia = async (multimediaId, multimediaTitle) => {
    if (window.confirm(`Are you sure you want to delete "${multimediaTitle}"?`)) {
      try {
        await deleteMultimediaFromLesson(
          managingMultimedia.courseKey, 
          managingMultimedia.lesson.id, 
          multimediaId
        );
        alert('✅ Multimedia content deleted successfully!');
        await loadData();
      } catch (error) {
        alert('❌ Error deleting multimedia: ' + error.message);
      }
    }
  };

  const formatCurrency = (amount) => {
    return `₦${amount?.toLocaleString() || '0'}`;
  };

  if (!stats) {
    return <div className="loading-teacher">Loading teacher data...</div>;
  }

  return (
    <div className="teacher-dashboard">
      <div className="teacher-header">
        <h3>Teacher Dashboard</h3>
        <p>Manage Your Courses, Earnings, and Lessons</p>
      </div>

      <div className="teacher-tabs">
        <button onClick={() => setActiveTab('overview')} className={activeTab === 'overview' ? 'active' : ''}>
          Overview
        </button>
        <button onClick={() => setActiveTab('my-courses')} className={activeTab === 'my-courses' ? 'active' : ''}>
          My Courses ({Object.keys(courses).length})
        </button>
        <button onClick={() => setActiveTab('manage-lessons')} className={activeTab === 'manage-lessons' ? 'active' : ''}>
          Manage Lessons
        </button>
        <button onClick={() => setActiveTab('add-course')} className={activeTab === 'add-course' ? 'active' : ''}>
          Add Course
        </button>
        <button onClick={() => setActiveTab('add-lesson')} className={activeTab === 'add-lesson' ? 'active' : ''}>
          Add Lesson
        </button>
        <button onClick={() => setActiveTab('manage-multimedia')} className={activeTab === 'manage-multimedia' ? 'active' : ''}>
          Manage Media
        </button>
        <button onClick={() => setActiveTab('earnings')} className={activeTab === 'earnings' ? 'active' : ''}>
          💰 Earnings {wallet && `(${formatCurrency(wallet.balance)})`}
        </button>
        <button onClick={() => setActiveTab('whatsapp')} className={activeTab === 'whatsapp' ? 'active' : ''}>
          📱 WhatsApp
        </button>
      </div>

      <div className="teacher-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {wallet && (
              <div className="wallet-summary">
                <h3>💰 Earnings Summary</h3>
                <div className="wallet-stats">
                  <div className="wallet-stat">
                    <span className="stat-label">Available Balance:</span>
                    <span className="stat-amount">{formatCurrency(wallet.balance)}</span>
                  </div>
                  <div className="wallet-stat">
                    <span className="stat-label">Total Earnings:</span>
                    <span className="stat-amount">{formatCurrency(wallet.totalEarnings)}</span>
                  </div>
                  <div className="wallet-stat">
                    <span className="stat-label">Pending Withdrawals:</span>
                    <span className="stat-amount">{formatCurrency(wallet.pendingWithdrawals)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <h3>My Courses</h3>
                <div className="stat-number">{stats.totalCourses}</div>
              </div>
              <div className="stat-card">
                <h3>Total Lessons</h3>
                <div className="stat-number">{stats.totalLessons}</div>
              </div>
              <div className="stat-card">
                <h3>Students Enrolled</h3>
                <div className="stat-number">{stats.totalStudents}</div>
              </div>
              <div className="stat-card">
                <h3>Paid Lessons</h3>
                <div className="stat-number">
                  {Object.values(courses).reduce((total, course) => 
                    total + (course.lessons?.filter(lesson => !lesson.isFree).length || 0), 0
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            <h3>💰 Earnings & Withdrawals</h3>
            
            {wallet ? (
              <div className="earnings-content">
                <div className="balance-card">
                  <h4>Available Balance</h4>
                  <div className="balance-amount">{formatCurrency(wallet.balance)}</div>
                  <p>Total Earnings: {formatCurrency(wallet.totalEarnings)}</p>
                </div>

                <div className="withdrawal-section">
                  <h4>Withdraw Funds</h4>
                  <div className="withdrawal-form">
                    <div className="form-group">
                      <label>Amount to Withdraw (₦)</label>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="100"
                        max={wallet.balance}
                      />
                      <small>Minimum withdrawal: ₦100</small>
                    </div>

                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                        placeholder="e.g., GTBank, Zenith Bank"
                      />
                    </div>

                    <div className="form-group">
                      <label>Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                        placeholder="10-digit account number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Account Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                        placeholder="Name as it appears on bank account"
                      />
                    </div>

                    <button 
                      onClick={handleWithdrawal}
                      disabled={!withdrawalAmount || withdrawalAmount > wallet.balance}
                      className="withdraw-btn"
                    >
                      Request Withdrawal
                    </button>
                  </div>
                </div>

                <div className="transaction-history">
                  <h4>Transaction History</h4>
                  {wallet.transactions && wallet.transactions.length > 0 ? (
                    <div className="transactions-list">
                      {wallet.transactions.map((transaction, index) => (
                        <div key={index} className="transaction-item">
                          <div className="transaction-info">
                            <span className={`transaction-type ${transaction.type}`}>
                              {transaction.type === 'credit' ? '💰 Credit' : '💸 Withdrawal'}
                            </span>
                            <span className="transaction-amount">
                              {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          </div>
                          <div className="transaction-details">
                            <span className="transaction-description">{transaction.description}</span>
                            <span className="transaction-date">
                              {new Date(transaction.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-transactions">No transactions yet</p>
                  )}
                </div>
              </div>
            ) : (
              <p>Loading wallet information...</p>
            )}
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="whatsapp-tab">
            <h3>📱 WhatsApp Contact</h3>
            <p>Add your WhatsApp number so students can contact you directly</p>
            
            <div className="whatsapp-form">
              <div className="form-group">
                <label>WhatsApp Phone Number</label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g., 2348012345678"
                />
                <small>Include country code without + sign (e.g., 2348012345678 for Nigeria)</small>
              </div>

              <button onClick={saveWhatsAppNumber} className="save-btn">
                Save WhatsApp Number
              </button>

              {teacherProfile.whatsappNumber && (
                <div className="whatsapp-preview">
                  <h4>Your WhatsApp Contact Link:</h4>
                  <div className="whatsapp-link">
                    <a 
                      href={getTeacherWhatsAppUrl(teacherProfile.uid)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="whatsapp-btn"
                    >
                      💬 Chat on WhatsApp
                    </a>
                  </div>
                  <p>Share this link with your students for direct communication</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Courses Tab */}
        {activeTab === 'my-courses' && (
          <div className="courses-tab">
            <h3>My Courses</h3>
            <div className="courses-list">
              {Object.entries(courses).map(([key, course]) => (
                <div key={key} className="course-teacher-card">
                  {editingCourse === key ? (
                    <div className="edit-course-form">
                      <h4>Edit Course: {course.title}</h4>
                      <form onSubmit={handleUpdateCourse} className="teacher-form">
                        <div className="form-group">
                          <label>Course Title</label>
                          <input
                            type="text"
                            value={editCourseForm.title}
                            onChange={(e) => setEditCourseForm({...editCourseForm, title: e.target.value})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            value={editCourseForm.description}
                            onChange={(e) => setEditCourseForm({...editCourseForm, description: e.target.value})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Thumbnail Emoji</label>
                          <input
                            type="text"
                            value={editCourseForm.thumbnail}
                            onChange={(e) => setEditCourseForm({...editCourseForm, thumbnail: e.target.value})}
                          />
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="save-btn">Save Changes</button>
                          <button type="button" onClick={cancelEditCourse} className="cancel-btn">Cancel</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="course-header">
                        <span className="course-thumbnail">{course.thumbnail}</span>
                        <div className="course-info">
                          <h4>{course.title}</h4>
                          <p className="course-description">{course.description}</p>
                        </div>
                      </div>
                      <div className="course-stats">
                        <span>Lessons: {course.lessons?.length || 0}</span>
                        <span>Free: {course.lessons?.filter(lesson => lesson.isFree).length || 0}</span>
                        <span>Paid: {course.lessons?.filter(lesson => !lesson.isFree).length || 0}</span>
                      </div>
                      <div className="course-actions">
                        <button className="edit-btn" onClick={() => startEditCourse(key)}>Edit</button>
                        <button className="view-btn" onClick={() => startViewLessons(key)}>Manage Lessons</button>
                        <button className="delete-btn" onClick={() => handleDeleteCourse(key)}>Delete</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage Lessons Tab */}
        {activeTab === 'manage-lessons' && (
          <div className="manage-lessons-tab">
            <h3>
              Manage Lessons 
              {viewingCourseLessons && ` - ${courses[viewingCourseLessons]?.title}`}
            </h3>

            {!viewingCourseLessons ? (
              <div className="select-course-prompt">
                <p>Select a course to manage its lessons:</p>
                <div className="course-buttons">
                  {Object.entries(courses).map(([key, course]) => (
                    <button 
                      key={key} 
                      className="course-select-btn"
                      onClick={() => startViewLessons(key)}
                    >
                      {course.thumbnail} {course.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="lessons-management">
                <button 
                  className="back-to-courses"
                  onClick={() => setViewingCourseLessons(null)}
                >
                  ← Back to Courses
                </button>

                <div className="lessons-list">
                  {courses[viewingCourseLessons]?.lessons?.map((lesson) => (
                    <div key={lesson.id} className="lesson-teacher-card">
                      {editingLesson?.courseKey === viewingCourseLessons && editingLesson.lessonId === lesson.id ? (
                        <div className="edit-lesson-form">
                          <h4>Edit Lesson</h4>
                          <form onSubmit={handleUpdateLesson} className="teacher-form">
                            <div className="form-group">
                              <label>Lesson Title</label>
                              <input
                                type="text"
                                value={editLessonForm.title}
                                onChange={(e) => setEditLessonForm({...editLessonForm, title: e.target.value})}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Lesson Content</label>
                              <textarea
                                value={editLessonForm.content}
                                onChange={(e) => setEditLessonForm({...editLessonForm, content: e.target.value})}
                                required
                                rows="4"
                              />
                            </div>
                            <div className="form-group">
                              <label>Duration</label>
                              <input
                                type="text"
                                value={editLessonForm.duration}
                                onChange={(e) => setEditLessonForm({...editLessonForm, duration: e.target.value})}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Lesson Type</label>
                              <div className="pricing-options">
                                <label>
                                  <input
                                    type="radio"
                                    name="lessonType"
                                    checked={editLessonForm.isFree}
                                    onChange={() => setEditLessonForm({...editLessonForm, isFree: true, price: 0})}
                                  />
                                  Free Lesson
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name="lessonType"
                                    checked={!editLessonForm.isFree}
                                    onChange={() => setEditLessonForm({...editLessonForm, isFree: false, price: editLessonForm.price || 500})}
                                  />
                                  Paid Lesson
                                </label>
                              </div>
                            </div>
                            {!editLessonForm.isFree && (
                              <div className="form-group">
                                <label>Price (₦)</label>
                                <input
                                  type="number"
                                  value={editLessonForm.price}
                                  onChange={(e) => setEditLessonForm({...editLessonForm, price: parseInt(e.target.value) || 0})}
                                  min="100"
                                  max="10000"
                                />
                              </div>
                            )}
                            <div className="form-actions">
                              <button type="submit" className="save-btn">Save Changes</button>
                              <button type="button" onClick={cancelEditLesson} className="cancel-btn">Cancel</button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <>
                          <div className="lesson-info">
                            <h5>{lesson.title}</h5>
                            <p><strong>Duration:</strong> {lesson.duration}</p>
                            <p><strong>Type:</strong> 
                              <span className={`lesson-type ${lesson.isFree ? 'free' : 'paid'}`}>
                                {lesson.isFree ? ' FREE' : ` PAID - ${formatCurrency(lesson.price)}`}
                              </span>
                            </p>
                            <p className="lesson-content-preview">{lesson.content.substring(0, 100)}...</p>
                            {lesson.multimedia && lesson.multimedia.length > 0 && (
                              <div className="lesson-media-indicator">
                                🎬 {lesson.multimedia.length} media file(s)
                                {lesson.multimedia.some(m => m.isUploaded) && ' (Includes uploaded video)'}
                              </div>
                            )}
                            {lesson.quiz && (
                              <div className="lesson-quiz-indicator">
                                📝 Has quiz ({lesson.quiz.questions.length} questions)
                              </div>
                            )}
                          </div>
                          <div className="lesson-actions">
                            <button 
                              className="edit-btn"
                              onClick={() => startEditLesson(viewingCourseLessons, lesson)}
                            >
                              Edit
                            </button>
                            <button 
                              className="media-btn"
                              onClick={() => startManageMultimedia(viewingCourseLessons, lesson)}
                            >
                              Media
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteLesson(viewingCourseLessons, lesson.id, lesson.title)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Course Tab */}
        {activeTab === 'add-course' && (
          <div className="add-course-tab">
            <h3>Add New Course</h3>
            <form onSubmit={handleAddCourse} className="teacher-form">
              <div className="form-group">
                <label>Course Title</label>
                <input
                  type="text"
                  value={newCourseForm.title}
                  onChange={(e) => setNewCourseForm({...newCourseForm, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newCourseForm.description}
                  onChange={(e) => setNewCourseForm({...newCourseForm, description: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <
