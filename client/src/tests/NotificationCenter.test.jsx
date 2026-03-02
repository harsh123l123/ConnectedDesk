import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationCenter from '../components/NotificationCenter';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationCenter', () => {
  const mockSetNotifications = vi.fn();
  const mockNotifications = [
    {
      _id: '1',
      sender: { username: 'TestUser' },
      content: 'Hello World',
      chatId: { _id: 'chat123' },
      createdAt: new Date().toISOString()
    }
  ];

  it('renders notification count badge', () => {
    render(
      <AuthContext.Provider value={{ notifications: mockNotifications, setNotifications: mockSetNotifications }}>
        <MemoryRouter>
          <NotificationCenter />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Check for the dot
    const dot = screen.getByTitle('Notifications').querySelector('.notif-dot');
    expect(dot).toBeInTheDocument();
  });

  it('opens panel on click and shows notifications', () => {
    render(
      <AuthContext.Provider value={{ notifications: mockNotifications, setNotifications: mockSetNotifications }}>
        <MemoryRouter>
          <NotificationCenter />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const button = screen.getByTitle('Notifications');
    fireEvent.click(button);

    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('navigates to chat on notification click', () => {
    render(
      <AuthContext.Provider value={{ notifications: mockNotifications, setNotifications: mockSetNotifications }}>
        <MemoryRouter>
          <NotificationCenter />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByTitle('Notifications'));
    fireEvent.click(screen.getByText('Hello World'));

    expect(mockNavigate).toHaveBeenCalledWith('/chat', { state: { selectedChatId: 'chat123' } });
  });
});
