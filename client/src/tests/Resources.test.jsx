import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Resources from '../pages/Resources';
import { AuthContext } from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock toast
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

describe('Resources Page', () => {
  const mockUser = { username: 'TestUser' };
  const mockFiles = [
    { _id: 'file1', title: 'document.pdf', filename: 'document.pdf', originalName: 'document.pdf', size: 1024, uploadedBy: { username: 'TestUser' }, createdAt: new Date().toISOString() }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: mockFiles });
  });

  it('renders file list', async () => {
    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Resources />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    axios.post.mockResolvedValue({ data: { ...mockFiles[0], _id: 'newfile' } });

    render(
      <AuthContext.Provider value={{ user: mockUser }}>
        <MemoryRouter>
          <Resources />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const user = userEvent.setup();
    // Open modal
    const openBtn = screen.getByRole('button', { name: /Upload File/i });
    await user.click(openBtn);

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

    // Fill form
    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, 'Test Upload');

    const fileInput = screen.getByLabelText(/Upload file/i);
    await user.upload(fileInput, file);

    // Click upload
    const submitBtn = screen.getByRole('button', { name: 'Upload' });
    fireEvent.submit(submitBtn.closest('form'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
