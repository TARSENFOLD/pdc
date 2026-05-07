import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleDashboardShell } from './RoleDashboardShell';

describe('RoleDashboardShell', () => {
  const defaultProps = {
    hero: <h1>Dashboard</h1>,
    kpiStrip: [<div key="1">KPI 1</div>, <div key="2">KPI 2</div>],
    primary: <div>Primary content</div>,
  };

  it('renders hero, kpiStrip, and primary', () => {
    render(<RoleDashboardShell {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('KPI 1')).toBeDefined();
    expect(screen.getByText('Primary content')).toBeDefined();
  });

  it('renders side panel when provided', () => {
    render(<RoleDashboardShell {...defaultProps} side={<div>Side panel</div>} />);
    expect(screen.getByText('Side panel')).toBeDefined();
  });

  it('renders activity rail when provided', () => {
    render(<RoleDashboardShell {...defaultProps} activity={<div>Activity</div>} />);
    expect(screen.getByText('Activity')).toBeDefined();
  });

  it('does not render side when omitted', () => {
    render(<RoleDashboardShell {...defaultProps} />);
    expect(screen.queryByText('Side panel')).toBeNull();
  });

  it('renders empty kpiStrip gracefully', () => {
    render(<RoleDashboardShell {...defaultProps} kpiStrip={[]} />);
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  describe('dark mode', () => {
    beforeEach(() => { document.documentElement.classList.add('dark'); });
    afterEach(() => { document.documentElement.classList.remove('dark'); });

    it('renders in dark mode without crash', () => {
      render(<RoleDashboardShell {...defaultProps} />);
      expect(screen.getByText('Dashboard')).toBeDefined();
    });
  });
});
