import React, { useState, useEffect } from 'react';
import { 
  getPendingTeachers, 
  approveTeacher, 
  rejectTeacher, 
  getAllTeachers,
  getPlatformStats,
  getUsers,
  getStudents,
  getCourses,
  deleteUser,
  updateUser,
  getAllCoursesForAdmin,
  getCourseAnalyticsForAdmin,
  getTeacherWallets,
  updateTeacherWallet,
  getPaymentTransactions,
  savePaymentTransactions,
  saveTeacherWallets
} from '../utils/storage';
import './AdminDashboard.css';

const AdminDashboard = ({ currentUser, setCurrentView }) => {
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [approvedTeachers, setApprovedTeachers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [teacherWallets, setTeacherWallets] = useState({});
  const [paymentTransactions, setPaymentTransactions] = useState({});
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const pending = getPendingTeachers();
    const allTeachers = getAllTeachers();
    const approved = allTeachers.filter(teacher => teacher.isApproved);
    const platformStats = getPlatformStats();
    const users = Object.values(getUsers());
    const courses = Object.values(getAllCoursesForAdmin());
    const wallets = getTeacherWallets();
    const transactions = getPaymentTransactions();

    setPendingTeachers(pending);
    setApprovedTeachers(approved);
    setAllUsers(users);
    setAllCourses(courses);
    setStats(platformStats);
    setTeacherWallets(wallets);
    setPaymentTransactions(transactions);

    // Extract pending withdrawals
    const withdrawals = [];
    Object.values(wallets).forEach(wallet => {
      wallet.transactions.forEach(transaction => {
        if (transaction.type === 'debit' && transaction.status === 'pending') {
          withdrawals.push({
            ...transaction,
            teacherId: wallet.teacherId,
            teacherName: wallet.teacherName
          });
        }
      });
    });
    setPendingWithdrawals(withdrawals);
  };

  const handleApproveTeacher = (teacherId) => {
    setLoading(true);
    try {
      approveTeacher(teacherId);
      loadData(); // Reload data to reflect changes
      alert('Teacher approved successfully! They can now access the teacher dashboard.');
    } catch (error) {
      alert('Error approving teacher: ' + error.message);
    }
    setLoading(false);
  };

  const handleRejectTeacher = (teacherId) => {
    if (window.confirm('Are you sure you want to reject this teacher application? This action cannot be undone.')) {
      setLoading(true);
      try {
        rejectTeacher(teacherId);
        loadData(); // Reload data to reflect changes
        alert('Teacher application rejected.');
      } catch (error) {
        alert('Error rejecting teacher: ' + error.message);
      }
      setLoading(false);
    }
  };

  const handleDismissTeacher = (teacherId) => {
    if (window.confirm('Are you sure you want to dismiss this teacher? They will lose all access to the teacher dashboard.')) {
      setLoading(true);
      try {
        // Update teacher status to not approved
        const users = getUsers();
        if (users[teacherId]) {
          users[teacherId].isApproved = false;
          users[teacherId].dismissedDate = new Date().toISOString();
          // Save updated users
          localStorage.setItem('hausaStem_users', JSON.stringify(users));
        }
        loadData(); // Reload data to reflect changes
        alert('Teacher dismissed successfully.');
      } catch (error) {
        alert('Error dismissing teacher: ' + error.message);
      }
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone and all their data will be lost.')) {
      setLoading(true);
      try {
        deleteUser(userId);
        loadData(); // Reload data to reflect changes
        alert('User deleted successfully.');
      } catch (error) {
        alert('Error deleting user: ' + error.message);
      }
      setLoading(false);
    }
  };

  // NEW: Approve teacher withdrawal
  const handleApproveWithdrawal = (teacherId, transactionId) => {
    if (window.confirm('Are you sure you want to approve this withdrawal? The funds will be transferred to the teacher.')) {
      setLoading(true);
      try {
        const wallets = getTeacherWallets();
        const wallet = wallets[teacherId];
        
        if (wallet) {
          // Find and update the transaction
          const updatedTransactions = wallet.transactions.map(transaction => 
            transaction.id === transactionId 
              ? { ...transaction, status: 'completed', completedAt: new Date().toISOString() }
              : transaction
          );
          
          // Update wallet
          wallets[teacherId] = {
            ...wallet,
            transactions: updatedTransactions,
            pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - transaction.amount),
            updatedAt: new Date().toISOString()
          };
          
          saveTeacherWallets(wallets);
          loadData();
          alert('Withdrawal approved successfully!');
        }
      } catch (error) {
        alert('Error approving withdrawal: ' + error.message);
      }
      setLoading(false);
    }
  };

  // NEW: Reject teacher withdrawal
  const handleRejectWithdrawal = (teacherId, transactionId) => {
    if (window.confirm('Are you sure you want to reject this withdrawal? The funds will be returned to the teacher\'s wallet.')) {
      setLoading(true);
      try {
        const wallets = getTeacherWallets();
        const wallet = wallets[teacherId];
        
        if (wallet) {
          // Find the transaction to get the amount
          const transaction = wallet.transactions.find(t => t.id === transactionId);
          
          // Update transactions and return funds
          const updatedTransactions = wallet.transactions.map(t => 
            t.id === transactionId 
              ? { ...t, status: 'rejected', rejectedAt: new Date().toISOString() }
              : t
          );
          
          wallets[teacherId] = {
            ...wallet,
            balance: wallet.balance + (transaction?.amount || 0),
            pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - (transaction?.amount || 0)),
            transactions: updatedTransactions,
            updatedAt: new Date().toISOString()
          };
          
          saveTeacherWallets(wallets);
          loadData();
          alert('Withdrawal rejected. Funds returned to teacher wallet.');
        }
      } catch (error) {
        alert('Error rejecting withdrawal: ' + error.message);
      }
      setLoading(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
  };

  const handleCloseUserDetails = () => {
    setSelectedUser(null);
  };

  const handleManageCourses = () => {
    setCurrentView('admin-courses');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₦${amount?.toLocaleString() || '0'}`;
  };

  const getUserRoleBadge = (user) => {
    if (user.role === 'admin') {
      return <span className="role-badge admin">Admin</span>;
    } else if (user.role === 'teacher') {
      return user.isApproved ? 
        <span className="role-badge teacher">Teacher</span> :
        <span className="role-badge pending">Pending Teacher</span>;
    } else {
      return <span className="role-badge student">Student</span>;
    }
  };

  // Get top courses by enrollment
  const getTopCourses = () => {
    const coursesWithAnalytics = allCourses.map(course => {
      try {
        const analytics = getCourseAnalyticsForAdmin(course.key);
        return { ...course, analytics };
      } catch (error) {
        return { ...course, analytics: { totalEnrolled: 0 } };
      }
    });

    return coursesWithAnalytics
      .sort((a, b) => (b.analytics?.totalEnrolled || 0) - (a.analytics?.totalEnrolled || 0))
      .slice(0, 5);
  };

  // Calculate total platform earnings
  const calculatePlatformEarnings = () => {
    let total = 0;
    Object.values(teacherWallets).forEach(wallet => {
      wallet.transactions.forEach(transaction => {
        if (transaction.type === 'credit') {
          // Platform fee is 10% (teacher gets 90%)
          total += transaction.amount * 0.1;
        }
      });
    });
    return total;
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {currentUser?.name}</p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          key="manage-courses"
          className="action-btn primary"
          onClick={handleManageCourses}
        >
          📚 Manage All Courses
        </button>
        <button 
          key="review-teachers"
          className="action-btn secondary"
          onClick={() => setActiveTab('pending')}
        >
          👨‍🏫 Review Teacher Requests ({pendingTeachers.length})
        </button>
        <button 
          key="payment-approvals"
          className="action-btn secondary"
          onClick={() => setActiveTab('payments')}
        >
          💰 Payment Approvals ({pendingWithdrawals.length})
        </button>
        <button 
          key="view-users"
          className="action-btn secondary"
          onClick={() => setActiveTab('users')}
        >
          👥 View All Users ({allUsers.length})
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div key="stat-students" className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.totalStudents || 0}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div key="stat-teachers" className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-info">
            <h3>{approvedTeachers.length}</h3>
            <p>Approved Teachers</p>
          </div>
        </div>
        <div key="stat-earnings" className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>{formatCurrency(calculatePlatformEarnings())}</h3>
            <p>Platform Earnings</p>
          </div>
        </div>
        <div key="stat-pending" className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{pendingWithdrawals.length}</h3>
            <p>Pending Payments</p>
          </div>
        </div>
      </div>

      {/* Overview Tab - Show by default */}
      {activeTab === 'overview' && (
        <div className="overview-tab" key="overview-tab">
          <div className="overview-grid">
            {/* Top Courses Section */}
            <div className="overview-card" key="top-courses">
              <h3>📊 Top Courses by Enrollment</h3>
              <div className="courses-list">
                {getTopCourses().map((course, index) => (
                  <div key={course.key || `course-${index}`} className="course-item">
                    <div className="course-rank">#{index + 1}</div>
                    <div className="course-info">
                      <div className="course-title">{course.title}</div>
                      <div className="course-meta">
                        <span>By: {course.teacherName}</span>
                        <span>•</span>
                        <span>{course.analytics?.totalEnrolled || 0} students</span>
                      </div>
                    </div>
                    <div className="course-actions">
                      <button 
                        className="btn-view-small"
                        onClick={handleManageCourses}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="overview-card" key="recent-activity">
              <h3>🔄 Recent Activity</h3>
              <div className="activity-list">
                <div key="activity-teachers" className="activity-item">
                  <div className="activity-icon">👨‍🏫</div>
                  <div className="activity-info">
                    <div className="activity-title">Teacher Applications</div>
                    <div className="activity-desc">
                      {pendingTeachers.length} pending review
                    </div>
                  </div>
                </div>
                <div key="activity-payments" className="activity-item">
                  <div className="activity-icon">💰</div>
                  <div className="activity-info">
                    <div className="activity-title">Payment Approvals</div>
                    <div className="activity-desc">
                      {pendingWithdrawals.length} withdrawals pending
                    </div>
                  </div>
                </div>
                <div key="activity-courses" className="activity-item">
                  <div className="activity-icon">📚</div>
                  <div className="activity-info">
                    <div className="activity-title">Course Management</div>
                    <div className="activity-desc">
                      {allCourses.length} total courses available
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Section */}
            <div className="overview-card" key="quick-stats">
              <h3>📈 Platform Statistics</h3>
              <div className="stats-list">
                <div key="stat-total-lessons" className="stat-item">
                  <span className="stat-label">Total Lessons:</span>
                  <span className="stat-value">{stats.totalLessons || 0}</span>
                </div>
                <div key="stat-completed-lessons" className="stat-item">
                  <span className="stat-label">Completed Lessons:</span>
                  <span className="stat-value">{stats.totalCompletedLessons || 0}</span>
                </div>
                <div key="stat-platform-revenue" className="stat-item">
                  <span className="stat-label">Platform Revenue:</span>
                  <span className="stat-value">{formatCurrency(calculatePlatformEarnings())}</span>
                </div>
                <div key="stat-pending-payments" className="stat-item">
                  <span className="stat-label">Pending Payments:</span>
                  <span className="stat-value">{pendingWithdrawals.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Payment Approvals Tab */}
      {activeTab === 'payments' && (
        <div className="tab-content" key="payments-tab">
          <div className="section-header">
            <h2>💰 Payment Approvals</h2>
            <p>Review and approve teacher withdrawal requests</p>
          </div>

          {pendingWithdrawals.length === 0 ? (
            <div className="empty-state" key="empty-payments">
              <div className="empty-icon">✅</div>
              <h3>No Pending Payments</h3>
              <p>All withdrawal requests have been processed.</p>
            </div>
          ) : (
            <div className="payments-grid">
              {pendingWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id || `withdrawal-${withdrawal.teacherId}-${withdrawal.date}`} className="payment-card">
                  <div className="payment-header">
                    <div className="payment-teacher">
                      <div className="teacher-avatar">
                        {withdrawal.teacherName?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div className="teacher-info">
                        <h4>{withdrawal.teacherName}</h4>
                        <p className="teacher-id">ID: {withdrawal.teacherId}</p>
                      </div>
                    </div>
                    <div className="payment-amount">
                      <span className="amount">{formatCurrency(withdrawal.amount)}</span>
                      <span className="status pending">Pending</span>
                    </div>
                  </div>

                  <div className="payment-details">
                    <div key={`bank-${withdrawal.id}`} className="detail-row">
                      <label>Bank Name:</label>
                      <span>{withdrawal.bankDetails?.bankName || 'N/A'}</span>
                    </div>
                    <div key={`account-${withdrawal.id}`} className="detail-row">
                      <label>Account Number:</label>
                      <span>{withdrawal.bankDetails?.accountNumber || 'N/A'}</span>
                    </div>
                    <div key={`name-${withdrawal.id}`} className="detail-row">
                      <label>Account Name:</label>
                      <span>{withdrawal.bankDetails?.accountName || 'N/A'}</span>
                    </div>
                    <div key={`date-${withdrawal.id}`} className="detail-row">
                      <label>Request Date:</label>
                      <span>{formatDate(withdrawal.date)}</span>
                    </div>
                    <div key={`desc-${withdrawal.id}`} className="detail-row">
                      <label>Description:</label>
                      <span>{withdrawal.description}</span>
                    </div>
                  </div>

                  <div className="payment-actions">
                    <button 
                      className="btn-approve"
                      onClick={() => handleApproveWithdrawal(withdrawal.teacherId, withdrawal.id)}
                      disabled={loading}
                    >
                      ✅ Approve Payment
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleRejectWithdrawal(withdrawal.teacherId, withdrawal.id)}
                      disabled={loading}
                    >
                      ❌ Reject Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Teacher Wallet Summary */}
          <div className="wallet-summary-section" key="wallet-summary">
            <h3>📊 Teacher Wallet Summary</h3>
            <div className="wallets-grid">
              {Object.values(teacherWallets).map(wallet => (
                <div key={wallet.teacherId || `wallet-${wallet.teacherName}`} className="wallet-summary-card">
                  <div className="wallet-header">
                    <h4>{wallet.teacherName}</h4>
                    <span className="wallet-id">ID: {wallet.teacherId}</span>
                  </div>
                  <div className="wallet-balances">
                    <div key={`balance-${wallet.teacherId}`} className="balance-item">
                      <span className="label">Available:</span>
                      <span className="value">{formatCurrency(wallet.balance)}</span>
                    </div>
                    <div key={`earnings-${wallet.teacherId}`} className="balance-item">
                      <span className="label">Total Earnings:</span>
                      <span className="value">{formatCurrency(wallet.totalEarnings)}</span>
                    </div>
                    <div key={`pending-${wallet.teacherId}`} className="balance-item">
                      <span className="label">Pending Withdrawals:</span>
                      <span className="value">{formatCurrency(wallet.pendingWithdrawals)}</span>
                    </div>
                  </div>
                  <div className="wallet-transactions">
                    <span className="transactions-count">
                      {wallet.transactions?.length || 0} transactions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Management Section */}
      <div className="management-section" key="management-section">
        <div className="section-header">
          <h2>User Management</h2>
          <div className="tab-buttons">
            <button 
              key="tab-overview"
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              key="tab-payments"
              className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              💰 Payments ({pendingWithdrawals.length})
            </button>
            <button 
              key="tab-pending"
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Teachers ({pendingTeachers.length})
            </button>
            <button 
              key="tab-teachers"
              className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
              onClick={() => setActiveTab('teachers')}
            >
              Approved Teachers ({approvedTeachers.length})
            </button>
            <button 
              key="tab-users"
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              All Users ({allUsers.length})
            </button>
          </div>
        </div>

        {/* Pending Teachers Tab */}
        {activeTab === 'pending' && (
          <div className="tab-content" key="pending-tab">
            {pendingTeachers.length === 0 ? (
              <div className="empty-state" key="empty-pending">
                <div className="empty-icon">✅</div>
                <h3>No Pending Requests</h3>
                <p>All teacher applications have been reviewed.</p>
              </div>
            ) : (
              <div className="users-grid">
                {pendingTeachers.map(teacher => (
                  <div key={teacher.id || teacher.email} className="user-card pending">
                    <div className="user-header">
                      <div className="user-avatar">
                        {teacher.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="user-info">
                        <h4>{teacher.name}</h4>
                        <p className="user-email">{teacher.email}</p>
                        <p className="user-specialization">{teacher.specialization}</p>
                      </div>
                      {getUserRoleBadge(teacher)}
                    </div>

                    <div className="user-bio">
                      <p>{teacher.bio || 'No bio provided.'}</p>
                    </div>

                    <div className="user-meta">
                      <div className="meta-item">
                        <span className="meta-label">Applied:</span>
                        <span className="meta-value">{formatDate(teacher.joinedDate)}</span>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button 
                        className="btn-approve"
                        onClick={() => handleApproveTeacher(teacher.id)}
                        disabled={loading}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleRejectTeacher(teacher.id)}
                        disabled={loading}
                      >
                        ❌ Reject
                      </button>
                      <button 
                        className="btn-view"
                        onClick={() => handleViewUser(teacher)}
                      >
                        👁 View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approved Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="tab-content" key="teachers-tab">
            {approvedTeachers.length === 0 ? (
              <div className="empty-state" key="empty-teachers">
                <div className="empty-icon">👨‍🏫</div>
                <h3>No Approved Teachers</h3>
                <p>Approved teachers will appear here.</p>
              </div>
            ) : (
              <div className="users-grid">
                {approvedTeachers.map(teacher => (
                  <div key={teacher.id || teacher.email} className="user-card approved">
                    <div className="user-header">
                      <div className="user-avatar approved">
                        {teacher.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="user-info">
                        <h4>{teacher.name}</h4>
                        <p className="user-email">{teacher.email}</p>
                        <p className="user-specialization">{teacher.specialization}</p>
                      </div>
                      {getUserRoleBadge(teacher)}
                    </div>

                    <div className="user-bio">
                      <p>{teacher.bio || 'No bio provided.'}</p>
                    </div>

                    <div className="user-meta">
                      <div className="meta-item">
                        <span className="meta-label">Approved:</span>
                        <span className="meta-value">
                          {teacher.approvedDate ? formatDate(teacher.approvedDate) : 'N/A'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Courses:</span>
                        <span className="meta-value">{teacher.courses?.length || 0}</span>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button 
                        className="btn-dismiss"
                        onClick={() => handleDismissTeacher(teacher.id)}
                        disabled={loading}
                      >
                        🚫 Dismiss
                      </button>
                      <button 
                        className="btn-view"
                        onClick={() => handleViewUser(teacher)}
                      >
                        👁 View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Users Tab */}
        {activeTab === 'users' && (
          <div className="tab-content" key="users-tab">
            {allUsers.length === 0 ? (
              <div className="empty-state" key="empty-users">
                <div className="empty-icon">👥</div>
                <h3>No Users</h3>
                <p>No users found in the system.</p>
              </div>
            ) : (
              <div className="users-table-container" key="users-table">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(user => (
                      <tr key={user.id || user.email} className="user-row">
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar small">
                              {user.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="user-details">
                              <div className="user-name">{user.name}</div>
                              <div className="user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {getUserRoleBadge(user)}
                        </td>
                        <td>
                          {user.role === 'teacher' ? (
                            user.isApproved ? 'Approved' : 'Pending'
                          ) : (
                            'Active'
                          )}
                        </td>
                        <td>
                          {formatDate(user.joinedDate)}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              key={`view-${user.id}`}
                              className="btn-view"
                              onClick={() => handleViewUser(user)}
                            >
                              View
                            </button>
                            {user.id !== currentUser.id && user.role !== 'admin' && (
                              <button 
                                key={`delete-${user.id}`}
                                className="btn-delete"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={loading}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" key="user-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={handleCloseUserDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-section">
                <div key={`detail-name-${selectedUser.id}`} className="detail-row">
                  <label>Name:</label>
                  <span>{selectedUser.name}</span>
                </div>
                <div key={`detail-email-${selectedUser.id}`} className="detail-row">
                  <label>Email:</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div key={`detail-role-${selectedUser.id}`} className="detail-row">
                  <label>Role:</label>
                  <span>{getUserRoleBadge(selectedUser)}</span>
                </div>
                <div key={`detail-joined-${selectedUser.id}`} className="detail-row">
                  <label>Joined Date:</label>
                  <span>{formatDate(selectedUser.joinedDate)}</span>
                </div>
                {selectedUser.role === 'teacher' && (
                  <>
                    <div key={`detail-spec-${selectedUser.id}`} className="detail-row">
                      <label>Specialization:</label>
                      <span>{selectedUser.specialization || 'N/A'}</span>
                    </div>
                    <div key={`detail-status-${selectedUser.id}`} className="detail-row">
                      <label>Status:</label>
                      <span>{selectedUser.isApproved ? 'Approved' : 'Pending Approval'}</span>
                    </div>
                    {selectedUser.approvedDate && (
                      <div key={`detail-approved-${selectedUser.id}`} className="detail-row">
                        <label>Approved Date:</label>
                        <span>{formatDate(selectedUser.approvedDate)}</span>
                      </div>
                    )}
                    <div key={`detail-bio-${selectedUser.id}`} className="detail-row">
                      <label>Bio:</label>
                      <span>{selectedUser.bio || 'No bio provided'}</span>
                    </div>
                  </>
                )}
                {selectedUser.role === 'student' && (
                  <>
                    <div key={`detail-level-${selectedUser.id}`} className="detail-row">
                      <label>Level:</label>
                      <span>{selectedUser.level || 'Beginner'}</span>
                    </div>
                    <div key={`detail-points-${selectedUser.id}`} className="detail-row">
                      <label>Points:</label>
                      <span>{selectedUser.points || 0}</span>
                    </div>
                    <div key={`detail-courses-${selectedUser.id}`} className="detail-row">
                      <label>Enrolled Courses:</label>
                      <span>{selectedUser.enrolledCourses?.length || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-close" onClick={handleCloseUserDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;