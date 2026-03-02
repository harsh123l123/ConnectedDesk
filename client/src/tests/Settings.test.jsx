import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '../pages/Settings';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { MemoryRouter } from 'react-router-dom';

// Mock mocks
const mockLogout = vi.fn();
const mockToggleTheme = vi.fn();

describe('Settings Page', () => {
  it('renders settings sections', () => {
    render(
      <AuthContext.Provider value={{ user: { username: 'Test' }, logout: mockLogout }}>
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: mockToggleTheme }}>
          <MemoryRouter>
            <Settings />
          </MemoryRouter>
        </ThemeContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText(/Appearance/i)).toBeInTheDocument();
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });

  it('calls logout on button click', () => {
    render(
      <AuthContext.Provider value={{ user: { username: 'Test' }, logout: mockLogout }}>
        <ThemeContext.Provider value={{ isDark: false, toggleTheme: mockToggleTheme }}>
          <MemoryRouter>
            <Settings />
          </MemoryRouter>
        </ThemeContext.Provider>
      </AuthContext.Provider>
    );

    const logoutBtn = screen.getByText('Log Out');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
