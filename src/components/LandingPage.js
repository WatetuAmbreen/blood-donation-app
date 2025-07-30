import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase'; // adjust if path differs
import Lottie from 'lottie-react';
import heartAnimation from '../assets/animations/heart.json';
import donorAnimation from '../assets/animations/donor.json';

export default function LandingPage() {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Fetch donor comments from Firestore
    const fetchComments = async () => {
      try {
        const q = query(collection(db, 'donorComments'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => doc.data());
        setComments(fetched);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Navigation Bar */}
      <nav className="flex justify-between items-center px-6 py-4 shadow-sm border-b bg-white">
        <div className="text-2xl font-bold text-red-600 cursor-pointer" onClick={() => navigate('/')}>
          BloodDonate
        </div>
        <div className="space-x-4 text-sm font-medium">
          <button onClick={() => navigate('/login')} className="text-gray-700 hover:text-red-600 transition">Login</button>
          <button onClick={() => navigate('/register')} className="text-gray-700 hover:text-red-600 transition">Sign Up</button>
          <button onClick={() => alert('Contact us at: ambreenwatetu1@gmail.com')} className="text-gray-700 hover:text-red-600 transition">Contact Us</button>
        </div>
      </nav>

        {/* Hero Section */}
      <section className="bg-red-600 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Help Save Lives</h1>
        <p className="text-lg md:text-xl mb-6">Join our blood donation network and make a life-saving impact today.</p>
        <button onClick={() => navigate('/register')} className="bg-white text-red-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition">Get Started</button>
     </section>

           {/* How It Works */}
      <section className="py-16 px-6 bg-gray-50 text-center">
        <h2 className="text-3xl font-bold mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div>
            <div className="text-red-600 text-4xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">1. Register</h3>
            <p>Sign up as a donor or hospital admin in a few quick steps.</p>
          </div>
          <div>
            <div className="text-red-600 text-4xl mb-4">📬</div>
            <h3 className="text-xl font-semibold mb-2">2. Connect</h3>
            <p>Hospitals create blood requests. Donors get notified and respond.</p>
          </div>
          <div>
            <div className="text-red-600 text-4xl mb-4">💉</div>
            <h3 className="text-xl font-semibold mb-2">3. Donate</h3>
            <p>Donors show up at the hospital and donate based on availability.</p>
          </div>
        </div>
      </section>

{/* Why Donate? */}
<section className="py-16 px-6 text-center bg-red-50">
  <h2 className="text-3xl font-bold mb-10">Why Donate Blood?</h2>
  <div className="flex flex-col md:flex-row items-center justify-center gap-8">
    <div className="max-w-lg text-lg space-y-4 text-left">
      <p>Every 2 seconds, someone needs blood. Your donation can save up to 3 lives.</p>
      <p>Get notified only when your blood type is needed. No spam. No hassle.</p>
      <p>Track your donations and stay connected to your community.</p>
    </div>
    <Lottie animationData={donorAnimation} loop={true} className="w-60 h-60" />
  </div>
</section>

{/* Divider */}
<div className="bg-white h-8 w-full"></div>

{/* Impact Section - changed to white for contrast */}
<section className="py-16 px-6 bg-white text-center">
  <h2 className="text-3xl font-bold mb-10 text-red-600">Our Impact</h2>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto text-red-600 font-bold text-2xl">
    <div>
      <p>💉 5,000+</p>
      <p className="text-gray-700 text-base font-medium">Units Donated</p>
    </div>
    <div>
      <p>🏥 100+</p>
      <p className="text-gray-700 text-base font-medium">Hospitals Connected</p>
    </div>
    <div>
      <p>🧑‍🤝‍🧑 10,000+</p>
      <p className="text-gray-700 text-base font-medium">Donors Registered</p>
    </div>
  </div>
</section>


{/* New: Donor Comments Section */}
<section className="py-16 px-6 bg-white">
  <h2 className="text-3xl font-bold mb-10 text-center">💬 Donor Voices</h2>

  {comments.length === 0 ? (
    <p className="text-gray-500 text-center">No comments yet. Be the first to inspire others!</p>
  ) : (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
      {/* Donor Comments */}
      <div className="flex-1 space-y-6">
        {comments.map((c, index) => (
          <div key={index} className="border border-gray-200 rounded p-4 shadow-sm bg-gray-50">
            <p className="text-lg italic text-gray-700">“{c.comment}”</p>
            <p className="mt-2 text-sm font-medium text-red-600">— {c.donorName}</p>
          </div>
        ))}
      </div>

      {/* ❤️ Animated Illustration */}
      <div className="flex-shrink-0">
        <Lottie
          animationData={heartAnimation}
          loop={true}
          className="w-64 h-64 md:w-80 md:h-80"
        />
      </div>
    </div>
  )}
</section>


      {/* Final Call to Action */}
      <section className="py-16 px-6 text-center bg-gray-800 text-white">
        <h2 className="text-3xl font-bold mb-6">Be the Difference</h2>
        <p className="text-lg mb-6">Take the first step to becoming a life-saver.</p>
        <button
          onClick={() => navigate('/register')}
          className="bg-white text-red-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
        >
          Join Now
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Blood Donation App By Ambreen. All rights reserved.</p>
      </footer>
    </div>
  );
}
