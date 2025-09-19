// src/utils/googleAuth.js
// Utility to load Google Identity Services and handle sign-in

export function loadGoogleScript(clientId, callback) {
  if (document.getElementById('google-client-script')) return;
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.id = 'google-client-script';
  script.onload = callback;
  document.body.appendChild(script);
}

export function initializeGoogleSignIn({ clientId, onSuccess, onError, elementId }) {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: onSuccess,
    cancel_on_tap_outside: false,
  });
  window.google.accounts.id.renderButton(
    document.getElementById(elementId),
    { theme: 'outline', size: 'large', width: 300 }
  );
  window.google.accounts.id.prompt();
}
