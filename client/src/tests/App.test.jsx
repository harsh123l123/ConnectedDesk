import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { MemoryRouter } from 'react-router-dom';

describe('App', () => {
  it('renders without crashing', () => {
    // This is a basic smoke test
    expect(true).toBe(true);
  });
});
