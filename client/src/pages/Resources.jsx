import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AiOutlineCloudUpload, AiOutlineFile, AiOutlineDelete, AiOutlineDownload, AiOutlineFolder, AiOutlineTag, AiOutlineEye, AiOutlineClose } from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../api';
import '../styles/Resources.css';

const Resources = () => {
  const { user } = useContext(AuthContext);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState('General');
  const [tags, setTags] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [activeTag, setActiveTag] = useState('All');
  const [previewFile, setPreviewFile] = useState(null);


  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data } = await axios.get(`${API}/api/resources`);
      setResources(data);
    } catch (error) {
      toast.error('Failed to load resources');
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadResource = async (e) => {
    e.preventDefault();
    if (!title || !selectedFile) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', selectedFile);
    formData.append('folder', folder);
    formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(t => t)));

    try {
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      const { data } = await axios.post(`${API}/api/resources`, formData, config);
      setResources([data, ...resources]);
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setFolder('General');
      setTags('');
      setSelectedFile(null);
      toast.success('File uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
  };


  const folders = ['All', ...new Set(resources.map(r => r.folder).filter(Boolean))];
  const allTags = ['All', ...new Set(resources.flatMap(r => r.tags || []))];

  const filteredResources = resources.filter(res => {
    const folderMatch = activeFolder === 'All' || res.folder === activeFolder;
    const tagMatch = activeTag === 'All' || (res.tags && res.tags.includes(activeTag));
    return folderMatch && tagMatch;
  });

  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return { icon: <AiOutlineFile />, color: '#ef4444' };
    if (type?.includes('image')) return { icon: <AiOutlineFile />, color: '#10b981' };
    if (type?.includes('zip') || type?.includes('rar')) return { icon: <AiOutlineFile />, color: '#f59e0b' };
    return { icon: <AiOutlineFile />, color: 'var(--primary)' };
  };

  const openPreview = (res) => {
    const isImage = res.fileType?.includes('image');
    const isPDF = res.fileType?.includes('pdf');
    if (isImage || isPDF) {
      setPreviewFile(res);
    } else {
      window.open(`${API}/${res.fileUrl}`, '_blank');
    }
  };

  const deleteResource = async (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p style={{ margin: '0 0 0.5rem' }}>Delete this file?</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={async () => {
                closeToast();
                try {
                  await axios.delete(`${API}/api/resources/${id}`);
                  setResources(prev => prev.filter(r => r._id !== id));
                  toast.success('File deleted');
                } catch (error) {
                  toast.error('Failed to delete file');
                }
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >Delete</button>
            <button onClick={closeToast} style={{ background: '#374151', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ),
      { autoClose: false, closeButton: false }
    );
  };



  return (
    <div className="resources-container">
      <div className="resources-header">
        <div>
          <h2 className="resources-title">Shared Drive</h2>
          <p>Repository for team documents and files.</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowUploadModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <AiOutlineCloudUpload size={20} /> Upload File
        </button>
      </div>

      <div className="resources-layout">
        <aside className="resources-sidebar glass-panel">
          <div className="sidebar-section">
            <h4><AiOutlineFolder /> Folders</h4>
            <div className="filter-list">
              {folders.map(f => (
                <button
                  key={f}
                  className={`filter-btn ${activeFolder === f ? 'active' : ''}`}
                  onClick={() => setActiveFolder(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-section">
            <h4><AiOutlineTag /> Tags</h4>
            <div className="filter-list tags">
              {allTags.map(t => (
                <button
                  key={t}
                  className={`tag-filter-btn ${activeTag === t ? 'active' : ''}`}
                  onClick={() => setActiveTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="resources-main">
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>Loading resources...</div>
          ) : (
            <motion.div layout className="resources-grid">
              <AnimatePresence>
                {filteredResources.map(resource => (
                  <motion.div
                    key={resource._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="resource-card-premium"
                  >
                    <div className="card-top" onClick={() => openPreview(resource)}>
                      <div className="file-preview-mini">
                        {getFileIcon(resource.fileType).icon}
                      </div>
                      <div className="file-meta">
                        <h4 title={resource.title}>{resource.title}</h4>
                        <span>{resource.folder} • {new Date(resource.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="card-quick-actions">
                        <button className="preview-trigger" title="Preview"><AiOutlineEye /></button>
                      </div>
                    </div>

                    <div className="card-body">
                      <p>{resource.description || "No description provided."}</p>
                      <div className="card-tags">
                        {resource.tags?.map(t => <span key={t} className="tag-badge">{t}</span>)}
                      </div>
                    </div>

                    <div className="card-bottom">
                      <div className="uploader-box">
                        <div className="mini-avatar">
                          {resource.uploadedBy?.username?.[0]?.toUpperCase()}
                        </div>
                        <span>{resource.uploadedBy?.username}</span>
                      </div>
                      <div className="action-row">
                        <a href={`${API}/${resource.fileUrl}`} download className="act-btn"><AiOutlineDownload /></a>
                        {user?._id === resource.uploadedBy?._id && (
                          <button onClick={() => deleteResource(resource._id)} className="act-btn delete"><AiOutlineDelete /></button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="modal-content"
          >
            <h3 className="modal-title">Upload File</h3>
            <form onSubmit={uploadResource} className="upload-form">
              <label htmlFor="res-title" style={{ display: 'block', marginBottom: 5, fontSize: '0.9rem' }}>Title</label>
              <input
                id="res-title"
                required
                placeholder="File Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
              <label htmlFor="res-desc" style={{ display: 'block', marginBottom: 5, fontSize: '0.9rem', marginTop: 10 }}>Description</label>
              <textarea
                id="res-desc"
                placeholder="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
              <div className="form-row">
                <div className="form-group">
                  <label>Folder</label>
                  <input placeholder="e.g. Design, Invoices" value={folder} onChange={e => setFolder(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Tags (comma separated)</label>
                  <input placeholder="e.g. priority, final, v1" value={tags} onChange={e => setTags(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="drop-zone">
                <label htmlFor="file-upload" className="drop-label" aria-label="Upload file"></label>
                <input id="file-upload" type="file" required onChange={handleFileSelect} className="file-input-hidden" />
                <div className="drop-content">
                  <AiOutlineCloudUpload size={48} color="var(--primary)" />
                  <span style={{ fontWeight: 500 }}>{selectedFile ? selectedFile.name : "Drag & Drop or Browse"}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-primary btn-upload">Upload</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Quick Preview Modal */}
      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="preview-content" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFile.title}</h3>
              <button onClick={() => setPreviewFile(null)} className="close-preview"><AiOutlineClose /></button>
            </div>
            <div className="preview-body">
              {previewFile.fileType?.includes('image') ? (
                <img src={`${API}/${previewFile.fileUrl}`} alt="Preview" />
              ) : (
                <iframe src={`${API}/${previewFile.fileUrl}`} title="PDF Preview" />
              )}
            </div>
            <div className="preview-footer">
              <a href={`${API}/${previewFile.fileUrl}`} download className="btn-primary">Download File</a>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Resources;
