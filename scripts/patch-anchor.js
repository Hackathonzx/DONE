const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', '@coral-xyz', 'anchor', 'dist', 'browser', 'index.js');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');
  let patched = false;

  // Fix 1: this.fetch = false in cross-fetch new F()
  if (content.includes('this.fetch = false;')) {
    content = content.replace(
      'this.fetch = false;',
      "try { this.fetch = false; } catch (e) { Object.defineProperty(this, 'fetch', { value: false, writable: true, configurable: true, enumerable: true }); }"
    );
    patched = true;
  }

  // Fix 2: self.fetch = fetch in cross-fetch
  if (content.includes('self.fetch = fetch;')) {
    content = content.replace(
      'self.fetch = fetch;',
      "try { self.fetch = fetch; } catch (e) { try { Object.defineProperty(self, 'fetch', { value: fetch, writable: true, configurable: true, enumerable: true }); } catch (e2) {} }"
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully patched @coral-xyz/anchor browser bundle!');
  } else {
    console.log('@coral-xyz/anchor already patched or pattern not found.');
  }
} else {
  console.log('@coral-xyz/anchor browser bundle not found at', targetPath);
}
