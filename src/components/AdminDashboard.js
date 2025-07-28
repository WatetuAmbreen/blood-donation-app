import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

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
    <div className="min-h-screen bg-gray-100 p-6 text-gray-800">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600">📊 Admin Dashboard</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ← Back
          </button>
        </div>

        <div className="mb-6 space-y-2 text-base">
          <p><strong>Total Donors:</strong> {totalDonors}</p>
          <p><strong>Total Hospitals:</strong> {totalHospitals}</p>
          <p><strong>Fulfillment Rate:</strong> {fulfilledRate}%</p>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">Units Donated by Blood Type</h4>
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(donationsByType).map(([type, count]) => (
              <li key={type}>
                <strong>{type}:</strong> {count} units
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
