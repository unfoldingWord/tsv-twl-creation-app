/**
 * Polyfill/fix for proper UTF-8 base64 decoding in browsers
 * 
 * The issue: twl-generator uses atob() which doesn't handle UTF-8 properly
 * This causes smart quotes and other Unicode characters to be corrupted
 * 
 * This polyfill must be loaded BEFORE twl-generator is imported
 */

// Save the original atob
const originalAtob = globalThis.atob;

// Override atob to properly handle UTF-8
if (typeof window !== 'undefined' && originalAtob) {
  globalThis.atob = function(base64String) {
    // Use the original atob to get binary string
    const binaryString = originalAtob(base64String);
    
    // Convert binary string to UTF-8
    // This handles multi-byte UTF-8 characters properly
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decode UTF-8 bytes to proper string
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  };
  
  console.log('✅ UTF-8 base64 decoding polyfill installed');
}

export {};
