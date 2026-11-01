import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  evaluatePasswordStrength,
  validatePhoneNumber,
  validateOtpCode,
  POPULAR_COUNTRY_CODES,
} from './auth-validation';

test('validateEmail validates valid emails correctly', () => {
  assert.equal(validateEmail('user@example.com').isValid, true);
  assert.equal(validateEmail('priya.sharma@domain.co.in').isValid, true);
  assert.equal(validateEmail('user+tag@gmail.com').isValid, true);
});

test('validateEmail rejects malformed emails', () => {
  assert.equal(validateEmail('').isValid, false);
  assert.equal(validateEmail('invalid-email').isValid, false);
  assert.equal(validateEmail('user@').isValid, false);
  assert.equal(validateEmail('@domain.com').isValid, false);
});

test('evaluatePasswordStrength rates password complexity accurately', () => {
  // Empty
  const empty = evaluatePasswordStrength('');
  assert.equal(empty.score, 0);

  // Weak
  const weak = evaluatePasswordStrength('simple');
  assert.equal(weak.score, 1);
  assert.equal(weak.requirements.minLength, false);

  // Fair
  const fair = evaluatePasswordStrength('Password12');
  assert.equal(fair.requirements.minLength, true);
  assert.equal(fair.requirements.hasUppercase, true);
  assert.equal(fair.requirements.hasLowercase, true);
  assert.equal(fair.requirements.hasNumber, true);
  assert.equal(fair.score >= 2, true);

  // Very Strong (Length + Upper + Lower + Number + Special)
  const strong = evaluatePasswordStrength('EventEase@2026!');
  assert.equal(strong.score, 4);
  assert.equal(strong.requirements.hasSpecial, true);
});

test('validatePhoneNumber checks length and format', () => {
  const valid = validatePhoneNumber('+91 98765 43210');
  assert.equal(valid.isValid, true);
  assert.equal(valid.sanitized, '+919876543210');

  const invalidShort = validatePhoneNumber('1234');
  assert.equal(invalidShort.isValid, false);

  const invalidChars = validatePhoneNumber('phone-number-abc');
  assert.equal(invalidChars.isValid, false);
});

test('validateOtpCode checks 6 digits requirement', () => {
  assert.equal(validateOtpCode('123456').isValid, true);
  assert.equal(validateOtpCode('987654').isValid, true);
  assert.equal(validateOtpCode('12345').isValid, false); // 5 digits
  assert.equal(validateOtpCode('1234567').isValid, false); // 7 digits
  assert.equal(validateOtpCode('12a456').isValid, false); // non-numeric
});

test('POPULAR_COUNTRY_CODES contains essential countries', () => {
  assert.ok(POPULAR_COUNTRY_CODES.some((c) => c.dialCode === '+91'));
  assert.ok(POPULAR_COUNTRY_CODES.some((c) => c.dialCode === '+1'));
  assert.ok(POPULAR_COUNTRY_CODES.some((c) => c.dialCode === '+44'));
});
