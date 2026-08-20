// src/firebase/storageService.js
import {
  auth,
  db,
  storage,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  onSnapshot,
  Timestamp
} from './config';

// ==================== USER MANAGEMENT ====================

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            resolve({
              uid: user.uid,
              email: user.email,
              ...userDoc.data(),
              isEmailVerified: user.emailVerified
            });
          } else {
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(null);
      }
    });
  });
};

export const listenToUser = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ uid: docSnapshot.id, ...docSnapshot.data() });
    } else {
      callback(null);
    }
  });
};

export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: userData.name
    });

    await sendEmailVerification(user);

    const userDoc = {
      uid: user.uid,
      name: userData.name,
      email: user.email,
      role: userData.role || 'student',
      level: userData.level || 'Beginner',
      isEmailVerified: false,
      isApproved: userData.role === 'admin',
      joinedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      progress: {},
      completedLessons: [],
      points: 0,
      badges: [],
      enrolledCourses: [],
      purchasedLessons: [],
      paymentHistory: [],
      specialization: userData.specialization || '',
      bio: userData.bio || '',
      courses: [],
      earnings: 0,
      whatsappNumber: userData.whatsappNumber || '',
      profileImage: userData.profileImage || '',
      isAdmin: userData.role === 'admin'
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    return { success: true, user: userDoc, uid: user.uid };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data();
    if (userData.role === 'teacher' && !userData.isApproved) {
      throw new Error('Your teacher account is pending admin approval. Please wait for approval before logging in.');
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        ...userData,
        isEmailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid, updateData) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
      return { success: true };
    }
    throw new Error('No user logged in');
  } catch (error) {
    console.error('Resend verification error:', error);
    throw error;
  }
};

// ==================== TEACHER MANAGEMENT ====================

export const getTeacherWhatsAppUrl = async (teacherId) => {
  try {
    if (!teacherId) {
      return null;
    }

    const teacherDoc = await getDoc(doc(db, 'users', teacherId));

    if (!teacherDoc.exists()) {
      return null;
    }

    const teacherData = teacherDoc.data();

    if (!teacherData.whatsappNumber) {
      return null;
    }

    const whatsappNumber = teacherData.whatsappNumber.replace(/\D/g, '');
    const message = `Hello ${teacherData.name || 'Teacher'}! I found you on the STEM Learning Platform and would like to learn more about your courses.`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  } catch (error) {
    console.error('Error getting teacher WhatsApp URL:', error);
    return null;
  }
};

export const updateTeacherProfileWithWhatsApp = async (teacherId, profileData) => {
  try {
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    const userRef = doc(db, 'users', teacherId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('Teacher not found');
    }

    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    throw error;
  }
};

export const approveTeacher = async (teacherId) => {
  try {
    await updateDoc(doc(db, 'users', teacherId), {
      isApproved: true,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Approve teacher error:', error);
    throw error;
  }
};

export const rejectTeacher = async (teacherId) => {
  try {
    await updateDoc(doc(db, 'users', teacherId), {
      isApproved: false,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Reject teacher error:', error);
    throw error;
  }
};

export const getTeachers = async () => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const teachersSnapshot = await getDocs(q);
    const teachers = [];
    teachersSnapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error('Get teachers error:', error);
    throw error;
  }
};

export const getPendingTeachers = async () => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('isApproved', '==', false));
    const teachersSnapshot = await getDocs(q);
    const teachers = [];
    teachersSnapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error('Get pending teachers error:', error);
    throw error;
  }
};

export const getApprovedTeachers = async () => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'), where('isApproved', '==', true));
    const teachersSnapshot = await getDocs(q);
    const teachers = [];
    teachersSnapshot.forEach(doc => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    return teachers;
  } catch (error) {
    console.error('Get approved teachers error:', error);
    throw error;
  }
};

// ==================== COURSE MANAGEMENT ====================

export const getCourses = async () => {
  try {
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('Get courses error:', error);
    throw error;
  }
};

export const getTeacherCourses = async (teacherId) => {
  try {
    const q = query(collection(db, 'courses'), where('teacherId', '==', teacherId));
    const coursesSnapshot = await getDocs(q);
    const courses = [];
    coursesSnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('Get teacher courses error:', error);
    throw error;
  }
};

