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
      window.recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => handlePhoneVerification(),
        },
        auth
      );
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
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-start">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Edit Profile</h2>
        {userData ? (
          <>
            <p className="mb-2"><strong>Name:</strong> {userData.name}</p>
            <p className="mb-4"><strong>Email:</strong> {userData.email}</p>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-1">Phone Number:</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <button
                  onClick={handlePhoneVerification}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Verify Phone
                </button>
              </div>
              {confirmationResult && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={confirmCode}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Confirm Code
                  </button>
                </div>
              )}
              <p className="mt-2">Phone Verified: {isVerified ? '✅ Yes' : '❌ No'}</p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-1">Blood Type:</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
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

            <button
              onClick={handleSave}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
            >
              Save Changes
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 hover:underline"
              >
                ⬅ Back to Dashboard
              </button>
            </div>

            <div id="recaptcha-container"></div>
          </>
        ) : (
          <p>Loading profile...</p>
        )}
      </div>
    </div>
  );
}
