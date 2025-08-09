// Trick to make the page think it's in a frame to avoid redirecting to the home page
Object.defineProperty(window, 'frameElement', {
  value: {},
  writable: false,
  configurable: true
});

// Mock window.parent methods to prevent reference errors
if (window.parent && typeof window.parent === 'object') {
  window.parent.setTitle = window.parent.setTitle || function() {};
  window.parent.setUrl = window.parent.setUrl || function() {};
}