export const addCourse = async (courseData, teacherId) => {
  try {
    const courseRef = doc(collection(db, 'courses'));
    const course = {
      ...courseData,
      id: courseRef.id,
      teacherId: teacherId,
      lessons: [],
      isPublished: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(courseRef, course);
    return { success: true, courseId: courseRef.id };
  } catch (error) {
    console.error('Add course error:', error);
    throw error;
  }
};

export const updateCourse = async (courseId, updateData) => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update course error:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
    return { success: true };
  } catch (error) {
    console.error('Delete course error:', error);
    throw error;
  }
};

// ==================== LESSON MANAGEMENT ====================

export const addLessonToCourse = async (courseId, lessonData) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);

    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const lessons = course.lessons || [];
    const newLesson = {
      id: lessons.length + 1,
      ...lessonData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await updateDoc(courseRef, {
      lessons: [...lessons, newLesson],
      updatedAt: serverTimestamp()
    });

    return { success: true, lesson: newLesson };
  } catch (error) {
    console.error('Add lesson error:', error);
    throw error;
  }
};

export const updateLesson = async (courseId, lessonId, updateData) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);

    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const lessons = course.lessons || [];
    const lessonIndex = lessons.findIndex(l => l.id === lessonId);

    if (lessonIndex === -1) {
      throw new Error('Lesson not found');
    }

    lessons[lessonIndex] = {
      ...lessons[lessonIndex],
      ...updateData,
      updatedAt: serverTimestamp()
    };

    await updateDoc(courseRef, {
      lessons: lessons,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Update lesson error:', error);
    throw error;
  }
};

export const deleteLesson = async (courseId, lessonId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);

    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const lessons = course.lessons || [];
    const updatedLessons = lessons.filter(l => l.id !== lessonId);

    await updateDoc(courseRef, {
      lessons: updatedLessons,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Delete lesson error:', error);
    throw error;
  }
};

export const addMultimediaToLesson = async (courseId, lessonId, multimediaItem) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);
    
    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const lesson = course.lessons.find(l => l.id === lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (!lesson.multimedia) {
      lesson.multimedia = [];
    }

    const newMultimediaItem = {
      id: lesson.multimedia.length > 0 ? Math.max(...lesson.multimedia.map(m => m.id)) + 1 : 1,
      ...multimediaItem
    };

    lesson.multimedia.push(newMultimediaItem);
    course.updatedAt = serverTimestamp();

    await updateDoc(courseRef, course);
    return { success: true, multimedia: newMultimediaItem };
  } catch (error) {
    console.error('Add multimedia error:', error);
    throw error;
  }
};

export const deleteMultimediaFromLesson = async (courseId, lessonId, multimediaId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);
    
    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const lesson = course.lessons.find(l => l.id === lessonId);
    if (!lesson || !lesson.multimedia) {
      throw new Error('Lesson or multimedia not found');
    }

    lesson.multimedia = lesson.multimedia.filter(item => item.id !== multimediaId);
    course.updatedAt = serverTimestamp();

    await updateDoc(courseRef, course);
    return { success: true };
  } catch (error) {
    console.error('Delete multimedia error:', error);
    throw error;
  }
};

// ==================== PAYMENT TRANSACTIONS ====================

export const getPaymentTransactions = () => {
  try {
    const transactions = localStorage.getItem(PAYMENT_TRANSACTIONS_KEY);
    return transactions ? JSON.parse(transactions) : {};
  } catch (error) {
    console.error('Error loading payment transactions:', error);
    return {};
  }
};

export const savePaymentTransactions = (transactions) => {
  try {
    localStorage.setItem(PAYMENT_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Error saving payment transactions:', error);
  }
};

// ✅ ADD THIS FUNCTION - Process lesson payment
export const processLessonPayment = async (studentId, teacherId, courseKey, lessonId, amount) => {
  try {
    const paymentTransaction = {
      id: `pay_${Date.now()}`,
      studentId: studentId,
      teacherId: teacherId,
      courseKey: courseKey,
      lessonId: lessonId,
      amount: amount,
      status: 'completed',
      date: new Date().toISOString(),
      type: 'lesson_purchase'
    };

    // Save payment transaction
    const transactions = getPaymentTransactions();
    transactions[paymentTransaction.id] = paymentTransaction;
    savePaymentTransactions(transactions);

    // Add earnings to teacher wallet (keep 90% for teacher, 10% platform fee)
    const teacherEarnings = amount * 0.9;
    await addTeacherEarnings(teacherId, teacherEarnings, `Payment for lesson purchase`, {
      courseKey: courseKey,
      lessonId: lessonId,
      studentId: studentId
    });

    // Update student's purchased lessons
    const student = await getStudentById(studentId);
    if (student) {
      if (!student.purchasedLessons) {
        student.purchasedLessons = [];
      }
      
      const purchaseKey = `${courseKey}-${lessonId}`;
      if (!student.purchasedLessons.includes(purchaseKey)) {
        student.purchasedLessons.push(purchaseKey);
        await updateStudent(student);
      }
    }

    return { success: true, transaction: paymentTransaction };
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};

// ==================== STUDENT MANAGEMENT ====================

export const getStudentById = async (id) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', id));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Get student error:', error);
    return null;
  }
};

