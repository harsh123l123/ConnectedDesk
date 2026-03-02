import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../pages/Calendar';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('Calendar Page', () => {
  const mockUser = { username: 'TestUser' };
  const mockTasks = [{ _id: 't1', title: 'Task 1', dueDate: new Date().toISOString() }];
  const mockMeetings = [{ _id: 'm1', title: 'Meeting 1', dateTime: new Date().toISOString(), venue: 'Zoom' }];

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('/tasks')) return Promise.resolve({ data: mockTasks });
      if (url.includes('/meetings')) return Promise.resolve({ data: mockMeetings });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders calendar and events', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Calendar />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Meeting 1')).toBeInTheDocument();
    });
  });

  it('opens modal and allows scheduling', async () => {
    axios.post.mockResolvedValue({ data: { success: true } });

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Calendar />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // Click "New Event" button
    fireEvent.click(screen.getByText(/New Event/i));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Project Sync/i), { target: { value: 'New Meeting' } });
    fireEvent.change(screen.getByPlaceholderText(/Google Meet/i), { target: { value: 'Room 2' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: 'Schedule' });
    fireEvent.submit(submitBtn.closest('form'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
