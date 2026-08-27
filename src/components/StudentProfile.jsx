// src/components/StudentProfile.jsx

import React, { useState, useEffect } from 'react';
import {
  getCurrentUser,
  updateUserDataInFirestore, // ✅ Canja zuwa wannan
  uploadFile
} from '../firebase/storageService';
import './StudentProfile.css';

const StudentProfile = ({ student, setStudent }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // ==================== INITIALIZE FORM ====================

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.displayName || student.name || '',
        email: student.email || '',
        level: student.level || 'Beginner',
        bio: student.bio || '',
        phone: student.phone || '',
        location: student.location || '',
        interests: student.interests || ''
      });

      setImagePreview(
        student.photoURL ||
        student.profileImage ||
        null
      );

      setProfileImage(null);
    }
  }, [student]);

  // ==================== HANDLE FORM SUBMIT ====================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        throw new Error('Please log in to update your profile.');
      }

      if (student?.uid && currentUser.uid !== student.uid) {
        throw new Error('You are not authorized to update this profile.');
      }

      // ==================== PROFILE DATA ====================

      const profileData = {
        displayName: formData.name?.trim() || '',
        name: formData.name?.trim() || '',
        level: formData.level || 'Beginner',
        bio: formData.bio?.trim() || '',
        phone: formData.phone?.trim() || '',
        location: formData.location?.trim() || '',
        interests: formData.interests?.trim() || ''
      };

      // ==================== PROFILE IMAGE ====================

      if (profileImage instanceof File) {
        setIsUploading(true);

        const filePath = `profiles/${currentUser.uid}/profile.jpg`;

        const imageUrl = await uploadFile(
          profileImage,
          filePath
        );

        profileData.photoURL = imageUrl;
        profileData.profileImage = imageUrl;

        setImagePreview(imageUrl);
      }

      // ==================== UPDATE FIRESTORE ====================

      // ✅ Yi amfani da updateUserDataInFirestore
      await updateUserDataInFirestore(
        currentUser.uid,
        profileData
      );

      // ==================== UPDATE LOCAL STATE ====================

      const updatedStudent = {
        ...student,
        displayName: profileData.displayName,
        name: profileData.name,
        level: profileData.level,
        bio: profileData.bio,
        phone: profileData.phone,
        location: profileData.location,
        interests: profileData.interests,
        photoURL: profileData.photoURL || student.photoURL || null,
        profileImage: profileData.profileImage || student.profileImage || null
      };

      setStudent(updatedStudent);
      setProfileImage(null);

      setMessage('✅ Profile updated successfully!');
      setIsEditing(false);

      setTimeout(() => {
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  // ==================== HANDLE INPUT CHANGE ====================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ==================== HANDLE IMAGE CHANGE ====================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      e.target.value = '';
      return;
    }

    setProfileImage(file);
    setIsUploading(true);

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result);
      setIsUploading(false);
    };

    reader.onerror = () => {
      setError('Failed to load image.');
      setIsUploading(false);
      setProfileImage(null);
    };

    reader.readAsDataURL(file);
  };

  // ==================== CANCEL EDIT ====================

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setMessage('');
    setProfileImage(null);

    if (student) {
      setFormData({
        name: student.displayName || student.name || '',
        email: student.email || '',
        level: student.level || 'Beginner',
        bio: student.bio || '',
        phone: student.phone || '',
        location: student.location || '',
        interests: student.interests || ''
      });

      setImagePreview(student.photoURL || student.profileImage || null);
    }
  };

  // ==================== SAFETY CHECK ====================

  if (!student) {
    return (
      <div className="student-profile">
        <h2>Student Profile</h2>
        <div className="loading-state">Loading profile...</div>
      </div>
    );
  }

  // ==================== PROGRESS ====================

  const progress = student.progress || {};
  const progressValues = Object.values(progress);

  const totalProgress =
    progressValues.length > 0
      ? progressValues.reduce((total, value) => total + Number(value || 0), 0) / progressValues.length
      : 0;

  const completedLessons = student.completedLessons?.length || 0;
  const totalLessons = progressValues.length * 3;

  // ==================== INITIALS ====================

  const getInitials = () => {
    const name = student.displayName || student.name || '';
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ==================== RENDER ====================

  return (
    <div className="student-profile">

      {/* HEADER */}
      <div className="profile-header">
        <h2>👤 Student Profile</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setError('');
              setMessage('');
              setIsEditing(true);
            }}
            className="edit-profile-btn"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button type="button" className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className="profile-view">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="avatar-image" />
              ) : (
                <span className="avatar-text">{getInitials()}</span>
              )}
            </div>
            <div className="profile-name-section">
              <h3>{student.displayName || student.name || 'Student'}</h3>
              <p className="profile-email">{student.email}</p>
              {student.bio && <p className="profile-bio">{student.bio}</p>}
            </div>
          </div>

          {/* DETAILS GRID */}
          <div className="profile-details-grid">
            <div className="detail-card">
              <div className="detail-icon">📚</div>
              <div className="detail-content">
                <span className="detail-label">Level</span>
                <span className="detail-value">{student.level || 'Beginner'}</span>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-icon">📊</div>
              <div className="detail-content">
                <span className="detail-label">Overall Progress</span>
                <span className="detail-value">{totalProgress.toFixed(1)}%</span>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-icon">✅</div>
              <div className="detail-content">
                <span className="detail-label">Completed Lessons</span>
                <span className="detail-value">{completedLessons} / {totalLessons}</span>
              </div>
            </div>
            <div className="detail-card">
              <div className="detail-icon">🏅</div>
              <div className="detail-content">
                <span className="detail-label">Points</span>
                <span className="detail-value">{student.points || 0}</span>
              </div>
            </div>
          </div>

          {/* BIO */}
          {student.bio && (
            <div className="bio-section">
              <h4>About Me</h4>
              <p>{student.bio}</p>
            </div>
          )}

          {/* INTERESTS */}
          {student.interests && (
            <div className="interests-section">
              <h4>Interests</h4>
              <div className="interests-tags">
                {student.interests.split(',').map((interest, index) => (
                  <span key={index} className="interest-tag">{interest.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {/* COURSE PROGRESS */}
          <div className="progress-section">
            <h3>📈 Course Progress</h3>
            {Object.entries(progress).length === 0 ? (
              <p>No course progress yet.</p>
            ) : (
              Object.entries(progress).map(([courseKey, courseProgress]) => (
                <div key={courseKey} className="progress-item">
                  <div className="progress-label">
                    <span>{courseKey.charAt(0).toUpperCase() + courseKey.slice(1)}</span>
                    <span>{Number(courseProgress || 0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(courseProgress || 0)))}%`
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* BADGES */}
          {student.badges && student.badges.length > 0 && (
            <div className="badges-section">
              <h3>🏅 Achievements</h3>
              <div className="badges-list">
                {student.badges.map((badge, index) => (
                  <div key={index} className="badge-item">
                    <span className="badge-icon">🏅</span>
                    <span className="badge-name">{badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* META */}
          <div className="profile-meta">
            <p className="meta-item">
              <span className="meta-label">Member since:</span>
              <span className="meta-value">
                {student.joinedDate
                  ? new Date(student.joinedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </span>
            </p>
            {student.phone && (
              <p className="meta-item">
                <span className="meta-label">Phone:</span>
                <span className="meta-value">{student.phone}</span>
              </p>
            )}
            {student.location && (
              <p className="meta-item">
                <span className="meta-label">Location:</span>
                <span className="meta-value">{student.location}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        // EDIT MODE
        <form onSubmit={handleSubmit} className="profile-form">
          {/* PROFILE IMAGE */}
          <div className="form-group">
            <label>Profile Image</label>
            <div className="image-upload-container">
              <div className="image-preview-wrapper">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile preview" className="image-preview" />
                ) : (
                  <div className="image-placeholder">
                    <span className="placeholder-icon">📷</span>
                    <span>No image</span>
                  </div>
                )}
                <label className="image-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading || isUploading}
                    className="image-input"
                  />
                  {isUploading ? 'Processing...' : 'Change Photo'}
                </label>
              </div>
            </div>
          </div>

          {/* NAME */}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Enter your full name"
            />
          </div>

          {/* EMAIL */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              required
              disabled
              placeholder="Your email"
            />
            <small className="help-text">Email cannot be changed</small>
          </div>

          {/* LEVEL */}
          <div className="form-group">
            <label htmlFor="level">Level</label>
            <select
              id="level"
              name="level"
              value={formData.level || 'Beginner'}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          {/* BIO */}
          <div className="form-group">
            <label htmlFor="bio">About Me</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>

          {/* PHONE */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your phone number"
            />
          </div>

          {/* LOCATION */}
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="Enter your location"
            />
          </div>

          {/* INTERESTS */}
          <div className="form-group">
            <label htmlFor="interests">Interests</label>
            <input
              type="text"
              id="interests"
              name="interests"
              value={formData.interests || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., Web Development, Python, AI"
            />
            <small className="help-text">Separate interests with commas</small>
          </div>

          {/* ACTIONS */}
          <div className="form-actions">
            <button type="submit" className="save-btn" disabled={loading || isUploading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                '💾 Save Changes'
              )}
            </button>
            <button type="button" onClick={handleCancel} className="cancel-btn" disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StudentProfile;