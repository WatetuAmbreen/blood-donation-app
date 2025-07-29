// DonorDashboard.js with donor comment feature and donation rules reminder
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function DonorDashboard() {
  const [requests, setRequests] = useState([]);
  const [donationHistory, setDonationHistory] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [donorBloodType, setDonorBloodType] = useState('');
  const [donorName, setDonorName] = useState('');
  const [filters, setFilters] = useState({ urgency: '', status: '', bloodType: '' });
  const [eligibleReminder, setEligibleReminder] = useState(false);
  const [editingDonationId, setEditingDonationId] = useState(null);
  const [editedUnits, setEditedUnits] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedAvailability, setEditedAvailability] = useState('');
  const [fulfilledRequests, setFulfilledRequests] = useState(new Set());
  const [availabilityInputs, setAvailabilityInputs] = useState({});
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const navigate = useNavigate();

  // Fetch current user and their info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
        const donorData = userDoc.docs[0]?.data();
        setDonorBloodType(donorData?.bloodType || '');
        setDonorName(donorData?.name || '');
        setFilters(prev => ({ ...prev, bloodType: donorData?.bloodType || '' }));
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch all requests and donation history
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'requests'));
        const requestsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(requestsList);
        const fulfilled = new Set(requestsList.filter(req => req.status === 'Fulfilled').map(req => req.id));
        setFulfilledRequests(fulfilled);
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
        const allRequests = allRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const history = [];
        let mostRecentDate = null;

        for (const req of allRequests) {
          const responsesRef = collection(db, 'requests', req.id, 'responses');
          const q = query(responsesRef, where('donorId', '==', currentUser.uid));
          const responseSnapshot = await getDocs(q);
          responseSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const offeredDate = data.offeredAt?.toDate();
            if (offeredDate && (!mostRecentDate || offeredDate > mostRecentDate)) {
              mostRecentDate = offeredDate;
            }
            history.push({
              id: docSnap.id,
              requestId: req.id,
              hospitalName: req.hospitalName,
              bloodType: req.bloodType,
              urgency: req.urgency,
              status: req.status,
              offeredAt: offeredDate?.toLocaleString() || 'N/A',
              responseDocId: docSnap.id,
              phone: data.phone,
              unitsDonated: data.unitsDonated,
              availability: data.availability || ''
            });
          });
        }

        if (mostRecentDate) {
          const now = new Date();
          const daysSince = (now - mostRecentDate) / (1000 * 60 * 60 * 24);
          if (daysSince >= 90) setEligibleReminder(true);
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

  // Submit a donation offer
  const handleDonate = async (req) => {
    try {
      const responsesRef = collection(db, 'requests', req.id, 'responses');
      const existing = await getDocs(query(responsesRef, where('donorId', '==', currentUser.uid)));
      if (!availabilityInputs[req.id]) return alert('Please enter your availability.');
      if (!currentUser || !donorBloodType) return alert('Missing donor information.');
      if (existing.size > 0) return alert('You have already offered to donate for this request.');

      const allowedUnits = req.urgency === 'Urgent' ? 2 : 1;
      await addDoc(responsesRef, {
        donorId: currentUser.uid,
        offeredAt: serverTimestamp(),
        phone: '',
        unitsDonated: allowedUnits,
        availability: availabilityInputs[req.id]
      });
      alert('Donation offer recorded.');
      window.location.reload();
    } catch (error) {
      console.error('Donation error:', error);
      alert('Donation failed.');
    }
  };

  // Edit an existing donation
  const handleEditDonation = (donation) => {
    setEditingDonationId(donation.responseDocId);
    setEditedUnits(donation.unitsDonated);
    setEditedPhone(donation.phone);
    setEditedAvailability(donation.availability);
  };

  const handleSaveDonationEdit = async (requestId, responseId) => {
    try {
      await updateDoc(doc(db, 'requests', requestId, 'responses', responseId), {
        unitsDonated: Number(editedUnits),
        phone: editedPhone,
        availability: editedAvailability
      });
      alert('Donation updated.');
      setEditingDonationId(null);
      window.location.reload();
    } catch (error) {
      alert('Update failed.');
    }
  };

  const handleCancelEdit = () => setEditingDonationId(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCancelDonation = async (requestId, responseId) => {
    if (!window.confirm('Cancel this donation?')) return;
    try {
      await deleteDoc(doc(db, 'requests', requestId, 'responses', responseId));
      alert('Donation cancelled.');
      window.location.reload();
    } catch {
      alert('Cancellation failed.');
    }
  };

  // Submit encouraging comment
  const handleSubmitComment = async () => {
    if (!comment.trim()) return alert('Please write a comment before submitting.');
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'donorComments'), {
        donorId: currentUser.uid,
        donorName,
        comment,
        createdAt: serverTimestamp()
      });
      alert('Thank you for sharing your encouragement!');
      setComment('');
    } catch (error) {
      alert('Failed to submit comment: ' + error.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Filter logic
  const filteredRequests = requests.filter(req => (
    (!filters.urgency || req.urgency === filters.urgency) &&
    (!filters.status || req.status === filters.status) &&
    (!filters.bloodType || req.bloodType === filters.bloodType)
  ));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600">🩸 Donor Dashboard</h2>
          <div className="space-x-4">
            <span className="text-gray-700 font-medium">Welcome, {donorName}</span>
            <button onClick={() => navigate('/profile')} className="text-blue-600 hover:underline">Edit Profile</button>
            <button onClick={handleLogout} className="text-red-600 hover:underline">Logout</button>
          </div>
        </div>

          {/* Eligibility Rules Section */}
           <div className="mb-10 bg-white p-6 rounded shadow border border-red-200">
          <h3 className="text-xl font-bold text-red-600 mb-4">🩺 Blood Donation Eligibility</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
            <li>You must be at least <strong>16 to 65 years old</strong> (with parental consent if under 18).</li>
            <li>You must weigh at least <strong>50 kg (110 lbs)</strong> and maximum of <strong> 120kg</strong>.</li>
            <li>You should be in good general health and feel well on the day of donation.</li>
            <li>Wait at least <strong>90 days</strong> between whole blood donations.</li>
            <li>No recent infections, major surgeries, or vaccinations in the past few weeks.</li>
            <li>No tattoos or piercings done in the last <strong>6 months</strong>.</li>
            <li>Not currently taking antibiotics or certain medications like <strong> diabetes, epilepsy, or hypertension</strong> (check with hospital staff).</li>
            <li>Have a valid form of ID and be hydrated before donation.</li>
          </ul>
         <div className="mt-6"></div> {/* Line break added here */}
          <h3 className="text-xl font-bold text-red-600 mb-4">🩺 Before You Donate</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
            <li>Eat a healthy meal at least 6 hours prior.</li>
            <li>Drink at least half a litre of water.</li>
            <li>Avoid alcohol for 24 hours before donation.</li>
                  </ul>
        </div>

        {/* Eligibility reminder */}
        {eligibleReminder && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            🎉 You are now eligible to donate blood again!
          </div>
        )}

        {/* Filters + Requests */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Filters */}
          <div>
            <h3 className="text-lg font-semibold mb-2">🔍 Filter Requests</h3>
            <div className="space-y-3">
              <select className="w-full p-2 border rounded" value={filters.urgency} onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}>
                <option value="">All Urgencies</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
              <select className="w-full p-2 border rounded" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Fulfilled">Fulfilled</option>
              </select>
              <select className="w-full p-2 border rounded" value={filters.bloodType} onChange={(e) => setFilters({ ...filters, bloodType: e.target.value })}>
                <option value="">All Blood Types</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>

          {/* Donation Requests */}
          <div>
            <h3 className="text-lg font-semibold mb-2">📋 Available Requests</h3>
            {loadingRequests ? <p>Loading...</p> : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="p-4 bg-white rounded shadow">
                    <p><strong>Blood Type:</strong> {req.bloodType}</p>
                    <p><strong>Units:</strong> {req.units}</p>
                    <p><strong>Hospital:</strong> {req.hospitalName}</p>
                    <p><strong>Urgency:</strong> {req.urgency}</p>
                    {req.location && <a href={req.location} target="_blank" className="text-blue-600 hover:underline">📍 Location</a>}
                    <input
                      type="text"
                      placeholder="Your availability..."
                      value={availabilityInputs[req.id] || ''}
                      onChange={(e) => setAvailabilityInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="mt-2 w-full p-2 border rounded"
                    />
                    <button
                      onClick={() => handleDonate(req)}
                      className="mt-2 text-sm text-white bg-red-600 px-4 py-1 rounded"
                    >
                      Donate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Donor encouragement comment */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-2">💬 Encourage Others</h3>
          <p className="mb-2 text-sm text-gray-600">Share a short message to inspire others to donate blood.</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
            className="w-full p-2 border rounded resize-none"
            placeholder="E.g., 'Donating blood is the easiest way to save lives. Do it!'"
          ></textarea>
          <button
            onClick={handleSubmitComment}
            disabled={submittingComment}
            className={`mt-2 px-4 py-2 rounded text-white ${submittingComment ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {submittingComment ? 'Submitting...' : 'Submit Comment'}
          </button>
        </div>

        {/* Donation History */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">🕘 Donation History</h3>
          {loadingHistory ? <p>Loading history...</p> : (
            <div className="space-y-4">
              {donationHistory.map((donation) => (
                <div key={donation.id} className="p-4 bg-white rounded shadow">
                  <p><strong>Hospital:</strong> {donation.hospitalName}</p>
                  <p><strong>Blood Type:</strong> {donation.bloodType}</p>
                  <p><strong>Urgency:</strong> {donation.urgency}</p>
                  <p><strong>Donated At:</strong> {donation.offeredAt}</p>
                  {editingDonationId === donation.responseDocId ? (
                    <div className="space-y-2">
                      <input type="text" value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} className="w-full p-2 border rounded" />
                      <input type="number" value={editedUnits} onChange={(e) => setEditedUnits(e.target.value)} min="1" className="w-full p-2 border rounded" />
                      <input type="text" value={editedAvailability} onChange={(e) => setEditedAvailability(e.target.value)} className="w-full p-2 border rounded" />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveDonationEdit(donation.requestId, donation.responseDocId)} className="bg-blue-600 text-white px-4 py-1 rounded">Save</button>
                        <button onClick={handleCancelEdit} className="bg-gray-400 text-white px-4 py-1 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    !fulfilledRequests.has(donation.requestId) && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleCancelDonation(donation.requestId, donation.responseDocId)} className="bg-red-500 text-white px-4 py-1 rounded">Cancel</button>
                        <button onClick={() => handleEditDonation(donation)} className="bg-yellow-500 text-white px-4 py-1 rounded">Edit</button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DonorDashboard;
