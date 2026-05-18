import { useEffect, useState } from "react";
import { supabase, getUserProfile } from "../../../lib/supabase";
import logo from "../../imports/burger-shot-logo.png";
import { format } from "date-fns";

interface Schedule {
  id: string;
  start_time: string;
  end_time: string;
  full_name: string;
  role: string;
}

interface ScheduleRequestType {
  id: string;
  start_time: string;
  end_time: string;
  description: string;
  status: string;
  note: string;
  created_at: string;
}

export default function ScheduleRequest({ onBack }: any) {
  const [currentSchedules, setCurrentSchedules] = useState<Schedule[]>([]);
  const [myRequests, setMyRequests] = useState<ScheduleRequestType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const profile = await getUserProfile();
    if (!profile) return;

    setUserProfile(profile);

    // Load current schedules
    const { data: schedules } = await supabase
      .from("schedule_events")
      .select("*")
      .eq("full_name", profile.full_name)
      .gte("end_time", new Date().toISOString())
      .order("start_time", { ascending: true });

    if (schedules) {
      setCurrentSchedules(schedules);
    }

    // Load my requests
    const { data: requests } = await supabase
      .from("schedule_requests")
      .select("*")
      .eq("full_name", profile.full_name)
      .order("created_at", { ascending: false });

    if (requests) {
      setMyRequests(requests);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !startDate || !endDate) return;

    setLoading(true);

    const { error } = await supabase.from("schedule_requests").insert({
      full_name: userProfile.full_name,
      role: userProfile.role,
      start_time: startDate,
      end_time: endDate,
      description: description || "",
      status: "pending",
    });

    if (error) {
      console.error("Error submitting request:", error);
      setLoading(false);
      return;
    }

    setSuccessMessage("Schedule request submitted successfully!");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setLoading(false);

    // Reload requests
    setTimeout(() => {
      setSuccessMessage("");
      loadUserData();
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={logo} className="h-10 sm:h-12" alt="Logo" />
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
                Schedule Request
              </h1>
            </div>

            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
            >
              Back to Tools
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* REQUEST FORM */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Request New Schedule
          </h2>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add any notes about your schedule request..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !startDate || !endDate}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* CURRENT SCHEDULE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            My Current Schedule
          </h2>

          {currentSchedules.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming schedules</p>
          ) : (
            <div className="space-y-3">
              {currentSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {format(new Date(schedule.start_time), "MMM d, yyyy")}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(new Date(schedule.start_time), "h:mm a")} -{" "}
                      {format(new Date(schedule.end_time), "h:mm a")}
                    </div>
                  </div>
                  <span className="mt-2 sm:mt-0 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full w-fit">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY REQUESTS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            My Schedule Requests
          </h2>

          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-sm">No schedule requests yet</p>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="text-sm text-gray-900 font-medium">
                        {format(new Date(request.start_time), "MMM d, yyyy h:mm a")}{" "}
                        - {format(new Date(request.end_time), "MMM d, yyyy h:mm a")}
                      </div>

                      {request.description && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Note:</span>{" "}
                          {request.description}
                        </div>
                      )}

                      {request.status === "rejected" && request.note && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                          <div className="text-sm font-medium text-red-900">
                            Rejection Reason:
                          </div>
                          <div className="text-sm text-red-700 mt-1">
                            {request.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
