// Applies the saved theme before first paint (avoids a light flash in dark mode).
// A separate file rather than an inline script, so a strict Content-Security-Policy can apply everywhere.
try {
  var t = localStorage.getItem('shieldup-theme');
  if (t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
} catch (e) {}
