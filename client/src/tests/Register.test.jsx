import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../pages/Register';
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

describe('Register Page', () => {
  it('renders registration form', () => {
    render(
      <AuthContext.Provider value={{ register: vi.fn() }}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('calls register function on submit', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: true });

    render(
      <AuthContext.Provider value={{ register: mockRegister }}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'TestUser' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    const form = screen.getByRole('button', { name: /Sign Up/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('TestUser', 'test@test.com', 'password123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays error message on failed registration', async () => {
    const mockRegister = vi.fn().mockResolvedValue({ success: false, error: 'Email already exists' });

    render(
      <AuthContext.Provider value={{ register: mockRegister }}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'TestUser' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    const form = screen.getByRole('button', { name: /Sign Up/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });
});
