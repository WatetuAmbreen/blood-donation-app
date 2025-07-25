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
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { CSVLink } from 'react-csv';

function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editedRequest, setEditedRequest] = useState({});
  const [filters, setFilters] = useState({ urgency: '', status: '' });
  const [newRequest, setNewRequest] = useState({ bloodType: '', units: '', urgency: 'Normal' });

  const navigate = useNavigate();

  // Load hospital info and requests on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        const userData = userDoc.docs[0]?.data();
        setHospitalName(userData?.hospitalName || userData?.name || '');
        setHospitalLocation(userData?.location || '');
        fetchRequests(user.uid);
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch requests and donor responses
  const fetchRequests = async (uid) => {
    const reqSnap = await getDocs(query(collection(db, 'requests'), where('hospitalId', '==', uid)));
    const list = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setRequests(list);

    const responseMap = {};
    const donorIds = new Set();

    for (const req of reqSnap.docs) {
      const resSnap = await getDocs(collection(db, 'requests', req.id, 'responses'));
      const arr = resSnap.docs.map(d => {
        const data = d.data();
        if (data.donorId) donorIds.add(data.donorId);
        return { id: d.id, ...data };
      });
      responseMap[req.id] = arr;
    }

    const donorNameMap = {};
    if (donorIds.size) {
      const nameSnap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', Array.from(donorIds))));
      nameSnap.docs.forEach(d => donorNameMap[d.id] = d.data().name || 'Unnamed Donor');
    }

    for (let reqId in responseMap) {
      responseMap[reqId] = responseMap[reqId].map(res => ({
        ...res,
        donorName: donorNameMap[res.donorId] || res.donorId
      }));
    }

    setResponses(responseMap);
  };

  // Handlers: Delete, Edit, Save, Mark Donated, Fulfilled
  const handleDelete = async id => {
    if (!window.confirm('Delete this request?')) return;
    await deleteDoc(doc(db, 'requests', id));
    fetchRequests(currentUser.uid);
  };

  const handleEdit = req => {
  setEditingRequestId(req.id);
  setEditedRequest({ ...req });
};

