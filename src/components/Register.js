import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('donor');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Save extra user info to Firestore
      await setDoc(doc(db, 'users', uid), {
        name,
        email,
        role: type,
      });

      localStorage.setItem("userType", type);
      alert(`${type} registered successfully!`);

      navigate('/dashboard'); // move to dashboard after register
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="donor">Donor</option>
          <option value="hospital">Hospital</option>
        </select>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
