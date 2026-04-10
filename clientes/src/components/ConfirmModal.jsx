import { useEffect } from "react";

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // danger, warning, info, success
  loading = false,
  icon = null 
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: (
        <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: "bg-red-500/20 border-red-500/50",
      headerBorder: "bg-gradient-to-r from-red-600 via-red-500 to-red-600",
      confirmBg: "bg-red-600 hover:bg-red-700 border-red-500",
      warningBg: "bg-red-900/10 border-red-500/20",
      warningText: "text-red-300",
    },
    warning: {
      icon: (
        <svg className="h-8 w-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: "bg-yellow-500/20 border-yellow-500/50",
      headerBorder: "bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600",
      confirmBg: "bg-yellow-600 hover:bg-yellow-700 border-yellow-500",
      warningBg: "bg-yellow-900/10 border-yellow-500/20",
      warningText: "text-yellow-300",
    },
    info: {
      icon: (
        <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-blue-500/20 border-blue-500/50",
      headerBorder: "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600",
      confirmBg: "bg-blue-600 hover:bg-blue-700 border-blue-500",
      warningBg: "bg-blue-900/10 border-blue-500/20",
      warningText: "text-blue-300",
    },
    success: {
      icon: (
        <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-green-500/20 border-green-500/50",
      headerBorder: "bg-gradient-to-r from-green-600 via-green-500 to-green-600",
      confirmBg: "bg-green-600 hover:bg-green-700 border-green-500",
      warningBg: "bg-green-900/10 border-green-500/20",
      warningText: "text-green-300",
    },
  };

  const currentStyle = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={loading ? undefined : onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md transform transition-all duration-300 scale-100 opacity-100">
        {/* Modal Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 shadow-2xl border border-primary-500/30 backdrop-blur-xl">
          {/* Header */}
          <div className={`absolute top-0 left-0 w-full h-1 ${currentStyle.headerBorder}`}></div>
          
          {/* Icon and Title */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Animated Icon */}
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${currentStyle.iconBg} border animate-pulse`}>
              {icon || currentStyle.icon}
            </div>
            
            {/* Title */}
            <h3 className="text-center text-xl font-bold text-white mb-2">
              {title}
            </h3>
            
            {/* Message */}
            <p className="text-center text-sm text-primary-400/80 leading-relaxed">
              {message}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="px-6 pb-6">
            <div className="flex gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-medium text-primary-300 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-0 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              
              {/* Confirm Button */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-3 text-sm font-medium text-white ${currentStyle.confirmBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-offset-0 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary-500 rounded-full opacity-20 blur-sm"></div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-primary-500 rounded-full opacity-10 blur-md"></div>
        </div>
      </div>
    </div>
  );
}
