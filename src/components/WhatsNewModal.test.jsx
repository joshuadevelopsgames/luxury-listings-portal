import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhatsNewModal, { RELEASE_ID } from './WhatsNewModal';
import { supabaseService } from '../services/supabaseService';

// The popup shows once per user, not once per browser: the seen state lives in
// system_config under whatsNewSeen:<email>, so dismissing it on one computer
// hides it on every other. It also can't be closed for the first 5 seconds.

const mockNavigate = jest.fn();
// Jest here can't resolve react-router-dom's package exports; the popup only needs useNavigate.
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { email: 'AM@Example.com' } }),
}));

jest.mock('../services/supabaseService', () => ({
  supabaseService: { getSystemConfig: jest.fn(), saveSystemConfig: jest.fn() },
}));

const CONFIG_KEY = 'whatsNewSeen:am@example.com';
const dialog = () => screen.queryByRole('dialog', { name: 'Instagram reports got an upgrade' });
const renderModal = (props = {}) => render(<WhatsNewModal enabled reportsPath="/instagram-reports" {...props} />);
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  mockNavigate.mockReset();
  supabaseService.getSystemConfig.mockReset().mockResolvedValue(null);
  supabaseService.saveSystemConfig.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
});

it("shows for a user who hasn't seen it, locked for 5 seconds, then saves that they have", async () => {
  renderModal();
  await settle();
  expect(supabaseService.getSystemConfig).toHaveBeenCalledWith(CONFIG_KEY);
  expect(dialog()).not.toBeNull();

  const gotIt = screen.getByRole('button', { name: /Got it/ });
  expect(gotIt.disabled).toBe(true);
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(gotIt);
  expect(dialog()).not.toBeNull();

  act(() => { jest.advanceTimersByTime(5000); });
  const unlocked = screen.getByRole('button', { name: 'Got it' });
  expect(unlocked.disabled).toBe(false);
  fireEvent.click(unlocked);

  expect(dialog()).toBeNull();
  expect(supabaseService.saveSystemConfig).toHaveBeenCalledWith(CONFIG_KEY, expect.objectContaining({ releaseId: RELEASE_ID }));
});

it('opens Instagram Analytics from the popup once it unlocks', async () => {
  renderModal();
  await settle();
  const cta = screen.getByRole('button', { name: 'Open Instagram Analytics' });
  fireEvent.click(cta);
  expect(mockNavigate).not.toHaveBeenCalled();

  act(() => { jest.advanceTimersByTime(5000); });
  fireEvent.click(cta);
  expect(mockNavigate).toHaveBeenCalledWith('/instagram-reports');
  expect(dialog()).toBeNull();
});

it('stays hidden for a user who already dismissed it on another computer', async () => {
  supabaseService.getSystemConfig.mockResolvedValue({ releaseId: RELEASE_ID, seenAt: '2026-09-15T20:00:00Z' });
  const first = renderModal();
  await settle();
  expect(dialog()).toBeNull();
  first.unmount();

  // Remembered on this computer too, so the next visit skips the lookup.
  supabaseService.getSystemConfig.mockClear();
  renderModal();
  await settle();
  expect(supabaseService.getSystemConfig).not.toHaveBeenCalled();
  expect(dialog()).toBeNull();
});

it("isn't hidden by someone else's dismissal on a shared computer, or by an older release", async () => {
  localStorage.setItem('whats_new_seen:colleague@example.com', RELEASE_ID);
  supabaseService.getSystemConfig.mockResolvedValue({ releaseId: '2026-06-older-release' });
  renderModal();
  await settle();
  expect(dialog()).not.toBeNull();
});

it("doesn't show or look anything up for someone without Instagram Analytics", async () => {
  renderModal({ enabled: false });
  await settle();
  expect(supabaseService.getSystemConfig).not.toHaveBeenCalled();
  expect(dialog()).toBeNull();
});
