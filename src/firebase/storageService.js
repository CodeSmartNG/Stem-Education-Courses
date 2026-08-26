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
  increment,
  serverTimestamp,
  onSnapshot,
  addDoc,
  Timestamp,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from './config';

// ==================== AUTH FUNCTIONS ====================

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          });
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const registerUserWithFirebase = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await sendEmailVerification(user);

    if (userData.displayName) {
      await updateProfile(user, { displayName: userData.displayName });
    }

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: userData.displayName || '',
      role: userData.role || 'student',
      createdAt: serverTimestamp(),
      isEmailVerified: false,
      ...userData
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isEmailVerified: false
    };
  } catch (error) {
    console.error('Firebase registration error:', error);
    throw error;
  }
};

export const checkEmailVerification = async (user) => {
  try {
    await user.reload();
    return user.emailVerified;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
};

export const resendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error) {
    console.error('Error resending verification email:', error);
    throw error;
  }
};

export const loginWithFirebase = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in.');
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isEmailVerified: user.emailVerified,
      ...userData
    };
  } catch (error) {
    console.error('Firebase login error:', error);
    throw error;
  }
};

export const logoutFromFirebase = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error('Firebase logout error:', error);
    throw error;
  }
};

export const getCurrentFirebaseUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const syncUserDataToLocal = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error syncing user data:', error);
    return null;
  }
};

export const updateUserDataInFirestore = async (uid, data) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user data in Firestore:', error);
    throw error;
  }
};

// ✅ USER PROFILE UPDATE
export const updateUserProfile = async (uid, profileData) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Prepare data for Firestore
    const firestoreData = {
      ...profileData,
      updatedAt: serverTimestamp()
    };
    
    // If displayName is provided, update it in Auth too
    if (profileData.displayName) {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: profileData.displayName });
      }
    }
    
    await updateDoc(userRef, firestoreData);
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// ==================== COURSE MANAGEMENT ====================

