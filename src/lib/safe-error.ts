const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password.',
  'User already registered': 'An account with this email already exists.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'Password should be at least': 'Password must be at least 6 characters.',
  'User not found': 'No account found with this email.',
  'Email rate limit exceeded': 'Too many attempts. Please try again later.',
  'For security purposes': 'Too many attempts. Please try again later.',
  'violates row-level security': 'Permission denied.',
  'duplicate key value': 'This item already exists.',
  'foreign key constraint': 'Invalid reference. Please check your input.',
  'violates check constraint': 'Invalid input value.',
  'FetchError': 'Network error. Please check your connection.',
  'Failed to fetch': 'Network error. Please check your connection.',
};

export function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  for (const [key, safe] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return safe;
  }
  return 'An unexpected error occurred. Please try again.';
}
