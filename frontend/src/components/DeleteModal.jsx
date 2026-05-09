import { useEffect } from "react";

export function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Account", 
  message = "Are you sure you want to delete your account? This action cannot be undone.", 
  itemName = "account",
  loading = false 
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 shadow-2xl border border-red-500/30 backdrop-blur-xl">
          {/* Warning Icon and Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Animated Warning Icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border border-red-500/50 animate-pulse">
              <svg 
                className="h-8 w-8 text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            {/* Title */}
            <h3 className="text-center text-xl font-bold text-white mb-2">
              {title}
            </h3>
            
            {/* Message */}
            <p className="text-center text-sm text-primary-400/80 leading-relaxed">
              {message}
            </p>
            
            {/* Item Name Highlight */}
            {itemName && (
              <div className="mt-3 text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                  {itemName}
                </span>
              </div>
            )}
          </div>
          
          {/* Warning Details */}
          <div className="px-6 pb-4">
            <div className="rounded-lg bg-red-900/10 border border-red-500/20 p-3">
              <div className="flex items-start space-x-2">
                <svg className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-red-300/80">
                  <p className="font-medium text-red-300 mb-1">This action cannot be undone!</p>
                  <ul className="space-y-1 text-red-400/70">
                    <li>• All your data will be permanently deleted</li>
                    <li>• You will lose access to all services</li>
                    <li>• This action is irreversible</li>
                  </ul>
                </div>
              </div>
            </div>
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
                Cancel
              </button>
              
              {/* Delete Button */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 border border-red-500 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-0 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete {itemName}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full opacity-20 blur-sm"></div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-red-500 rounded-full opacity-10 blur-md"></div>
        </div>
      </div>
    </div>
  );
}