export const saveCourse = async (courseData) => {
  try {
    const docRef = doc(collection(db, 'courses'));
    await setDoc(docRef, {
      ...courseData,
      id: docRef.id,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving course:', error);
    throw error;
  }
};

export const getCourses = async (teacherId = null) => {
  try {
    let q = collection(db, 'courses');
    if (teacherId) {
      q = query(q, where('teacherId', '==', teacherId));
    }
    const querySnapshot = await getDocs(q);
    const courses = [];
    querySnapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    return courses;
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

export const getCourseByKey = async (courseKey) => {
  try {
    const q = query(collection(db, 'courses'), where('key', '==', courseKey));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting course by key:', error);
    throw error;
  }
};

export const updateCourse = async (courseId, courseData) => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      ...courseData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

// ==================== LESSON MANAGEMENT ====================

export const saveLesson = async (courseId, lessonData) => {
  try {
    const docRef = doc(collection(db, 'lessons'));
    await setDoc(docRef, {
      ...lessonData,
      id: docRef.id,
      courseId: courseId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving lesson:', error);
    throw error;
  }
};

export const getLessons = async (courseId) => {
  try {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const lessons = [];
    querySnapshot.forEach(doc => {
      lessons.push({ id: doc.id, ...doc.data() });
    });
    return lessons;
  } catch (error) {
    console.error('Error getting lessons:', error);
    throw error;
  }
};

export const updateLesson = async (lessonId, lessonData) => {
  try {
    await updateDoc(doc(db, 'lessons', lessonId), {
      ...lessonData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
};

export const deleteLesson = async (lessonId) => {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
    return true;
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
};

// ==================== LESSON PURCHASE & ACCESS ====================

export const purchaseLesson = async (studentId, courseId, lessonId, paymentData = null) => {
  try {
    const userRef = doc(db, 'users', studentId);
    await updateDoc(userRef, {
      purchasedLessons: arrayUnion({
        courseId,
        lessonId,
        purchasedAt: serverTimestamp(),
        ...paymentData
      })
    });
    return true;
  } catch (error) {
    console.error('Error purchasing lesson:', error);
    throw error;
  }
};

export const canAccessLesson = async (studentId, courseId, lessonId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', studentId));
    if (!userDoc.exists()) return false;
    const userData = userDoc.data();

    if (userData.purchasedLessons) {
      return userData.purchasedLessons.some(p => p.lessonId === lessonId && p.courseId === courseId);
    }
    return false;
  } catch (error) {
    console.error('Error checking lesson access:', error);
    return false;
  }
};

export const hasStudentPurchasedLesson = async (studentId, courseId, lessonId) => {
  return canAccessLesson(studentId, courseId, lessonId);
};

// ==================== TEACHER WALLET ====================

export const getTeacherWallet = async (teacherId) => {
  try {
    const walletDoc = await getDoc(doc(db, 'wallets', teacherId));
    if (walletDoc.exists()) {
      return walletDoc.data();
    }
    return {
      teacherId: teacherId,
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: [],
      createdAt: serverTimestamp()
    };
  } catch (error) {
    console.error('Error getting teacher wallet:', error);
    throw error;
  }
};

export const updateTeacherWallet = async (teacherId, walletData) => {
  try {
    await setDoc(doc(db, 'wallets', teacherId), {
      ...walletData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating teacher wallet:', error);
    throw error;
  }
};

export const addTeacherEarnings = async (teacherId, amount, description, lessonDetails = {}) => {
  try {
    const wallet = await getTeacherWallet(teacherId);
    const transaction = {
      id: `txn_${Date.now()}`,
      type: 'credit',
      amount: amount,
      description: description,
      lessonDetails: lessonDetails,
      date: new Date().toISOString(),
      status: 'completed'
    };

    const updatedWallet = {
      ...wallet,
      balance: (wallet.balance || 0) + amount,
      totalEarnings: (wallet.totalEarnings || 0) + amount,
      transactions: [transaction, ...(wallet.transactions || [])]
    };

    await updateTeacherWallet(teacherId, updatedWallet);
    return updatedWallet;
  } catch (error) {
    console.error('Error adding teacher earnings:', error);
    throw error;
  }
};

export const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
  try {
    const wallet = await getTeacherWallet(teacherId);

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance for withdrawal');
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
      date: new Date().toISOString(),
      status: 'pending'
    };

    const updatedWallet = {
      ...wallet,
      balance: wallet.balance - amount,
      pendingWithdrawals: (wallet.pendingWithdrawals || 0) + amount,
      transactions: [transaction, ...(wallet.transactions || [])]
    };

    await updateTeacherWallet(teacherId, updatedWallet);
    return updatedWallet;
  } catch (error) {
    console.error('Error withdrawing from wallet:', error);
    throw error;
  }
};

export const getTeacherPaymentStats = async (teacherId) => {
  try {
    const wallet = await getTeacherWallet(teacherId);
    return {
      totalEarnings: wallet.totalEarnings || 0,
      availableBalance: wallet.balance || 0,
      pendingWithdrawals: wallet.pendingWithdrawals || 0,
      monthlyEarnings: 0,
      totalSales: 0,
      transactionHistory: wallet.transactions?.slice(0, 10) || []
    };
  } catch (error) {
    console.error('Error getting teacher payment stats:', error);
    throw error;
  }
};

// ==================== MULTIMEDIA MANAGEMENT ====================

export const addMultimediaToLesson = async (lessonId, multimediaData) => {
  try {
    await updateDoc(doc(db, 'lessons', lessonId), {
      multimedia: arrayUnion(multimediaData)
    });
    return true;
  } catch (error) {
    console.error('Error adding multimedia to lesson:', error);
    throw error;
  }
};

export const deleteMultimediaFromLesson = async (lessonId, multimediaId) => {
  try {
    const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
    if (!lessonDoc.exists()) throw new Error('Lesson not found');
    const lessonData = lessonDoc.data();
    const updatedMultimedia = lessonData.multimedia?.filter(m => m.id !== multimediaId) || [];
    await updateDoc(doc(db, 'lessons', lessonId), {
      multimedia: updatedMultimedia
    });
    return true;
  } catch (error) {
    console.error('Error deleting multimedia from lesson:', error);
    throw error;
  }
};

// ==================== QUIZ MANAGEMENT ====================

export const addQuizToLesson = async (lessonId, quizData) => {
  try {
    await updateDoc(doc(db, 'lessons', lessonId), {
      quiz: quizData
    });
    return true;
  } catch (error) {
    console.error('Error adding quiz to lesson:', error);
    throw error;
  }
};

export const saveQuizResult = async (studentId, courseId, lessonId, score, passed, totalQuestions) => {
  try {
    const userRef = doc(db, 'users', studentId);
    await updateDoc(userRef, {
      quizResults: arrayUnion({
        courseId,
        lessonId,
        score,
        passed,
        totalQuestions,
        completedAt: new Date().toISOString()
      })
    });
    return true;
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

// ==================== CERTIFICATE FUNCTIONS ====================

export const generateCertificate = async (studentId, courseId, completionDate) => {
  try {
    const certificateId = `cert_${Date.now()}`;
    const certificate = {
      id: certificateId,
      studentId,
      courseId,
      completionDate: completionDate || new Date().toISOString(),
      issuedDate: new Date().toISOString(),
      verificationCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    };

    await updateDoc(doc(db, 'users', studentId), {
      certificates: arrayUnion(certificate)
    });

    return certificate;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
};

export const verifyCertificate = async (certificateId, verificationCode) => {
  try {
    const q = query(collection(db, 'users'), where('certificates.id', '==', certificateId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { valid: false, message: 'Certificate not found' };
    }
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const certificate = userData.certificates?.find(c => c.id === certificateId);

    if (!certificate) {
      return { valid: false, message: 'Certificate not found' };
    }

    if (certificate.verificationCode !== verificationCode) {
      return { valid: false, message: 'Invalid verification code' };
    }

    return {
      valid: true,
      message: 'Certificate verified successfully',
      certificate: certificate
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    throw error;
  }
};

// ==================== COURSE ENROLLMENT ====================

export const enrollStudentInCourse = async (studentId, courseId) => {
  try {
    await updateDoc(doc(db, 'users', studentId), {
      enrolledCourses: arrayUnion(courseId)
    });
    return true;
  } catch (error) {
    console.error('Error enrolling student in course:', error);
    throw error;
  }
};

export const updateCourseProgress = async (studentId, courseId, progress) => {
  try {
    await updateDoc(doc(db, 'users', studentId), {
      [`progress.${courseId}`]: progress
    });
    return true;
  } catch (error) {
    console.error('Error updating course progress:', error);
    throw error;
  }
};

// ==================== PAYMENT TRANSACTIONS ====================

export const processLessonPayment = async (studentId, teacherId, courseId, lessonId, amount) => {
  try {
    const paymentRef = doc(collection(db, 'payments'));
    await setDoc(paymentRef, {
      id: paymentRef.id,
      studentId,
      teacherId,
      courseId,
      lessonId,
      amount,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    await addTeacherEarnings(teacherId, amount * 0.9, `Payment for lesson: ${lessonId}`, {
      courseId,
      lessonId,
      studentId
    });

    await purchaseLesson(studentId, courseId, lessonId, {
      amount,
      paymentId: paymentRef.id
    });

    return paymentRef.id;
  } catch (error) {
    console.error('Error processing lesson payment:', error);
    throw error;
  }
};

// ==================== FILE UPLOAD FUNCTIONS ====================

export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const uploadFileWithProgress = async (file, path, onProgress) => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Error uploading file with progress:', error);
    throw error;
  }
};

export const getFileUrl = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
};

export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// ==================== PLATFORM STATISTICS ====================

export const getPlatformStats = async () => {
  try {
    const usersQuery = await getDocs(collection(db, 'users'));
    const coursesQuery = await getDocs(collection(db, 'courses'));
    const paymentsQuery = await getDocs(collection(db, 'payments'));

    const totalUsers = usersQuery.size;
    const totalCourses = coursesQuery.size;
    const totalPayments = paymentsQuery.size;

    const teachers = usersQuery.docs.filter(doc => doc.data().role === 'teacher').length;
    const students = usersQuery.docs.filter(doc => doc.data().role === 'student').length;

    return {
      totalUsers,
      totalStudents: students,
      totalTeachers: teachers,
      totalCourses,
      totalPayments,
      totalEarnings: paymentsQuery.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0)
    };
  } catch (error) {
    console.error('Error getting platform stats:', error);
    throw error;
  }
};

// ==================== REAL-TIME SUBSCRIPTIONS ====================

export const subscribeToUser = (uid, callback) => {
  const unsubscribe = onSnapshot(doc(db, 'users', uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

export const subscribeToCourse = (courseId, callback) => {
  const unsubscribe = onSnapshot(doc(db, 'courses', courseId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

// ==================== EXPORTS ====================

export {
  auth,
  db,
  storage,
  // Export the new function too
  updateUserProfile
};