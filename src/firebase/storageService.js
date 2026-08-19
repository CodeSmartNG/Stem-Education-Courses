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

const getCurrentUser = () => {
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

const listenToUser = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ uid: docSnapshot.id, ...docSnapshot.data() });
    } else {
      callback(null);
    }
  });
};

const registerUser = async (email, password, userData) => {
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

const loginUser = async (email, password) => {
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

const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

const updateUserProfile = async (uid, updateData) => {
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

const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

const resendVerificationEmail = async () => {
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

// ==================== ADMIN MANAGEMENT ====================

const createAdminUser = async () => {
  try {
    const adminEmail = 'codesmartng1@gmail.com';
    const adminPassword = 'Kb1217@#$%&';

    try {
      const result = await loginUser(adminEmail, adminPassword);
      if (result.success) {
        console.log('✅ Admin user already exists');
        return { success: true, message: 'Admin already exists', user: result.user };
      }
    } catch (error) {
      console.log('Admin not found, creating...');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: 'Kabir Alkasim'
    });

    const userDoc = {
      uid: user.uid,
      name: 'Kabir Alkasim',
      email: adminEmail,
      role: 'admin',
      isAdmin: true,
      isApproved: true,
      isEmailVerified: true,
      joinedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);

    return { success: true, user: userDoc };
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'Admin user already exists' };
    }
    throw error;
  }
};

const checkAdminExists = async () => {
  try {
    const adminEmail = 'codesmartng1@gmail.com';
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let adminExists = false;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email === adminEmail && data.role === 'admin') {
        adminExists = true;
      }
    });
    return adminExists;
  } catch (error) {
    console.error('Error checking admin:', error);
    return false;
  }
};

const getAdminUser = async () => {
  try {
    const adminEmail = 'codesmartng1@gmail.com';
    const q = query(collection(db, 'users'), where('email', '==', adminEmail), where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting admin:', error);
    return null;
  }
};

// ==================== TEACHER MANAGEMENT ====================

const createTeacherUser = async (teacherData) => {
  try {
    const { email, password, name, specialization, bio, whatsappNumber } = teacherData;

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        console.log('✅ Teacher user already exists');
        return { success: true, message: 'Teacher already exists', user: result.user };
      }
    } catch (error) {
      console.log('Teacher not found, creating...');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: name
    });

    await sendEmailVerification(user);

    const userDoc = {
      uid: user.uid,
      name: name,
      email: email,
      role: 'teacher',
      isAdmin: false,
      isApproved: false,
      isEmailVerified: false,
      specialization: specialization || 'General',
      bio: bio || '',
      whatsappNumber: whatsappNumber || '',
      profileImage: '',
      courses: [],
      earnings: 0,
      joinedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    const walletData = {
      teacherId: user.uid,
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'wallets', user.uid), walletData);

    console.log('✅ Teacher user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('⚠️ Account needs admin approval before login');

    return { success: true, user: userDoc, uid: user.uid };
  } catch (error) {
    console.error('Error creating teacher user:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'Teacher user already exists' };
    }
    throw error;
  }
};

