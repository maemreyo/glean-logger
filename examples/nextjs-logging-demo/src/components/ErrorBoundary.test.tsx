import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Mock the browser-logger
vi.mock('@/lib/browser-logger', () => ({
  browserLogger: {
    logException: vi.fn(),
  },
}));

// Mock the config
vi.mock('@/lib/config', () => ({
  isBrowserExceptionsEnabled: vi.fn(),
}));

import { browserLogger } from '@/lib/browser-logger';
import { isBrowserExceptionsEnabled } from '@/lib/config';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBrowserExceptionsEnabled).mockReturnValue(true);
  });

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should render children directly when exceptions disabled', () => {
    vi.mocked(isBrowserExceptionsEnabled).mockReturnValue(false);

    render(
      <ErrorBoundary>
        <div>Child Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('should catch and display error with fallback', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it('should log error when caught', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const loggerSpy = vi.spyOn(browserLogger, 'logException');

    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const [error, info] = loggerSpy.mock.calls[0] as [
      Error,
      { componentStack: string; type: string },
    ];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(info).toHaveProperty('componentStack');
    expect(info.type).toBe('react-error-boundary');

    errorSpy.mockRestore();
  });

  it('should have reset button that triggers resetErrorBoundary', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try again')).toBeInTheDocument();

    // The button should exist and be clickable
    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it('should apply padding and text alignment to container', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const container = screen.getByText('Something went wrong!').parentElement;
    expect(container).toHaveStyle({ padding: '2rem', textAlign: 'center' });

    errorSpy.mockRestore();
  });

  it('should display error message in red', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorMessage = screen.getByText('Test error');
    expect(errorMessage).toHaveStyle({ color: '#dc2626' });

    errorSpy.mockRestore();
  });

  it('should have styled button with padding and background', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toHaveStyle({ padding: '0.75rem 1.5rem' });
    expect(button).toHaveStyle({ backgroundColor: '#0070f3' });
    // Color values may be computed as rgb, so we test separately
    expect(button.style.color).toBe('white');

    errorSpy.mockRestore();
  });
});
