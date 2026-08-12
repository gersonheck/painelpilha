import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SafeStorage } from '../../src/shared/storage/SafeStorage';

describe('SafeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists and reads values from localStorage', () => {
    expect(SafeStorage.setItem('profile', '{"configured":true}')).toBe('durable');
    expect(SafeStorage.getItem('profile')).toBe('{"configured":true}');
  });

  it('falls back to sessionStorage when localStorage throws', () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (this === window.localStorage) throw new DOMException('blocked');
      return originalSetItem.call(this, key, value);
    });

    expect(SafeStorage.setItem('session', 'active')).toBe('session');
    expect(window.sessionStorage.getItem('session')).toBe('active');
  });

  it('falls back when localStorage cannot accept a write', () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (this === window.localStorage) throw new DOMException('denied');
      return originalSetItem.call(this, key, value);
    });

    expect(SafeStorage.setItem('getter-blocked', 'available')).toBe('session');
    expect(window.sessionStorage.getItem('getter-blocked')).toBe('available');
    expect(SafeStorage.getItem('getter-blocked')).toBe('available');
  });

  it('removes a stale primary value before using a fallback', () => {
    window.localStorage.setItem('profile-update', 'old');
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (this === window.localStorage) throw new DOMException('quota');
      return originalSetItem.call(this, key, value);
    });

    SafeStorage.setItem('profile-update', 'new');
    expect(window.localStorage.getItem('profile-update')).toBeNull();
    expect(window.sessionStorage.getItem('profile-update')).toBe('new');
    expect(SafeStorage.getItem('profile-update')).toBe('new');
  });

  it('removes a key from persistent adapters', () => {
    window.localStorage.setItem('history', '[]');
    window.sessionStorage.setItem('history', '[]');
    SafeStorage.removeItem('history');
    expect(SafeStorage.getItem('history')).toBeNull();
  });

  it('cleans a stale session fallback after writing to localStorage', () => {
    window.sessionStorage.setItem('profile', 'old');
    SafeStorage.setItem('profile', 'new');
    expect(window.localStorage.getItem('profile')).toBe('new');
    expect(window.sessionStorage.getItem('profile')).toBeNull();
  });
});
