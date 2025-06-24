import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({
    bloodType: '',
    units: '',
    urgency: 'Normal',
    hospitalName: '',
    status: 'Pending',
  });
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed.');
    }
  };

  // Fetch hospital's requests and listen for updates
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'requests'),
      where('hospitalId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Create new blood request
  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!newRequest.bloodType || !newRequest.units || !newRequest.hospitalName) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      await addDoc(collection(db, 'requests'), {
        ...newRequest,
        hospitalId: currentUser.uid,
        createdAt: new Date(),
      });
      alert('Request created!');
      setNewRequest({
        bloodType: '',
        units: '',
        urgency: 'Normal',
        hospitalName: '',
        status: 'Pending',
      });
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create request.');
    }
  };

  // Mark request as fulfilled
  const markFulfilled = async (requestId) => {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, { status: 'Fulfilled' });
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request status.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>🏥 Hospital Dashboard</h3>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <h4>Create New Blood Request</h4>
      <form onSubmit={handleCreateRequest}>
        <div style={{ marginBottom: '1em' }}>
          <label>Blood Type:</label><br />
          <select
            value={newRequest.bloodType}
            onChange={(e) => setNewRequest({ ...newRequest, bloodType: e.target.value })}
            required
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

        <div style={{ marginBottom: '1em' }}>
          <label>Units Needed:</label><br />
          <input
            type="number"
            value={newRequest.units}
            onChange={(e) => setNewRequest({ ...newRequest, units: e.target.value })}
            required
          />
        </div>

        <div style={{ marginBottom: '1em' }}>
          <label>Hospital Name:</label><br />
          <input
            type="text"
            value={newRequest.hospitalName}
            onChange={(e) => setNewRequest({ ...newRequest, hospitalName: e.target.value })}
            required
          />
        </div>

        <div style={{ marginBottom: '1em' }}>
          <label>Urgency:</label><br />
          <select
            value={newRequest.urgency}
            onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
          >
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        <button type="submit">Create Request</button>
      </form>

      <h4>Your Blood Requests</h4>
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p>No blood requests created yet.</p>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req.id} style={{ marginBottom: '1em' }}>
              <strong>Blood Type:</strong> {req.bloodType}<br />
              <strong>Units Needed:</strong> {req.units}<br />
              <strong>Status:</strong> {req.status}<br />
              <strong>Urgency:</strong> {req.urgency}<br />
              <button onClick={() => markFulfilled(req.id)}>Mark Fulfilled</button>
              <DonorResponses requestId={req.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Component to show donor responses for a request
function DonorResponses({ requestId }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const fetchResponses = async () => {
      const responsesRef = collection(db, 'requests', requestId, 'responses');
      const snapshot = await getDocs(responsesRef);
      setResponses(snapshot.docs.map(doc => doc.data()));
    };
    fetchResponses();
  }, [requestId]);

  if (responses.length === 0) return <p>No donor responses yet.</p>;

  return (
    <div>
      <h5>Donor Responses:</h5>
      <ul>
        {responses.map((resp, idx) => (
          <li key={idx}>
            {resp.name} ({resp.contact}) - Offered at {resp.offeredAt?.toDate().toLocaleString() || 'Unknown'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HospitalDashboard;
