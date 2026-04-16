# Rule: Always fall back to manual login if hash params are absent

Your app must work in two scenarios:

1. Opened from Calimero Desktop — SSO hash params present
2. Opened directly in a browser — no hash params

Never assume the hash params will always be present.

## WRONG — breaks direct browser access:

```typescript
const hash = new URLSearchParams(window.location.hash.slice(1));
const token = hash.get('access_token')!; // ✗ will be null in browser
initClient(token); // ✗ crashes
```

## CORRECT — graceful fallback:

```typescript
const hash = new URLSearchParams(window.location.hash.slice(1));
const token = hash.get('access_token');

if (token) {
  initClientWithSSO(token);
} else {
  showLoginScreen(); // ✓ fallback
}
```

## Why

Desktop is not the only way users access apps. Developers test in browsers directly. Organizations
may embed apps in other contexts. The app must be self-sufficient.
