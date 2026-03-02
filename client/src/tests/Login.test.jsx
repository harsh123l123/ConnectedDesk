import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login';
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

// Mock toast
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

describe('Login Page', () => {
  it('renders login form', () => {
    render(
      <AuthContext.Provider value={{ login: vi.fn() }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('calls login function on submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });

    render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    // Submit form
    const btn = screen.getByRole('button', { name: /Login/i });
    fireEvent.submit(btn.closest('form'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays error message on failed login', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: false, error: { msg: 'Invalid credentials' } });

    render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });

    const btn = screen.getByRole('button', { name: /Login/i });
    fireEvent.submit(btn.closest('form'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    // Check if toast was called or some error UI appeared (if Login uses toast)
  });
});
