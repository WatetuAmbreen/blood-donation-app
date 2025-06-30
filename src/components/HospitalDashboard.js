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
  const [currentUser, setCurrentUser] = useState(null);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalLocation, setHospitalLocation] = useState('');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editedRequest, setEditedRequest] = useState({});
  const [filters, setFilters] = useState({ urgency: '', status: '' });
  const [newRequest, setNewRequest] = useState({ bloodType: '', units: '', urgency: 'Normal' });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        const userData = userDoc.docs[0]?.data();
        setHospitalName(userData?.name || '');
        setHospitalLocation(userData?.location || '');
        fetchRequests(user.uid);
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchRequests = async (uid) => {
    const snapshot = await getDocs(query(collection(db, 'requests'), where('hospitalId', '==', uid)));
    const list = await Promise.all(snapshot.docs.map(async docSnap => {
      const data = docSnap.data();
      const responsesSnapshot = await getDocs(collection(db, 'requests', docSnap.id, 'responses'));
      const donors = responsesSnapshot.docs.map(r => r.data());
      return { id: docSnap.id, ...data, donors };
    }));
    setRequests(list);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this request?');
    if (!confirmDelete) return;
    await deleteDoc(doc(db, 'requests', id));
    fetchRequests(currentUser.uid);
  };

  const handleEdit = (request) => {
    setEditingRequestId(request.id);
    setEditedRequest({ ...request });
  };

  const handleSave = async () => {
    const confirmSave = window.confirm('Save changes to this request?');
    if (!confirmSave) return;
    await updateDoc(doc(db, 'requests', editingRequestId), editedRequest);
    setEditingRequestId(null);
    fetchRequests(currentUser.uid);
  };

  const handleCancelEdit = () => {
    setEditingRequestId(null);
  };

  const handleAddRequest = async () => {
    if (!newRequest.bloodType || !newRequest.units) {
      alert('Please fill in blood type and units.');
      return;
    }
    await addDoc(collection(db, 'requests'), {
      ...newRequest,
      units: parseInt(newRequest.units),
      hospitalId: currentUser.uid,
      hospitalName: hospitalName,
      location: hospitalLocation,
      status: 'Pending',
      createdAt: serverTimestamp(),
    });
    setNewRequest({ bloodType: '', units: '', urgency: 'Normal' });
    fetchRequests(currentUser.uid);
  };

  const filteredRequests = requests.filter(req => {
    return (
      (!filters.urgency || req.urgency === filters.urgency) &&
      (!filters.status || req.status === filters.status)
    );
  });

  const summary = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending').length,
    fulfilled: requests.filter(r => r.status === 'Fulfilled').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600">🏥 Hospital Dashboard</h2>
          <div className="space-x-4">
            <span className="text-gray-700 font-medium">Welcome, {hospitalName}</span>
            <button onClick={() => navigate('/admin')} className="text-blue-600 hover:underline">Admin</button>
            <button onClick={() => signOut(auth).then(() => navigate('/'))} className="text-red-600 hover:underline">Logout</button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-white rounded shadow">
          <h3 className="text-lg font-semibold mb-2">📊 Summary</h3>
          <p>Total Requests: {summary.total}</p>
          <p>Pending: {summary.pending}</p>
          <p>Fulfilled: {summary.fulfilled}</p>
        </div>

        <div className="mb-6 p-4 bg-white rounded shadow">
          <h3 className="text-lg font-semibold mb-2">➕ New Blood Request</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Blood Type</label>
              <select value={newRequest.bloodType} onChange={(e) => setNewRequest({ ...newRequest, bloodType: e.target.value })} className="w-full p-2 border rounded">
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Units</label>
              <input type="number" value={newRequest.units} onChange={(e) => setNewRequest({ ...newRequest, units: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label>Urgency</label>
              <select value={newRequest.urgency} onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })} className="w-full p-2 border rounded">
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label>Location</label>
              <input value={hospitalLocation} readOnly className="w-full p-2 border rounded" />
            </div>
          </div>
          <button onClick={handleAddRequest} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">Add Request</button>
        </div>

        <div className="mb-6 p-4 bg-white rounded shadow">
          <h3 className="text-lg font-semibold mb-2">🔍 Filter Requests</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label>Urgency</label>
              <select value={filters.urgency} onChange={(e) => setFilters({ ...filters, urgency: e.target.value })} className="w-full p-2 border rounded">
                <option value="">All</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full p-2 border rounded">
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Fulfilled">Fulfilled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <CSVLink data={requests} filename={`requests_${Date.now()}.csv`} className="bg-green-600 text-white px-4 py-2 rounded">📤 Export Requests to CSV</CSVLink>
        </div>

        <div className="space-y-6">
          {filteredRequests.length === 0 ? (
            <p>No requests found.</p>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className="p-4 bg-white rounded shadow">
                {editingRequestId === req.id ? (
                  <div className="space-y-2">
                    <input value={editedRequest.bloodType} onChange={(e) => setEditedRequest({ ...editedRequest, bloodType: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="number" value={editedRequest.units} onChange={(e) => setEditedRequest({ ...editedRequest, units: parseInt(e.target.value) })} className="w-full p-2 border rounded" />
                    <select value={editedRequest.urgency} onChange={(e) => setEditedRequest({ ...editedRequest, urgency: e.target.value })} className="w-full p-2 border rounded">
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                    <input value={editedRequest.location} onChange={(e) => setEditedRequest({ ...editedRequest, location: e.target.value })} className="w-full p-2 border rounded" />
                    <div className="flex gap-2">
                      <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded">Save</button>
                      <button onClick={handleCancelEdit} className="bg-gray-400 text-white px-4 py-1 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p><strong>Blood Type:</strong> {req.bloodType}</p>
                    <p><strong>Units:</strong> {req.units}</p>
                    <p><strong>Urgency:</strong> {req.urgency}</p>
                    <p><strong>Status:</strong> {req.status}</p>
                    {req.location && <a href={req.location} target="_blank" className="text-blue-600 hover:underline">📍 View Location</a>}
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleEdit(req)} className="bg-yellow-500 text-white px-4 py-1 rounded">Edit</button>
                      <button onClick={() => handleDelete(req.id)} className="bg-red-500 text-white px-4 py-1 rounded">Delete</button>
                    </div>
                    {req.donors?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold">🧍 Donors Available:</h4>
                        <ul className="list-disc list-inside">
                          {req.donors.map((donor, index) => (
                            <li key={index}>{donor.phone || 'Anonymous'} - Availability: {donor.availability || 'Not specified'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default HospitalDashboard;
