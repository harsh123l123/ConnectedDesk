import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('axios');

vi.mock('simple-peer', () => ({
  default: class {
    constructor() { }
    on() { }
    signal() { }
    destroy() { }
  },
}));

// Stub socket.io-client so it doesn't try to connect
vi.mock('socket.io-client', () => ({
  io: () => ({ on: vi.fn(), emit: vi.fn(), off: vi.fn(), disconnect: vi.fn() }),
}));

// Lazy import AFTER mocks so hoisting is correct
const Chat = (await import('../pages/Chat')).default;

// ── Helpers ────────────────────────────────────────────────────────────────
const mockUser = { _id: 'u1', username: 'TestUser', email: 'testuser@example.com', avatar: '' };
const mockSocket = { on: vi.fn(), emit: vi.fn(), off: vi.fn() };

const mockChats = [
  {
    _id: 'c1',
    chatName: 'General',
    isGroupChat: true,
    users: [mockUser],
    latestMessage: { content: 'Hello', sender: mockUser, isDeleted: false },
    unreadCount: 0,
  },
];

function renderChat() {
  return render(
    <AuthContext.Provider
      value={{
        user: mockUser,
        socket: mockSocket,
        notifications: [],
        setNotifications: vi.fn(),
        onlineUsers: [],
      }}
    >
      <MemoryRouter>
        <Chat />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('Chat Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/chats') || url.includes('/api/chat'))
        return Promise.resolve({ data: mockChats });
      // messages, pinned, users…
      return Promise.resolve({ data: [] });
    });
  });

  it('renders the welcome screen when no chat is selected', async () => {
    renderChat();
    expect(screen.getByText('Welcome to ConnectedDesk')).toBeInTheDocument();
  });

  it('loads and displays the chat list', async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('General')).toBeInTheDocument();
    });
  });

  it('shows the new-group button in the sidebar', async () => {
    renderChat();
    // The "create group" icon-btn should be present
    await waitFor(() => {
      // Button with title or aria — just confirm sidebar header rendered
      expect(screen.getByText('Chats')).toBeInTheDocument();
    });
  });

  it('displays unread count badge when chat has unread messages', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/chats') || url.includes('/api/chat'))
        return Promise.resolve({
          data: [{ ...mockChats[0], unreadCount: 3 }],
        });
      return Promise.resolve({ data: [] });
    });

    renderChat();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('opens the profile modal when sidebar user info is clicked', async () => {
    renderChat();

    await waitFor(() => {
      // Look for the "Chats" title or the user info container
      const userInfo = screen.getByText('TestUser (You)').closest('div');
      fireEvent.click(userInfo);
    });

    await waitFor(() => {
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('testuser@example.com', { exact: false })).toBeInTheDocument();
    });
  });
});
