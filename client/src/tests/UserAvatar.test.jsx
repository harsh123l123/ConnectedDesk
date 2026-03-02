import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserAvatar from '../components/UserAvatar';
import { AuthContext } from '../context/AuthContext';

describe('UserAvatar', () => {
  const mockUser = { _id: 'u1', username: 'Tester', avatar: 'avatar.png' };

  it('renders online status correctly', () => {
    // Online
    render(
      <AuthContext.Provider value={{ onlineUsers: ['u1'] }}>
        <UserAvatar user={mockUser} showStatus={true} />
      </AuthContext.Provider>
    );
    expect(screen.getByTitle('Online')).toBeInTheDocument();
  });

  it('renders offline status correctly', () => {
    // Offline
    render(
      <AuthContext.Provider value={{ onlineUsers: [] }}>
        <UserAvatar user={mockUser} showStatus={true} />
      </AuthContext.Provider>
    );
    expect(screen.getByTitle('Offline')).toBeInTheDocument();
  });

  it('renders image if avatar present', () => {
    render(
      <AuthContext.Provider value={{ onlineUsers: [] }}>
        <UserAvatar user={mockUser} />
      </AuthContext.Provider>
    );
    const img = screen.getByAltText('Tester');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('avatar.png'));
  });

  it('renders initial if no avatar', () => {
    const userNoAvatar = { _id: 'u2', username: 'NoAvatar' };
    render(
      <AuthContext.Provider value={{ onlineUsers: [] }}>
        <UserAvatar user={userNoAvatar} />
      </AuthContext.Provider>
    );
    expect(screen.getByText('N')).toBeInTheDocument();
  });
});
