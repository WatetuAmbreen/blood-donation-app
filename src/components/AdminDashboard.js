import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function AdminDashboard() {
  const [totalDonors, setTotalDonors] = useState(0);
  const [totalHospitals, setTotalHospitals] = useState(0);
  const [donationsByType, setDonationsByType] = useState({});
  const [fulfilledRate, setFulfilledRate] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let donorCount = 0;
      let hospitalCount = 0;
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.role === 'donor') donorCount++;
        if (user.role === 'hospital') hospitalCount++;
      });
      setTotalDonors(donorCount);
      setTotalHospitals(hospitalCount);

      const requestsSnapshot = await getDocs(collection(db, 'requests'));
      let typeTotals = {};
      let fulfilled = 0;
      requestsSnapshot.forEach(doc => {
        const req = doc.data();
        if (req.status === 'Fulfilled') fulfilled++;
        typeTotals[req.bloodType] = (typeTotals[req.bloodType] || 0) + parseInt(req.units);
      });

      setDonationsByType(typeTotals);
      setFulfilledRate(
        requestsSnapshot.size > 0 ? Math.round((fulfilled / requestsSnapshot.size) * 100) : 0
      );
    };

    fetchStats();
  }, []);

  return (
    <div style={{ padding: '1em' }}>
      <h2>📊 Admin Dashboard</h2>

      <button onClick={() => navigate(-1)} style={{ marginBottom: '1em' }}>
        ← Back
      </button>

      <div style={{ marginBottom: '1em' }}>
        <strong>Total Donors:</strong> {totalDonors}<br />
        <strong>Total Hospitals:</strong> {totalHospitals}<br />
        <strong>Fulfillment Rate:</strong> {fulfilledRate}%
      </div>

      <h4>Units Donated by Blood Type</h4>
      <ul>
        {Object.entries(donationsByType).map(([type, count]) => (
          <li key={type}>
            <strong>{type}:</strong> {count} units
          </li>
        ))}
      </ul>
    </div>
  );
}
