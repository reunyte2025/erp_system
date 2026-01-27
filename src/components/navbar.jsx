import { useState } from 'react';
import { Search, Bell, ChevronDown, User, Settings, Lock, LogOut, Menu } from 'lucide-react';

export default function Navbar({ user, onLogout, pageTitle, onToggleSidebar }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const notifications = [
    { id: 1, text: 'New order received', time: '5 minutes ago', unread: true },
    { id: 2, text: 'Payment processed successfully', time: '1 hour ago', unread: true },
    { id: 3, text: 'Inventory update required', time: '2 hours ago', unread: false },
  ];

  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      onLogout();
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserTypeColor = (userType) => {
    const colors = {
      'Super Admin': 'bg-red-500',
      'Admin': 'bg-orange-500',
      'Manager': 'bg-cyan-500',
      'Accountant': 'bg-purple-500',
      'Employee': 'bg-green-500',
      'User': 'bg-blue-500',
    };
    return colors[userType] || 'bg-gray-500';
  };

  // Extract user data with proper fallbacks matching your API structure
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';
  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : user?.username || 'User';
  
  const userType = user?.role?.name || 'User';
  const userEmail = user?.email || '';

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full">
          <div className="flex items-center h-14 sm:h-16">
            {/* Left side - Logo & Title with Dark Background */}
            <div className="bg-slate-800 h-full flex items-center px-3 sm:px-4 lg:px-6 xl:px-10 flex-shrink-0 w-auto lg:w-72 gap-3">
              {/* Mobile Menu Button - Integrated in navbar */}
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>

              {/* Logo - Always visible on all devices */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-base sm:text-lg lg:text-xl font-bold text-white">E</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-white whitespace-nowrap">ERP System</h1>
                </div>
              </div>
            </div>

            {/* Center Section - Page Title */}
            <div className="flex-1 flex items-center justify-between px-3 sm:px-4 lg:px-6">
              {/* Page Title - Responsive */}
              <div className="flex-shrink-0 min-w-0">
                <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-800 truncate">
                  {pageTitle}
                </h2>
              </div>

              {/* Right side - Search & Actions */}
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
                {/* Search Bar - Fixed position next to actions */}
                <div className="hidden md:flex">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-48 lg:w-64 xl:w-80 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50 text-sm"
                    />
                  </div>
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

                  {isNotificationOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsNotificationOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                        <div className="p-3 sm:p-4 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                        </div>
                        <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                notification.unread ? 'bg-teal-50' : ''
                              }`}
                            >
                              <p className="text-xs sm:text-sm text-gray-800">{notification.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                            </div>
                          ))}
                        </div>
                        <div className="p-2 sm:p-3 text-center border-t border-gray-200">
                          <button className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium">
                            View all notifications
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 lg:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Profile"
                  >
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {getInitials(fullName)}
                        </span>
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-tight whitespace-nowrap">
                          {fullName}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight whitespace-nowrap">
                          {userType}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden md:block" />
                  </button>

                  {isProfileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                        <div className="p-3 sm:p-4 border-b border-gray-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                              <span className="text-base sm:text-lg font-bold text-white">
                                {getInitials(fullName)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                {fullName}
                              </p>
                              <div className="flex items-center mt-1">
                                <span
                                  className={`inline-block px-2 py-0.5 text-xs font-semibold text-white rounded-full ${getUserTypeColor(userType)}`}
                                >
                                  {userType}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 truncate">{userEmail}</p>
                        </div>

                        <div className="py-2">
                          <button className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2">
                            <User className="w-4 h-4" />
                            My Profile
                          </button>
                          <button className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                          <button className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Change Password
                          </button>
                        </div>

                        <div className="border-t border-gray-200 py-2">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}