// Shared utility functions used across all services

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate platform fee from amount
 */
export function calculatePlatformFee(amount: Decimal | string | number): Decimal {
  const platformFeePercentage = 0.1; // 10%
  const decimalAmount =
    amount instanceof Decimal
      ? amount
      : new Decimal(amount);

  return decimalAmount.mul(platformFeePercentage);
}

/**
 * Calculate net amount after fees
 */
export function calculateNetAmount(amount: Decimal | string | number): Decimal {
  const decimalAmount =
    amount instanceof Decimal
      ? amount
      : new Decimal(amount);
  const fee = calculatePlatformFee(decimalAmount);
  return decimalAmount.minus(fee);
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: Decimal | string | number,
  currency: string = 'USD',
): string {
  const decimalAmount =
    amount instanceof Decimal
      ? amount
      : new Decimal(amount);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(decimalAmount));

  return formatted;
}

/**
 * Parse currency string to Decimal
 */
export function parseCurrency(currencyString: string): Decimal {
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  return new Decimal(cleaned);
}

/**
 * Calculate average rating
 */
export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Check if value is valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if value is valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if value is valid phone number
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize string input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
}

/**
 * Generate random verification code
 */
export function generateVerificationCode(length: number = 6): string {
  return Math.random()
    .toString()
    .substring(2, 2 + length);
}

/**
 * Generate random slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

/**
 * Check if date is in future
 */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if date is in past
 */
export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Days between two dates
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display
 */
export function formatDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Parse JWT token (without verification)
 */
export function parseJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Hash string (simple approach, use bcrypt in production)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects (shallow)
 */
export function mergeObjects<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  return { ...target, ...source };
}

/**
 * Extract error message
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'An unknown error occurred';
}

/**
 * Retry async function
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Convert enum to array
 */
export function enumToArray<T extends Record<string, any>>(
  enumObj: T,
): Array<{ key: string; value: T[keyof T] }> {
  return Object.keys(enumObj).map(key => ({
    key,
    value: enumObj[key as keyof T],
  }));
}

/**
 * Create pagination object
 */
export function createPagination(
  skip: number,
  take: number,
  total: number,
): { skip: number; take: number; total: number; hasMore: boolean } {
  return {
    skip,
    take,
    total,
    hasMore: skip + take < total,
  };
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function uniqueArray<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