export const updateStudent = async (student) => {
  try {
    await updateDoc(doc(db, 'users', student.uid), student);
    return { success: true };
  } catch (error) {
    console.error('Update student error:', error);
    throw error;
  }
};

// ==================== TEACHER WALLET ====================

export const getTeacherWallet = async (teacherId) => {
  try {
    const walletDoc = await getDoc(doc(db, 'wallets', teacherId));
    if (walletDoc.exists()) {
      return { id: walletDoc.id, ...walletDoc.data() };
    }
    const walletData = {
      teacherId: teacherId,
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'wallets', teacherId), walletData);
    return { id: teacherId, ...walletData };
  } catch (error) {
    console.error('Get wallet error:', error);
    throw error;
  }
};

export const addTeacherEarnings = async (teacherId, amount, description, lessonDetails = {}) => {
  try {
    const walletRef = doc(db, 'wallets', teacherId);
    const walletDoc = await getDoc(walletRef);
    
    let wallet = walletDoc.data();
    if (!wallet) {
      wallet = {
        teacherId: teacherId,
        balance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        transactions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
    }

    const transaction = {
      id: `txn_${Date.now()}`,
      type: 'credit',
      amount: amount,
      description: description,
      lessonDetails: lessonDetails,
      date: serverTimestamp(),
      status: 'completed'
    };

    const updatedWallet = {
      balance: (wallet.balance || 0) + amount,
      totalEarnings: (wallet.totalEarnings || 0) + amount,
      transactions: [transaction, ...(wallet.transactions || [])],
      updatedAt: serverTimestamp()
    };

    await setDoc(walletRef, { ...wallet, ...updatedWallet }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Add earnings error:', error);
    throw error;
  }
};

export const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
  try {
    const walletRef = doc(db, 'wallets', teacherId);
    const walletDoc = await getDoc(walletRef);
    
    if (!walletDoc.exists()) {
      throw new Error('Wallet not found');
    }

    const wallet = walletDoc.data();
    
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount < 100) {
      throw new Error('Minimum withdrawal amount is ₦100');
    }

    const transaction = {
      id: `withdraw_${Date.now()}`,
      type: 'debit',
      amount: amount,
      description: `Withdrawal to ${bankDetails.bankName}`,
      bankDetails: bankDetails,
      date: serverTimestamp(),
      status: 'pending'
    };

    const updatedWallet = {
      balance: wallet.balance - amount,
      pendingWithdrawals: (wallet.pendingWithdrawals || 0) + amount,
      transactions: [transaction, ...(wallet.transactions || [])],
      updatedAt: serverTimestamp()
    };

    await setDoc(walletRef, { ...wallet, ...updatedWallet }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Withdraw error:', error);
    throw error;
  }
};

// ==================== PAYMENT TRANSACTIONS KEYS ====================

const PAYMENT_TRANSACTIONS_KEY = 'hausaStem_payment_transactions';
const TEACHER_WALLETS_KEY = 'hausaStem_teacher_wallets';

export const getTeacherWallets = () => {
  try {
    const wallets = localStorage.getItem(TEACHER_WALLETS_KEY);
    return wallets ? JSON.parse(wallets) : {};
  } catch (error) {
    console.error('Error loading teacher wallets:', error);
    return {};
  }
};

export const saveTeacherWallets = (wallets) => {
  try {
    localStorage.setItem(TEACHER_WALLETS_KEY, JSON.stringify(wallets));
  } catch (error) {
    console.error('Error saving teacher wallets:', error);
  }
};

// ==================== ADDITIONAL EXPORTS ====================

export const getTeacherStats = async (teacherId) => {
  try {
    const courses = await getTeacherCourses(teacherId);
    const wallet = await getTeacherWallet(teacherId);
    
    return {
      totalCourses: courses.length,
      totalLessons: courses.reduce((acc, course) => acc + (course.lessons?.length || 0), 0),
      totalStudents: 0, // This would require additional queries
      totalEarnings: wallet.totalEarnings || 0,
      availableBalance: wallet.balance || 0
    };
  } catch (error) {
    console.error('Get teacher stats error:', error);
    return {
      totalCourses: 0,
      totalLessons: 0,
      totalStudents: 0,
      totalEarnings: 0,
      availableBalance: 0
    };
  }
};

export const getAllCoursesForAdmin = getCourses;
export const getCourseDetailsForAdmin = getCourseById;
export const deleteCourseAsAdmin = deleteCourse;
export const deleteLessonAsAdmin = deleteLesson;
export const getCourseAnalyticsForAdmin = getCourseById;
export const getTeacherCoursesForAdmin = getTeacherCourses;
export const getPlatformStats = async () => {
  try {
    const courses = await getCourses();
    const teachers = await getTeachers();
    return {
      totalCourses: courses.length,
      totalTeachers: teachers.length,
      totalStudents: 0, // Would need additional queries
      totalLessons: courses.reduce((acc, course) => acc + (course.lessons?.length || 0), 0)
    };
  } catch (error) {
    console.error('Get platform stats error:', error);
    return {};
  }
};

export const getUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = {};
    usersSnapshot.forEach(doc => {
      users[doc.id] = doc.data();
    });
    return users;
  } catch (error) {
    console.error('Get users error:', error);
    return {};
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
};

