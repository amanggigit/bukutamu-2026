
import { Guest } from '../types';

const STORAGE_KEY = 'setda_guestbook_data';

export const storageService = {
  getGuests: (): Guest[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  addGuest: (guest: Omit<Guest, 'id' | 'timestamp'>): Guest => {
    const guests = storageService.getGuests();
    const newGuest: Guest = {
      ...guest,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    const updated = [newGuest, ...guests];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newGuest;
  },

  deleteGuest: (id: string): void => {
    const guests = storageService.getGuests();
    const updated = guests.filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  clearAll: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
