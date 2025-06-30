import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        setPhone(data.phone || '');
        setIsVerified(data.phoneVerified || false);
        setBloodType(data.bloodType || '');
      }
    };
    fetchUserData();
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => handlePhoneVerification(),
      }, auth);
    }
  };

  const handlePhoneVerification = async () => {
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    try {
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      alert('Verification code sent.');
    } catch (error) {
      alert('Failed to send code: ' + error.message);
    }
  };

  const confirmCode = async () => {
    try {
      await confirmationResult.confirm(verificationCode);
      setIsVerified(true);
      alert('Phone verified successfully!');
    } catch (error) {
      alert('Verification failed: ' + error.message);
    }
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        phone,
        phoneVerified: isVerified,
        bloodType,
      });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Update failed: ' + error.message);
    }
  };

  return (
    <div>
      <h2>Edit Profile</h2>
      {userData ? (
        <>
          <p><strong>Name:</strong> {userData.name}</p>
          <p><strong>Email:</strong> {userData.email}</p>

          <div>
            <label>Phone Number:</label><br />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button onClick={handlePhoneVerification}>Verify Phone</button>
            {confirmationResult && (
              <>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <button onClick={confirmCode}>Confirm Code</button>
              </>
            )}
            <p>Phone Verified: {isVerified ? '✅ Yes' : '❌ No'}</p>
          </div>

          <div>
            <label>Blood Type:</label><br />
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
              <option value="">Select Blood Type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <button onClick={handleSave}>Save Changes</button>
          <br /><br />
          <button onClick={() => navigate('/dashboard')}>⬅ Back to Dashboard</button>

          <div id="recaptcha-container"></div>
        </>
      ) : (
        <p>Loading profile...</p>
      )}
    </div>
  );
}
