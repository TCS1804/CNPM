// src/pages/Home.jsx
import React, { useState } from 'react';
import Footer from '../component/footer';
import { Menu, MapPin, ChevronDown, Search } from 'lucide-react';
import api from "../lib/axios";

const Home = () => {
    const [address, setAddress] = useState('');
    return (
      <>
        <div className="min-h-screen bg-yellow-400 overflow-hidden relative">
        {/* /* Background Image */} 
          <div 
            className="absolute right-0 bottom-0 w-full h-full bg-contain bg-no-repeat bg-right-bottom pointer-events-none hidden md:block" 
            style={{ 
              backgroundImage: "url('https://png.pngtree.com/png-clipart/20240705/original/pngtree-group-of-fast-food-products-fast-food-items-hamburger-fries-hotdog-png-image_15492773.png')",
              backgroundSize: "50%"
            }}
          />
            <div className="relative z-10">
             
              <nav className="flex justify-between items-center p-6">
              <div className="flex items-center">
                <button className="mr-4">
                <Menu size={24} color="black" />
                </button>
                <h1 className="font-sans font-bold text-xl"><span className="text-black">Eat</span>
                <span className="text-green-500">zaa</span></h1>
              </div>
              <div className="flex gap-2">
                {localStorage.getItem('user') ? (
                  <button 
                    onClick={() => {
                localStorage.removeItem('user');
                window.location.reload();
                    }} 
                    className="bg-black text-white px-4 py-1 rounded-full text-sm font-medium"
                  >
                    Log out
                  </button>
                ) : (
                  <>
                    <a href="/login" className="bg-white px-4 py-1 rounded-full text-sm font-medium">Log in</a>
                    <a href='/register' className="bg-black text-white px-4 py-1 rounded-full text-sm font-medium">Sign up</a>
                  </>
                )}
              </div>
              </nav>
              
              
                <main className="px-6 pt-8 w-full md:w-1/2 mt-30 text-center md:text-left">
                <h2 className="font-sans text-8xl font-bold mb-6 sm:text-center md:text-left">Order Food<br/> To Your Door</h2>
                
                {/* Search Form */}
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <div className="bg-white rounded-md flex-grow flex items-center px-2 py-3 border border-gray-200">
                <MapPin size={20} className="text-gray-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="Enter delivery address" 
                  className="flex-grow outline-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              
              <div className="bg-white rounded-md flex items-center px-4 py-3 border border-gray-200">
                <span className="mr-2">Deliver now</span>
                <ChevronDown size={20} className="text-gray-500" />
              </div>
              
              <button className="bg-black text-white font-medium rounded-md px-4 py-3">
                Find Food
              </button>
            </div>
            
            <p className="text-sm text-gray-700 mb-8">Sign in for your recent addresses</p>
          </main>
        </div>
        
        {/* Support Button */}
        <div className="absolute bottom-6 left-6 z-20">
          <button className="bg-gray-800 text-white p-3 rounded-full">
            <Search size={24} />
          </button>
        </div>

        <div >

        </div>
        {/* Map Section */}
      </div>
      <div className="bg-white-400 overflow-hidden relative text-center">
      {/* <div className="w-full p-4 text-center bg-white border border-gray-200 rounded-lg shadow-sm sm:p-8 dark:bg-gray-800 dark:border-gray-700"> */}
        <h5 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Work fast from anywhere
        </h5>
        <p className="mb-5 text-base text-gray-500 sm:text-lg dark:text-gray-400">
          Stay up to date and move work forward with Flowbite on iOS &amp; Android.
          Download the app today.
        </p>
        <div className="items-center justify-center space-y-4 sm:flex sm:space-y-0 sm:space-x-4 rtl:space-x-reverse">
          <a
            href="#"
            className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-300 text-white rounded-lg inline-flex items-center justify-center px-4 py-2.5 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
          >
            <svg
              className="me-3 w-7 h-7"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="apple"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
            >
              <path
                fill="currentColor"
                d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
              />
            </svg>
            <div className="text-left rtl:text-right">
              <div className="mb-1 text-xs">Download on the</div>
              <div className="-mt-1 font-sans text-sm font-semibold">
                Mac App Store
              </div>
            </div>
          </a>
          <a
            href="#"
            className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-300 text-white rounded-lg inline-flex items-center justify-center px-4 py-2.5 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
          >
            <svg
              className="me-3 w-7 h-7"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google-play"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
            >
              <path
                fill="currentColor"
                d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"
              />
            </svg>
            <div className="text-left rtl:text-right">
              <div className="mb-1 text-xs">Get in on</div>
              <div className="-mt-1 font-sans text-sm font-semibold">Google Play</div>
            </div>
          </a>
        {/* </div> */}
      </div>

      </div>
      <div className="min-h-screen bg-white-400 overflow-hidden relative">
        <div className="relative z-10 mt-10 px-6">
          <h3 className="font-sans text-2xl font-bold mb-4">Cities near me</h3>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-700">Explore nearby cities for delivery</p>
            <a href="#" className="text-blue-600 font-medium text-sm">View all 500+ cities</a>
          </div>
          <div className="w-full h-100 bg-blue-200 rounded-md overflow-hidden">
            {/* Replace with your map component or iframe */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.622024984292!2d80.63500231477457!3d7.290571994726!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae3b9e0b9b9b9b9%3A0x9b9b9b9b9b9b9b9b!2sKandy!5e0!3m2!1sen!2slk!4v1698765432100!5m2!1sen!2slk"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="Nearby Cities Map"
            ></iframe>
          </div>
        </div>
      </div>
      
            <Footer />

      </>
    );
};

export default Home;
