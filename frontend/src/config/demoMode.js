// Demo mode is OFF by default. Sample (mock) data is seeded into the app state
// only when explicitly enabled by setting VITE_DEMO_MODE=true in the environment.
// Real users always start with empty state populated from the backend.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
