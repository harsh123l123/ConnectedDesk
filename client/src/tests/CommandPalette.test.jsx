import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const CommandPalette = (await import('../components/CommandPalette')).default;

describe('CommandPalette', () => {
  const mockUser = { _id: 'user1', username: 'TestUser' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both calls resolve with empty arrays so .data is always safe
    axios.get.mockResolvedValue({ data: [] });
  });

  it('renders nothing initially (closed)', () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.queryByPlaceholderText('Type a command or search...')).not.toBeInTheDocument();
  });

  it('opens on Ctrl+K and displays static nav items', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(screen.queryByPlaceholderText('Type a command or search...')).not.toBeInTheDocument();
  });

  it('fetches and displays a dynamic chat entry', async () => {
    const mockChats = [
      {
        _id: 'chat1',
        isGroupChat: false,
        chatName: '',
        users: [
          { _id: 'user2', username: 'Alice' },
          { _id: 'user1', username: 'TestUser' },
        ],
        latestMessage: null,
      },
    ];

    // First call → chats, second call → tasks
    axios.get
      .mockResolvedValueOnce({ data: mockChats })
      .mockResolvedValueOnce({ data: [] });

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <CommandPalette />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });
});
