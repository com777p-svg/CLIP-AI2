import test from 'node:test';
import assert from 'node:assert/strict';

// Keep language hint logic independently testable without loading the large model.
function guessLanguage(text) {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic > latin * 1.15) return 'ar';
  if (latin > arabic * 1.15) return 'en';
  return 'unknown';
}

test('language hint recognizes Arabic script', () => {
  assert.equal(guessLanguage('مرحبا كيف حالكم اليوم'), 'ar');
});
test('language hint recognizes English script', () => {
  assert.equal(guessLanguage('Hello, how are you today'), 'en');
});
test('language hint stays unknown for empty or mixed text', () => {
  assert.equal(guessLanguage(''), 'unknown');
  assert.equal(guessLanguage('Hello مرحبا'), 'unknown');
});
