const Navbar = () => {
    return (
      <nav className="flex items-center justify-between p-4 bg-white shadow-md">
        <div className="flex items-center space-x-4">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <h1 className="text-xl font-bold text-gray-800">Food Delivery</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-600 hover:text-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full hover:bg-gray-200">
            Sign up
          </button>
        </div>
      </nav>
    );
  };