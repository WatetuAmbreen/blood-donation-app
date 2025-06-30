import React, { useState } from 'react';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

function PhoneVerification({ onVerified }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const auth = getAuth();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      }, auth);
    }
  };

  const sendOTP = async () => {
    setupRecaptcha();

    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmation(confirmationResult);
      alert('OTP sent!');
    } catch (error) {
      alert('Failed to send OTP: ' + error.message);
    }
  };

  const verifyOTP = async () => {
    try {
      setVerifying(true);
      await confirmation.confirm(otp);
      alert('Phone verified!');
      onVerified(phone); // Callback to parent
    } catch (error) {
      alert('Invalid OTP: ' + error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <input
        type="tel"
        placeholder="+254712345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <button onClick={sendOTP}>Send OTP</button>

      {confirmation && (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={verifyOTP} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </>
      )}

      <div id="recaptcha-container"></div>
    </div>
  );
}

export default PhoneVerification;
