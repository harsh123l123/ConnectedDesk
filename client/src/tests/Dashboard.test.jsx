import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock Recharts to avoid jsdom layout issues
vi.mock('recharts', async () => {
  const OriginalModule = await vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }) => <div className="recharts-mock">{children}</div>,
  };
});

// Mock @hello-pangea/dnd to avoid jsdom layout measurement issues
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) =>
    children(
      { innerRef: vi.fn(), draggableProps: { style: {} }, dragHandleProps: {} },
      { isDragging: false }
    ),
}));

// Mock framer-motion to avoid animation timing issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Dashboard', () => {
  const mockUser = { _id: 'user1', username: 'TestUser' };
  const mockTasks = [
    { _id: '1', title: 'Task 1', status: 'todo', priority: 'high', user: 'user1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: '2', title: 'Task 2', status: 'done', priority: 'low', user: 'user1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  const mockMeetings = [
    { _id: 'm1', title: 'Meeting 1', dateTime: new Date().toISOString(), createdAt: new Date().toISOString() }
  ];
  const mockChats = [
    {
      _id: 'c1',
      unreadCount: 2,
      latestMessage: { createdAt: new Date().toISOString(), content: 'Hello', sender: { _id: 'user2', username: 'Other' } },
      users: [{ _id: 'user2', username: 'Other' }, { _id: 'user1' }],
      isGroupChat: false,
      chatName: 'Direct Chat'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup successful responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/tasks')) return Promise.resolve({ data: mockTasks });
      if (url.includes('/meetings')) return Promise.resolve({ data: mockMeetings });
      if (url.includes('/chats')) return Promise.resolve({ data: mockChats });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders welcome message and stats', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Initial loading state might be shown or skeleton
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/TestUser/i)).toBeInTheDocument();
    });

    // Check stats
    const unreadLabel = screen.getByText('Unread');
    expect(unreadLabel.parentElement).toHaveTextContent('2');
    // Check meetings
    expect(screen.getByText('Meeting 1')).toBeInTheDocument();
  });

  it('renders task list correctly', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      // Task 1 appears in Kanban and Pending list
      expect(screen.getAllByText('Task 1').length).toBeGreaterThan(0);
      // Task 2 appears in Kanban (done column)
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });
});
