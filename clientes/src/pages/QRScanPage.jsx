import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ticketsService } from "../services/tickets.service";

function QRScanPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [usedAt, setUsedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateTicket = async () => {
      try {
        setLoading(true);
        const response = await ticketsService.validateQr(token);
        setTicket(response?.ticket ?? null);
        setUsedAt(response?.used_at ?? null);
        setError(null);
      } catch (err) {
        setError(err?.data?.message || err.message || "Failed to validate QR code");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateTicket();
    }
  }, [token]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const isExpiredError =
    typeof error === "string" &&
    (error.toLowerCase().includes("expired") ||
      error.toLowerCase().includes("already used"));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Validating QR code...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div
          className={`rounded-lg p-8 max-w-md ${
            isExpiredError
              ? "bg-yellow-900/20 border border-yellow-500"
              : "bg-red-900/20 border border-red-500"
          }`}
        >
          <h1
            className={`text-xl font-bold mb-4 ${
              isExpiredError ? "text-yellow-300" : "text-red-400"
            }`}
          >
            {isExpiredError ? "QR Code Expired" : "QR Code Error"}
          </h1>
          <p className={isExpiredError ? "text-yellow-100 mb-4" : "text-red-300 mb-4"}>
            {isExpiredError
              ? "This QR code has expired or has already been used."
              : error}
          </p>
          {isExpiredError ? (
            <p className="mb-4 text-sm text-yellow-200/90">
              Ask the administrator to generate a new valid ticket QR code if this trip is still active.
            </p>
          ) : null}
          <button
            onClick={() => navigate("/login")}
            className={`text-white px-4 py-2 rounded ${
              isExpiredError
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Ticket not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Menahariya Smart Transport
          </h1>
          <p className="text-slate-400">QR validation result</p>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">
                Validation Status
              </h2>
              <div className="bg-green-900/30 border border-green-500 rounded-lg p-8">
                <div className="text-green-300 text-sm uppercase tracking-wide">
                  Valid
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  Ticket Accepted
                </div>
                <div className="mt-4 text-slate-300">
                  This QR code has been validated successfully.
                </div>
                {usedAt ? (
                  <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-slate-200">
                    Used at: {formatDate(usedAt)}
                  </div>
                ) : null}
                <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-slate-400">
                  Token: {token.substring(0, 16)}...
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Ticket Details
              </h2>

              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 mb-4 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Passenger</h3>
                    <p className="text-blue-100 text-sm">Ticket Holder</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-blue-100 text-xs mb-1">Full Name</p>
                    <p className="text-white font-semibold text-lg">
                      {ticket.passenger_name || "Unknown Passenger"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-blue-100 text-xs mb-1">Ticket ID</p>
                      <p className="text-white font-bold">#{ticket.id}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-blue-100 text-xs mb-1">Seat</p>
                      <p className="text-white font-bold">{ticket.seat_id}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 mb-4 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Journey</h3>
                    <p className="text-green-100 text-sm">Route Information</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-green-100 text-xs mb-1">Route</p>
                    <div className="flex items-center text-white">
                      <span className="font-semibold text-lg">
                        {ticket.origin || "Unknown"}
                      </span>
                      <svg
                        className="w-5 h-5 mx-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      <span className="font-semibold text-lg">
                        {ticket.destination || "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-green-100 text-xs mb-1">Departure</p>
                      <p className="text-white font-semibold">
                        {formatDate(ticket.departure_time)}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-green-100 text-xs mb-1">Arrival</p>
                      <p className="text-white font-semibold">
                        {formatDate(ticket.arrival_time)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 mb-4 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Driver & Vehicle
                    </h3>
                    <p className="text-purple-100 text-sm">Transport Details</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-purple-100 text-xs mb-1">Driver Name</p>
                    <p className="text-white font-semibold text-lg">
                      {ticket.driver_name || "Not Assigned"}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-purple-100 text-xs mb-1">Vehicle Plate</p>
                    <p className="text-white font-bold text-lg bg-white/20 rounded px-2 py-1 inline-block">
                      {ticket.plate_number || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="bg-white/20 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Status</h3>
                    <p className="text-orange-100 text-sm">Ticket Information</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-orange-100 text-xs mb-1">Status</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        ticket.status === "confirmed"
                          ? "bg-green-500 text-white"
                          : ticket.status === "reserved"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-500 text-white"
                      }`}
                    >
                      {ticket.status?.toUpperCase() || "RESERVED"}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-orange-100 text-xs mb-1">Payment</p>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        ticket.payment_status === "completed" ||
                        ticket.payment_status === "paid"
                          ? "bg-green-500 text-white"
                          : ticket.payment_status === "pending"
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-500 text-white"
                      }`}
                    >
                      {ticket.payment_status?.toUpperCase() || "PENDING"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 bg-white/10 rounded-lg p-3">
                  <p className="text-orange-100 text-xs mb-1">Issued</p>
                  <p className="text-white font-semibold">
                    {formatDate(ticket.issued_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/30 px-8 py-4 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-400">
                Issued: {formatDate(ticket.issued_at)}
              </div>
              <button
                onClick={() => navigate("/login")}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Validation Notes
          </h3>
          <ul className="space-y-2 text-slate-300">
            <li>
              1. Each QR code is single-use and becomes invalid after successful
              validation.
            </li>
            <li>
              2. Expired or already-used QR codes will be rejected by the backend.
            </li>
            <li>
              3. The ticket details shown here come directly from the validated
              backend record.
            </li>
            <li>
              4. Drivers and staff can rely on this page as a real validation
              result, not just a preview.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default QRScanPage;
