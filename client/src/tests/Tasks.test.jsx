import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('axios');

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

const Tasks = (await import('../pages/Tasks')).default;

// ── Helpers ────────────────────────────────────────────────────────────────
const mockUser = { _id: 'u1', username: 'TestUser', avatar: '' };

const baseTasks = [
  {
    _id: 't1',
    title: 'Fix Bug #42',
    status: 'todo',
    priority: 'high',
    dueDate: null,
    subtasks: [],
    comments: [],
    assignedTo: [],
    recurring: { enabled: false, frequency: 'weekly' },
  },
  {
    _id: 't2',
    title: 'Write Docs',
    status: 'in-progress',
    priority: 'medium',
    dueDate: null,
    subtasks: [{ _id: 's1', title: 'Intro', completed: true }],
    comments: [],
    assignedTo: [],
    recurring: { enabled: false, frequency: 'weekly' },
  },
];

function renderTasks() {
  return render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('Tasks Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: baseTasks });
    axios.post.mockResolvedValue({ data: { _id: 't3', title: 'New Task', status: 'todo', priority: 'medium', subtasks: [], comments: [], assignedTo: [], recurring: { enabled: false } } });
    axios.delete.mockResolvedValue({});
    axios.put.mockResolvedValue({ data: {} });
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders the Kanban board columns', async () => {
    renderTasks();
    await waitFor(() => {
      expect(screen.getByText(/to do/i)).toBeInTheDocument();
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      // Third column is labelled 'Completed' in Tasks.jsx
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  it('displays tasks fetched from the API', async () => {
    renderTasks();
    await waitFor(() => {
      expect(screen.getByText('Fix Bug #42')).toBeInTheDocument();
      expect(screen.getByText('Write Docs')).toBeInTheDocument();
    });
  });

  it('shows subtask progress on a card', async () => {
    renderTasks();
    // Write Docs has 1/1 subtasks completed → progress label
    await waitFor(() => {
      expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    });
  });

  it('opens the task detail modal when a card is clicked', async () => {
    renderTasks();
    await waitFor(() => expect(screen.getByText('Fix Bug #42')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Fix Bug #42'));

    await waitFor(() => {
      // Modal shows title in the input or heading
      expect(screen.getByDisplayValue('Fix Bug #42')).toBeInTheDocument();
    });
  });

  it('opens "Add Task" modal from the header button', async () => {
    renderTasks();
    fireEvent.click(screen.getByText('Add Task'));
    await waitFor(() => {
      // New task modal has an empty title field
      expect(screen.getByPlaceholderText(/Task title/i)).toBeInTheDocument();
    });
  });

  it('filters tasks by priority', async () => {
    renderTasks();
    await waitFor(() => expect(screen.getByText('Fix Bug #42')).toBeInTheDocument());

    // Select "medium" in the priority filter
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'medium' } });

    await waitFor(() => {
      // High-priority card should be gone
      expect(screen.queryByText('Fix Bug #42')).not.toBeInTheDocument();
      expect(screen.getByText('Write Docs')).toBeInTheDocument();
    });
  });

  it('searches tasks by title', async () => {
    renderTasks();
    await waitFor(() => expect(screen.getByText('Fix Bug #42')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Search tasks/i);
    fireEvent.change(searchInput, { target: { value: 'Write' } });

    await waitFor(() => {
      expect(screen.queryByText('Fix Bug #42')).not.toBeInTheDocument();
      expect(screen.getByText('Write Docs')).toBeInTheDocument();
    });
  });

  it('calls DELETE endpoint when a task is deleted', async () => {
    renderTasks();
    await waitFor(() => expect(screen.getByText('Fix Bug #42')).toBeInTheDocument());

    // Open the task detail modal
    fireEvent.click(screen.getByText('Fix Bug #42'));

    // Inside the modal, find and click the Delete button
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete task/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /delete task/i }));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/t1')
      );
    });
  });
});
