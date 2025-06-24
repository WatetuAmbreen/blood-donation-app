import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        toast.error('Not logged in');
        navigate('/');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          toast.error('User data not found');
          navigate('/');
          return;
        }

        const role = userDoc.data().role;
        console.log('User role:', role);

        if (role === 'donor') {
          navigate('/donor-dashboard');
        } else if (role === 'hospital') {
          navigate('/hospital-dashboard');
        } else {
          toast.error('User role not recognized. Please contact support.');
          navigate('/');
        }
      } catch (err) {
        console.error('Dashboard redirect error:', err);
        toast.error('Failed to load user role.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div>
      <ToastContainer />
      {loading ? <p>Loading dashboard...</p> : null}
    </div>
  );
}

export default Dashboard;
