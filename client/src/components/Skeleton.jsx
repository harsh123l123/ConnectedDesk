import '../styles/Skeleton.css';

// Generic shimmer block
export const Skeleton = ({ width = '100%', height = '1rem', radius = '6px', style = {} }) => (
  <div className="skeleton-shimmer" style={{ width, height, borderRadius: radius, ...style }} />
);

// Stat card skeleton (for Dashboard)
export const StatCardSkeleton = () => (
  <div className="skeleton-stat-card glass-panel">
    <div className="skeleton-icon-box skeleton-shimmer" />
    <div style={{ flex: 1 }}>
      <Skeleton width="60%" height="2rem" radius="8px" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="80%" height="0.9rem" radius="6px" />
    </div>
  </div>
);

// Chat / meeting list item skeleton
export const ListItemSkeleton = () => (
  <div className="skeleton-list-item">
    <div className="skeleton-avatar skeleton-shimmer" />
    <div style={{ flex: 1 }}>
      <Skeleton width="55%" height="0.9rem" radius="6px" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="80%" height="0.75rem" radius="6px" />
    </div>
  </div>
);

// Task card skeleton
export const TaskCardSkeleton = () => (
  <div className="skeleton-task-card glass-panel">
    <Skeleton width="75%" height="1rem" radius="6px" style={{ marginBottom: '0.6rem' }} />
    <Skeleton width="50%" height="0.8rem" radius="6px" style={{ marginBottom: '0.8rem' }} />
    <Skeleton width="35%" height="1.6rem" radius="8px" />
  </div>
);

// Full page loading screen
export const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader-spinner" />
    <p>Loading...</p>
  </div>
);
