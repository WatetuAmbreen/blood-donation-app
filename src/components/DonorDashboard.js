import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function DonorDashboard() {
  const [requests, setRequests] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const q = query(collection(db, 'requests'), where('status', '==', 'Pending'));
        const snapshot = await getDocs(q);
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoadingRequests(false);
      }
    };

    const fetchHistory = async () => {
      if (!currentUser) return;

      try {
        const allRequestsSnapshot = await getDocs(collection(db, 'requests'));
        const allRequests = allRequestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const history = [];

        for (const req of allRequests) {
          const responsesRef = collection(db, 'requests', req.id, 'responses');
          const q = query(responsesRef, where('donorId', '==', currentUser.uid));
          const responseSnapshot = await getDocs(q);

          responseSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            history.push({
              id: docSnap.id,
              requestId: req.id,
              hospitalName: req.hospitalName,
              bloodType: req.bloodType,
              units: req.units,
              urgency: req.urgency,
              offeredAt: data.offeredAt?.toDate().toLocaleString() || 'N/A',
            });
          });
        }

        setDonationHistory(history);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (currentUser) {
      fetchRequests();
      fetchHistory();
    }
  }, [currentUser]);

  const handleDonate = async (requestId) => {
    try {
      const donorId = currentUser.uid;
      const responsesRef = collection(db, 'requests', requestId, 'responses');

      const existing = await getDocs(query(responsesRef, where('donorId', '==', donorId)));
      if (!existing.empty) {
        alert('You have already offered to donate for this request.');
        return;
      }

      const donorDataDoc = await getDocs(collection(db, 'users'));
      const donorInfo = donorDataDoc.docs.find(doc => doc.id === donorId)?.data();
      if (!donorInfo) return alert("Donor info not found.");

      await addDoc(responsesRef, {
        donorId,
        name: donorInfo.name || 'Anonymous',
        contact: donorInfo.email || '',
        offeredAt: serverTimestamp(),
      });

      const allResponses = await getDocs(responsesRef);
      const requestSnap = await getDocs(query(collection(db, 'requests'), where('__name__', '==', requestId)));
      const requestData = requestSnap.docs[0].data();

      if (allResponses.size >= requestData.units) {
        const reqRef = doc(db, 'requests', requestId);
        await updateDoc(reqRef, { status: 'Fulfilled' });
      }

      alert('Thank you for donating!');
    } catch (error) {
      console.error('Donation error:', error);
      alert('Something went wrong.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3>🩸 Donor Dashboard</h3>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <h4>📋 Available Requests</h4>
      {loadingRequests ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p>No pending requests right now.</p>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req.id}>
              <strong>Blood Type:</strong> {req.bloodType}<br />
              <strong>Units:</strong> {req.units}<br />
              <strong>Hospital:</strong> {req.hospitalName}<br />
              <strong>Urgency:</strong> {req.urgency}<br />
              <button onClick={() => handleDonate(req.id)}>Donate</button>
            </li>
          ))}
        </ul>
      )}

      <h4>🕘 Donation History</h4>
      {loadingHistory ? (
        <p>Loading history...</p>
      ) : donationHistory.length === 0 ? (
        <p>You haven't donated yet.</p>
      ) : (
        <ul>
          {donationHistory.map((donation) => (
            <li key={donation.id}>
              <strong>Hospital:</strong> {donation.hospitalName}<br />
              <strong>Blood Type:</strong> {donation.bloodType}<br />
              <strong>Urgency:</strong> {donation.urgency}<br />
              <strong>Donated At:</strong> {donation.offeredAt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DonorDashboard;