const handleSave = async () => {
  await updateDoc(doc(db, 'requests', editingRequestId), editedRequest);
  setEditingRequestId(null);
  fetchRequests(currentUser.uid);
};


  const handleMarkDonated = async (reqId, resId) => {
    await updateDoc(doc(db, 'requests', reqId, 'responses', resId), { donated: true });
    fetchRequests(currentUser.uid);
  };

  const handleMarkFulfilled = async reqId => {
    await updateDoc(doc(db, 'requests', reqId), { status: 'Fulfilled' });
    fetchRequests(currentUser.uid);
  };

  const handleAddRequest = async () => {
    if (!newRequest.bloodType || !newRequest.units) {
      alert('Fill in all fields!');
      return;
    }

    await addDoc(collection(db, 'requests'), {
      ...newRequest,
      units: parseInt(newRequest.units),
      hospitalId: currentUser.uid,
      hospitalName,
      location: hospitalLocation,
      status: 'Pending',
      createdAt: serverTimestamp(),
    });

    setNewRequest({ bloodType: '', units: '', urgency: 'Normal' });
    fetchRequests(currentUser.uid);
  };

  // Filter and categorize
  const filtered = requests.filter(r =>
    (!filters.urgency || r.urgency === filters.urgency) &&
    (!filters.status || r.status === filters.status)
  );
  const pendingReqs = filtered.filter(r => r.status !== 'Fulfilled');
  const doneReqs = filtered.filter(r => r.status === 'Fulfilled');
  const summary = { total: requests.length, pending: pendingReqs.length, fulfilled: doneReqs.length };

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-800">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-red-600">🏥 Hospital Dashboard</h2>
          <p className="text-gray-600 text-sm">Hospital: {hospitalName}</p>
        </div>
        <div className="space-x-4">
          <span>Welcome, {hospitalName}</span>
          <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline">Admin</button>
          <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      <section className="mb-6">
        <h3 className="font-semibold text-lg">📊 Summary</h3>
        <p>Total requests: {summary.total} | Pending: {summary.pending} | Fulfilled: {summary.fulfilled}</p>
      </section>

      <section className="bg-white rounded shadow p-4 mb-6">
        <h3 className="font-semibold mb-2">➕ New Blood Request</h3>
        <div className="space-y-2">
          <label>Blood Type:</label>
          <select className="w-full border rounded p-2" value={newRequest.bloodType} onChange={e => setNewRequest({...newRequest, bloodType: e.target.value})}>
            <option value="">Select</option>
            {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
          <label>Units:</label>
          <input type="number" className="w-full border rounded p-2" value={newRequest.units} onChange={e => setNewRequest({...newRequest, units: e.target.value})} />
          <label>Urgency:</label>
          <select className="w-full border rounded p-2" value={newRequest.urgency} onChange={e => setNewRequest({...newRequest, urgency: e.target.value})}>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
          </select>
         <label>Location (URL):</label>
<input
  type="text"
  value={hospitalLocation}
  onChange={(e) => setHospitalLocation(e.target.value)}
  className="w-full border rounded p-2"
/>
          <button onClick={handleAddRequest} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add Request</button>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold">🔍 Filter</h3>
        <div className="flex gap-4">
          <div>
            <label>Urgency:</label>
            <select className="border rounded p-2" value={filters.urgency} onChange={e => setFilters({...filters, urgency: e.target.value})}>
              <option value="">All</option><option value="Normal">Normal</option><option value="Urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label>Status:</label>
            <select className="border rounded p-2" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="">All</option><option value="Pending">Pending</option><option value="Fulfilled">Fulfilled</option>
            </select>
          </div>
        </div>
      </section>

      <CSVLink data={requests} filename={`requests_${Date.now()}.csv`} className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4">
        📤 Export to CSV
      </CSVLink>

      <section>
        <h3 className="text-xl font-semibold mb-2">📋 Pending Requests</h3>
        {pendingReqs.length === 0 ? <p>No pending requests.</p> :
          pendingReqs.map(req => (
            <div key={req.id} className="bg-white p-4 rounded shadow mb-4">
              <p><strong>Blood Type:</strong> {req.bloodType}</p>
              <p><strong>Units:</strong> {req.units}</p>
              <p><strong>Urgency:</strong> {req.urgency}</p>
              {req.location && <a href={req.location} className="text-blue-600 hover:underline">📍 Location</a>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => handleEdit(req)} className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                <button onClick={() => handleDelete(req.id)} className="bg-red-500 text-white px-2 py-1 rounded">Delete</button>
                <button onClick={() => handleMarkFulfilled(req.id)} className="bg-green-600 text-white px-2 py-1 rounded">Mark Fulfilled</button>
              </div>

              {responses[req.id]?.length > 0 && (
                <div className="mt-4">
                  <strong>🧑 Donors:</strong>
                  <ul className="list-disc pl-5">
                    {responses[req.id].map(res =>
                      <li key={res.id} className="mt-2">
                        <p>Donor: <code>{res.donorName}</code></p>
                        <p>Units: {res.unitsDonated}</p>
                        <p>Phone: {res.phone || 'N/A'}</p>
                        <p>Availability: {res.availability || 'Not provided'}</p>
                        <p>Status: {res.donated ? '✅ Donated' : '⏳ Pending'}</p>
                        {!res.donated && (
                          <button onClick={() => handleMarkDonated(req.id, res.id)} className="mt-1 px-2 py-1 text-white bg-green-500 rounded">Mark as Donated</button>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))
        }
      </section>

      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-2">✅ Fulfilled Requests</h3>
        {doneReqs.length === 0 ? <p>No fulfilled requests yet.</p> :
          doneReqs.map(req => (
            <div key={req.id} className="bg-gray-50 p-4 rounded shadow mb-4 opacity-75">
              <p><strong>Blood Type:</strong> {req.bloodType}</p>
              <p><strong>Units:</strong> {req.units}</p>
              <p><strong>Urgency:</strong> {req.urgency}</p>
              {responses[req.id]?.length > 0 && (
                <div className="mt-2">
                  <strong>Donors who donated:</strong>
                  <ul className="list-disc pl-5">
                    {responses[req.id].filter(r => r.donated).map(res =>
                      <li key={res.id}>
                        <p>{res.donorName} – Units: {res.unitsDonated}, Status: ✅ Donated</p>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))
        }
      </section>
    </div>
  );
}

export default HospitalDashboard;