// ==================== LESSON ACCESS ====================

export const canAccessLesson = async (studentId, courseId, lessonId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', studentId));
    if (!userDoc.exists()) return false;
    
    const user = userDoc.data();
    const purchaseKey = `${courseId}_${lessonId}`;
    return user.purchasedLessons?.includes(purchaseKey) || false;
  } catch (error) {
    console.error('Check access error:', error);
    return false;
  }
};

export const purchaseLesson = async (studentId, courseId, lessonId, paymentData) => {
  try {
    const userRef = doc(db, 'users', studentId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const user = userDoc.data();
    const purchasedLessons = user.purchasedLessons || [];
    const purchaseKey = `${courseId}_${lessonId}`;
    
    if (!purchasedLessons.includes(purchaseKey)) {
      purchasedLessons.push(purchaseKey);
      
      const paymentHistory = user.paymentHistory || [];
      paymentHistory.push({
        paymentId: paymentData?.paymentId || `pay_${Date.now()}`,
        amount: paymentData?.amount || 0,
        lessonId: lessonId,
        courseId: courseId,
        gateway: paymentData?.gateway || 'manual',
        timestamp: serverTimestamp(),
        status: 'completed'
      });

      await updateDoc(userRef, {
        purchasedLessons: purchasedLessons,
        paymentHistory: paymentHistory,
        updatedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Purchase lesson error:', error);
    throw error;
  }
};

// ==================== EXPORT ALL FUNCTIONS ====================

export {
  // Auth
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  resetPassword,
  resendVerificationEmail,
  listenToUser,
  
  // Admin
  createAdminUser,
  checkAdminExists,
  getAdminUser,
  
  // Teachers
  createTeacherUser,
  approveTeacher,
  rejectTeacher,
  getTeachers,
  getPendingTeachers,
  getApprovedTeachers,
  getTeacherWhatsAppUrl,
  updateTeacherProfileWithWhatsApp,
  getTeacherStats,
  
  // Courses
  addCourse,
  getCourses,
  getCourseById,
  getTeacherCourses,
  updateCourse,
  deleteCourse,
  publishCourse,
  
  // Lessons
  addLessonToCourse,
  updateLesson,
  deleteLesson,
  addMultimediaToLesson,
  deleteMultimediaFromLesson,
  
  // Enrollment
  enrollStudent,
  unenrollStudent,
  updateProgress,
  
  // Purchases
  purchaseLesson,
  canAccessLesson,
  
  // Wallet
  getTeacherWallet,
  addTeacherEarnings,
  withdrawFromWallet,
  getTeacherWallets,
  saveTeacherWallets,
  
  // Payments
  processLessonPayment,
  getPaymentTransactions,
  savePaymentTransactions,
  
  // Admin
  getAllCoursesForAdmin,
  getCourseDetailsForAdmin,
  deleteCourseAsAdmin,
  deleteLessonAsAdmin,
  getCourseAnalyticsForAdmin,
  getTeacherCoursesForAdmin,
  getPlatformStats,
  getUsers,
  deleteUser,
  updateUser,
  
  // Student
  getStudentById,
  updateStudent
};