const getTeacherWhatsAppUrl = async (teacherId) => {
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

const updateTeacherProfileWithWhatsApp = async (teacherId, profileData) => {
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

const approveTeacher = async (teacherId) => {
  try {
    await updateDoc(doc(db, 'users', teacherId), {
      isApproved: true,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('✅ Teacher approved:', teacherId);
    return { success: true };
  } catch (error) {
    console.error('Approve teacher error:', error);
    throw error;
  }
};

const rejectTeacher = async (teacherId) => {
  try {
    await updateDoc(doc(db, 'users', teacherId), {
      isApproved: false,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('❌ Teacher rejected:', teacherId);
    return { success: true };
  } catch (error) {
    console.error('Reject teacher error:', error);
    throw error;
  }
};

const getTeachers = async () => {
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

const getPendingTeachers = async () => {
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

const getApprovedTeachers = async () => {
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

const addCourse = async (courseData, teacherId) => {
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

const getCourses = async () => {
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

const getCourseById = async (courseId) => {
  try {
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    if (courseDoc.exists()) {
      return { id: courseDoc.id, ...courseDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Get course error:', error);
    throw error;
  }
};

const getTeacherCourses = async (teacherId) => {
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

const updateCourse = async (courseId, updateData) => {
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

const deleteCourse = async (courseId) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
    return { success: true };
  } catch (error) {
    console.error('Delete course error:', error);
    throw error;
  }
};

const publishCourse = async (courseId, isPublished) => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      isPublished: isPublished,
      publishedAt: isPublished ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Publish course error:', error);
    throw error;
  }
};

// ==================== LESSON MANAGEMENT ====================

const addLesson = async (courseId, lessonData) => {
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

const updateLesson = async (courseId, lessonId, updateData) => {
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

const deleteLesson = async (courseId, lessonId) => {
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

// ==================== STUDENT ENROLLMENT ====================

const enrollStudent = async (studentId, courseId) => {
  try {
    const userRef = doc(db, 'users', studentId);
    await updateDoc(userRef, {
      enrolledCourses: arrayUnion(courseId),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Enroll student error:', error);
    throw error;
  }
};

const unenrollStudent = async (studentId, courseId) => {
  try {
    const userRef = doc(db, 'users', studentId);
    await updateDoc(userRef, {
      enrolledCourses: arrayRemove(courseId),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Unenroll student error:', error);
    throw error;
  }
};

const updateProgress = async (studentId, courseId, progress, completedLessonId = null) => {
  try {
    const userRef = doc(db, 'users', studentId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const user = userDoc.data();
    const currentProgress = user.progress || {};
    const completedLessons = user.completedLessons || [];

    currentProgress[courseId] = progress;

    if (completedLessonId && !completedLessons.includes(completedLessonId)) {
      completedLessons.push(completedLessonId);
      const points = (user.points || 0) + 10;
      await updateDoc(userRef, {
        progress: currentProgress,
        completedLessons: completedLessons,
        points: points,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userRef, {
        progress: currentProgress,
        updatedAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Update progress error:', error);
    throw error;
  }
};

// ==================== LESSON PURCHASE ====================

const purchaseLesson = async (studentId, courseId, lessonId, paymentData) => {
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

const canAccessLesson = async (studentId, courseId, lessonId) => {
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

// ==================== TEACHER WALLET ====================

const getTeacherWallet = async (teacherId) => {
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

const addTeacherEarnings = async (teacherId, amount, description, lessonDetails = {}) => {
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

const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
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

// ==================== FILE UPLOAD ====================

const uploadFile = async (file, path, onProgress) => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url: downloadURL });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Upload file error:', error);
    throw error;
  }
};

const deleteFile = async (fileUrl) => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
};

// ==================== REAL-TIME LISTENERS ====================

const listenToCourse = (courseId, callback) => {
  return onSnapshot(doc(db, 'courses', courseId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback({ id: docSnapshot.id, ...docSnapshot.data() });
    } else {
      callback(null);
    }
  });
};

const listenToAllCourses = (callback) => {
  return onSnapshot(collection(db, 'courses'), (snapshot) => {
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    callback(courses);
  });
};

// ==================== PLATFORM STATISTICS ====================

const getPlatformStats = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const totalCourses = coursesSnapshot.size;

    const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const teachersSnapshot = await getDocs(teachersQuery);
    const totalTeachers = teachersSnapshot.size;

    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const totalStudents = studentsSnapshot.size;

    const pendingTeachers = await getPendingTeachers();

    return {
      totalUsers,
      totalCourses,
      totalTeachers,
      totalStudents,
      pendingTeachers: pendingTeachers.length,
      approvedTeachers: totalTeachers - pendingTeachers.length
    };
  } catch (error) {
    console.error('Get platform stats error:', error);
    throw error;
  }
};

// ==================== SINGLE EXPORT ====================

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

  // Courses
  addCourse,
  getCourses,
  getCourseById,
  getTeacherCourses,
  updateCourse,
  deleteCourse,
  publishCourse,

  // Lessons
  addLesson,
  updateLesson,
  deleteLesson,

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

  // Storage
  uploadFile,
  deleteFile,

  // Listeners
  listenToCourse,
  listenToAllCourses,  // ✅ Only exported here, not with export const

  // Stats
  getPlatformStats
};
