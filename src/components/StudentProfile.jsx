import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateUserProfile } from '../firebase/storageService';
import './StudentProfile.css';

const StudentProfile = ({ student, setStudent }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Initialize formData when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        level: student.level || 'Beginner',
        bio: student.bio || '',
        phone: student.phone || '',
        location: student.location || '',
        interests: student.interests || ''
      });
      if (student.profileImage) {
        setImagePreview(student.profileImage);
      }
    }
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('Please log in to update your profile');
      }

      // Update in Firebase
      await updateUserProfile(currentUser.uid, {
        name: formData.name,
        level: formData.level,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        interests: formData.interests,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setStudent({
        ...student,
        name: formData.name,
        level: formData.level,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        interests: formData.interests
      });

      setMessage('✅ Profile updated successfully!');
      setIsEditing(false);

      // Auto-hide message after 3 seconds
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setMessage('');
    // Reset form data
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        level: student.level || 'Beginner',
        bio: student.bio || '',
        phone: student.phone || '',
        location: student.location || '',
        interests: student.interests || ''
      });
    }
  };

  // Add safety checks for student
  if (!student) {
    return (
      <div className="student-profile">
        <h2>Student Profile</h2>
        <div className="loading-state">Loading profile...</div>
      </div>
    );
  }

  const progress = student.progress || {};
  const totalProgress = Object.values(progress).length > 0 
    ? Object.values(progress).reduce((a, b) => a + b, 0) / Object.values(progress).length 
    : 0;

  const completedLessons = student.completedLessons?.length || 0;
  const totalLessons = Object.values(progress).length * 3; // Assuming each course has 3 lessons

  // Get initials for avatar
  const getInitials = () => {
    if (!student.name) return '?';
    return student.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="student-profile">
      <div className="profile-header">
        <h2>👤 Student Profile</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="edit-profile-btn">
            ✏️ Edit Profile
          </button>
        )}
      </div>

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
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {!isEditing ? (
        // View Mode
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
              <h3>{student.name}</h3>
              <p className="profile-email">{student.email}</p>
              {student.bio && <p className="profile-bio">{student.bio}</p>}
            </div>
          </div>

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

          {student.bio && (
            <div className="bio-section">
              <h4>About Me</h4>
              <p>{student.bio}</p>
            </div>
          )}

          {student.interests && (
            <div className="interests-section">
              <h4>Interests</h4>
              <div className="interests-tags">
                {student.interests.split(',').map((interest, index) => (
                  <span key={index} className="interest-tag">
                    {interest.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="progress-section">
            <h3>📈 Course Progress</h3>
            <div className="progress-item">
              <div className="progress-label">
                <span>Web Development</span>
                <span>{progress.webDevelopment || 0}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${progress.webDevelopment || 0}%`}}
                ></div>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-label">
                <span>Python</span>
                <span>{progress.python || 0}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${progress.python || 0}%`}}
                ></div>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-label">
                <span>Mathematics</span>
                <span>{progress.mathematics || 0}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${progress.mathematics || 0}%`}}
                ></div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
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
        // Edit Mode
        <form onSubmit={handleSubmit} className="profile-form">
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

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              required
              disabled={true} // Email cannot be changed in demo
              placeholder="Enter your email"
            />
            <small className="help-text">Email cannot be changed</small>
          </div>

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

          <div className="form-group">
            <label htmlFor="interests">Interests</label>
            <input
              type="text"
              id="interests"
              name="interests"
              value={formData.interests || ''}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g., Web Development, Python, AI (comma separated)"
            />
            <small className="help-text">Separate interests with commas</small>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                '💾 Save Changes'
              )}
            </button>
            <button 
              type="button" 
              onClick={handleCancel} 
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StudentProfile;
