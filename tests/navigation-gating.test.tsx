import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TopNavigationBar } from '@/renderer/components/TopNavigationBar';
import { PageContent } from '@/renderer/components/PageContent';
import { useAppStore } from '@/renderer/stores/useAppStore';

describe('Navigation gating when no project', () => {
  it('shows modal when clicking Explore without a project', () => {
    const { getByText, queryByText } = render(<TopNavigationBar />);
    const explore = getByText('Explore');
    fireEvent.click(explore);
    expect(queryByText('Project required')).toBeTruthy();
  });

  it('renders onboarding when no project is loaded', () => {
    // Ensure no project
    useAppStore.getState().setCurrentProject(null);
    const { getByText } = render(<PageContent />);
    expect(getByText('Welcome')).toBeTruthy();
  });
});
