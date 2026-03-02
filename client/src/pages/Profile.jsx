import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AiOutlineCamera, AiOutlineSave, AiOutlineGithub, AiOutlineLinkedin, AiOutlineTwitter, AiOutlinePlus, AiOutlineClose, AiOutlineMail, AiOutlineCalendar, AiOutlineIdcard } from 'react-icons/ai';
import { API } from '../api';
import '../styles/Profile.css';

const Profile = () => {
  const { user: authUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    title: '',
    bio: '',
    location: '',
    linkedin: '',
    github: '',
    twitter: '',
    skills: []
  });
  const [newSkill, setNewSkill] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/api/users/me`);
      setProfile(res.data);
      initializeForm(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load profile');
      setLoading(false);
    }
  };

  const initializeForm = (data) => {
    setFormData({
      username: data.username || '',
      title: data.title || '',
      bio: data.bio || '',
      location: data.location || '',
      linkedin: data.socialLinks?.linkedin || '',
      github: data.socialLinks?.github || '',
      twitter: data.socialLinks?.twitter || '',
      skills: data.skills || []
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = document.getElementById('avatar-preview');
        if (img) img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    if (newSkill && !formData.skills.includes(newSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill] });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('title', formData.title);
      data.append('bio', formData.bio);
      data.append('location', formData.location);
      data.append('linkedin', formData.linkedin);
      data.append('github', formData.github);
      data.append('twitter', formData.twitter);
      data.append('skills', JSON.stringify(formData.skills));
      if (previewAvatar) data.append('avatar', previewAvatar);

      const res = await axios.put(`${API}/api/users/profile`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setProfile(res.data);
      setIsEditing(false);
      setPreviewAvatar(null);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error('Failed to save profile');
    }
  };

  if (loading) return <div className="p-4 text-white text-center mt-10">Loading Profile...</div>;

  return (
    <div className="profile-container glass-panel">
      {/* Header Section */}
      <div className="profile-header">

        {/* Avatar */}
        <div className="avatar-section">
          <div className="avatar-wrapper">
            {previewAvatar || profile.avatar ? (
              <img
                id="avatar-preview"
                src={previewAvatar ? URL.createObjectURL(previewAvatar) : `${API}/${profile.avatar}`}
                alt="Profile"
              />
            ) : (
              <div className="avatar-placeholder">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {isEditing && (
            <button
              onClick={() => fileInputRef.current.click()}
              className="btn-upload"
              title="Upload Photo"
            >
              <AiOutlineCamera size={24} />
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        {/* User Info */}
        <div className="info-section">
          <div className="info-header">
            <div style={{ flex: 1 }}>
              {isEditing ? (
                <>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="edit-input"
                    style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
                    placeholder="Full Name"
                  />
                  <input
                    name="title"
                    placeholder="Role / Job Title"
                    value={formData.title}
                    onChange={handleChange}
                    className="edit-input"
                    style={{ fontSize: '1.2rem', color: 'var(--primary)' }}
                  />
                </>
              ) : (
                <>
                  <h1 className="profile-name">{profile.username}</h1>
                  <span className="profile-role">{profile.title || 'Role not set'}</span>
                </>
              )}

              {isEditing ? (
                <input
                  name="location"
                  placeholder="Location (e.g. New York, USA)"
                  value={formData.location}
                  onChange={handleChange}
                  className="edit-input"
                  style={{ marginTop: '0.5rem', width: 'auto' }}
                />
              ) : (
                <p className="profile-location">
                  📍 {profile.location || 'Location not set'}
                </p>
              )}
            </div>

            <button
              onClick={() => isEditing ? handleSubmit({ preventDefault: () => { } }) : setIsEditing(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isEditing ? <><AiOutlineSave size={20} /> Save Changes</> : 'Edit Profile'}
            </button>
          </div>

          {/* Social Links */}
          <div className="social-links">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '500px' }}>
                <div className="social-input-group">
                  <AiOutlineLinkedin size={24} color="#0077b5" />
                  <input name="linkedin" placeholder="LinkedIn Profile URL" value={formData.linkedin} onChange={handleChange} className="edit-input" />
                </div>
                <div className="social-input-group">
                  <AiOutlineGithub size={24} color="#fff" />
                  <input name="github" placeholder="GitHub Profile URL" value={formData.github} onChange={handleChange} className="edit-input" />
                </div>
                <div className="social-input-group">
                  <AiOutlineTwitter size={24} color="#1da1f2" />
                  <input name="twitter" placeholder="Twitter Profile URL" value={formData.twitter} onChange={handleChange} className="edit-input" />
                </div>
              </div>
            ) : (
              <>
                {profile.socialLinks?.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="social-btn" title="LinkedIn"><AiOutlineLinkedin size={24} /></a>}
                {profile.socialLinks?.github && <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="social-btn" title="GitHub"><AiOutlineGithub size={24} /></a>}
                {profile.socialLinks?.twitter && <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="social-btn" title="Twitter"><AiOutlineTwitter size={24} /></a>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="profile-grid">

        {/* Main Info */}
        <div className="section-card">
          <h3>About Me</h3>
          {isEditing ? (
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={8}
              className="edit-input"
              style={{ lineHeight: '1.6', resize: 'vertical', minHeight: '150px' }}
              placeholder="Write a short bio about yourself..."
            />
          ) : (
            <p className="bio-text">
              {profile.bio || "No bio added yet. Click edit to tell us about yourself."}
            </p>
          )}
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Skills */}
          <div className="section-card">
            <h4>Skills & Interests</h4>
            <div className="skills-container">
              {(isEditing ? formData.skills : profile.skills).map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                  {isEditing && (
                    <AiOutlineClose
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => removeSkill(skill)}
                    />
                  )}
                </span>
              ))}

              {isEditing && (
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add new skill..."
                    className="edit-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
                  />
                  <button onClick={handleAddSkill} className="btn-primary" style={{ padding: '0.5rem', minWidth: '40px' }}>
                    <AiOutlinePlus />
                  </button>
                </div>
              )}
            </div>
            {(isEditing ? formData.skills : profile.skills).length === 0 && !isEditing && (
              <p style={{ color: 'var(--text-secondary)' }}>No skills listed.</p>
            )}
          </div>

          {/* Details */}
          <div className="section-card">
            <h4>Personal Details</h4>
            <div className="details-list">
              <div className="detail-item">
                <AiOutlineMail size={20} color="var(--primary)" />
                <span>{profile.email}</span>
              </div>
              <div className="detail-item">
                <AiOutlineCalendar size={20} color="var(--secondary)" />
                <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <AiOutlineIdcard size={20} color="var(--accent)" />
                <span style={{ textTransform: 'capitalize' }}>{profile.role}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
