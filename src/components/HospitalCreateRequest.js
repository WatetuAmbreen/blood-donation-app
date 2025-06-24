import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function HospitalCreateRequest() {
  const [bloodType, setBloodType] = useState('');
  const [units, setUnits] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [hospitalName, setHospitalName] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, 'requests'), {
        bloodType,
        units,
        urgency,
        hospitalName,
        contact,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      alert('Blood request submitted successfully!');
      // Clear the form
      setBloodType('');
      setUnits('');
      setUrgency('Normal');
      setHospitalName('');
      setContact('');
    } catch (error) {
      console.error("Error submitting request: ", error);
      alert('Failed to submit request');
    }
  };

  return (
    <div>
      <h2>Create Blood Request</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Hospital Name"
          value={hospitalName}
          onChange={(e) => setHospitalName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Contact Info"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
        <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} required>
          <option value="">Select Blood Type</option>
          <option value="A+">A+</option>
          <option value="A-">A−</option>
          <option value="B+">B+</option>
          <option value="B-">B−</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB−</option>
          <option value="O+">O+</option>
          <option value="O-">O−</option>
        </select>
        <input
          type="number"
          placeholder="Units Needed"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          required
        />
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option value="Normal">Normal</option>
          <option value="Urgent">Urgent</option>
          <option value="Critical">Critical</option>
        </select>
        <button type="submit">Submit Request</button>
      </form>
    </div>
  );
}
