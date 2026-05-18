import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import logo from "../../imports/burger-shot-logo.png";

import {
  Calendar,
  dateFnsLocalizer,
  View,
  Event as BigCalendarEvent,
  SlotInfo,
} from "react-big-calendar";

import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import {
  format,
  parse,
  startOfWeek,
  getDay,
  addHours,
} from "date-fns";

import { enUS } from "date-fns/locale";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "../../styles/calendar.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

interface Employee {
  full_name: string;
  role: string;
}

interface EventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  full_name: string;
  role: string;
}

export default function StaffScheduler({ onBack }: any) {
  const [events, setEvents] = useState<EventType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [view, setView] = useState<View>("week");
  const [requests, setRequests] = useState<any[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [editEmployee, setEditEmployee] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSlot, setCreateSlot] = useState<{ start: Date; end: Date } | null>(null);

  // 🔹 Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role");

      if (data) setEmployees(data);
    };

    fetchEmployees();
  }, []);

  // 🔹 Load events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from("schedule_events")
        .select("*");

      if (data) {
        setEvents(
          data.map((e) => ({
            id: e.id,
            title: `${e.full_name} (${e.role})`,
            start: new Date(e.start_time),
            end: new Date(e.end_time),
            full_name: e.full_name,
            role: e.role,
          }))
        );
      }
    };

    fetchEvents();
  }, []);

  // 🔹 Load requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("schedule_requests")
        .select("*")
        .order("created_at", { ascending: false });

      setRequests(data || []);
    };

    fetchRequests();
  }, []);

  // 🔹 Add event
  const handleAddEvent = async () => {
    if (!selectedEmployee || !start || !end) return;

    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        full_name: selectedEmployee,
        role: selectedRole,
        start_time: start,
        end_time: end,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setEvents((prev) => [
      ...prev,
      {
        id: data.id,
        title: `${selectedEmployee} (${selectedRole})`,
        start: new Date(start),
        end: new Date(end),
        full_name: selectedEmployee,
        role: selectedRole,
      },
    ]);

    setSelectedEmployee("");
    setStart("");
    setEnd("");
    setShowCreateModal(false);
  };

  // 🔹 Handle slot selection (click on calendar to create event)
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setCreateSlot({ start: slotInfo.start, end: slotInfo.end });
    setStart(format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"));
    setEnd(format(slotInfo.end, "yyyy-MM-dd'T'HH:mm"));
    setShowCreateModal(true);
  };

  // 🔹 Handle event click (open edit modal)
  const handleSelectEvent = (event: EventType) => {
    setEditingEvent(event);
    setEditEmployee(event.full_name);
    setEditStart(format(event.start, "yyyy-MM-dd'T'HH:mm"));
    setEditEnd(format(event.end, "yyyy-MM-dd'T'HH:mm"));
    setShowEditModal(true);
  };

  // 🔹 Update event
  const handleUpdateEvent = async () => {
    if (!editingEvent || !editEmployee || !editStart || !editEnd) return;

    const emp = employees.find((e) => e.full_name === editEmployee);
    if (!emp) return;

    const { error } = await supabase
      .from("schedule_events")
      .update({
        full_name: editEmployee,
        role: emp.role,
        start_time: editStart,
        end_time: editEnd,
      })
      .eq("id", editingEvent.id);

    if (error) {
      console.error(error);
      return;
    }

    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEvent.id
          ? {
              ...e,
              title: `${editEmployee} (${emp.role})`,
              start: new Date(editStart),
              end: new Date(editEnd),
              full_name: editEmployee,
              role: emp.role,
            }
          : e
      )
    );

    setShowEditModal(false);
    setEditingEvent(null);
  };

  // 🔹 Delete event
  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", editingEvent.id);

    if (error) {
      console.error(error);
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
    setShowEditModal(false);
    setEditingEvent(null);
  };

  // 🔹 Drag update
  const handleEventDrop = async ({ event, start, end }: any) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({
        start_time: start,
        end_time: end,
      })
      .eq("id", event.id);

    if (error) console.error(error);

    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id ? { ...e, start, end } : e
      )
    );
  };

  // 🔹 Resize update
  const handleEventResize = async ({ event, start, end }: any) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({
        start_time: start,
        end_time: end,
      })
      .eq("id", event.id);

    if (error) console.error(error);

    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id ? { ...e, start, end } : e
      )
    );
  };

  // 🔹 Approve request
  const approveRequest = async (req: any) => {
    await supabase
      .from("schedule_requests")
      .update({ status: "approved" })
      .eq("id", req.id);

    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        full_name: req.full_name,
        role: req.role,
        start_time: req.start_time,
        end_time: req.end_time,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setEvents((prev) => [
        ...prev,
        {
          id: data.id,
          title: `${req.full_name} (${req.role})`,
          start: new Date(req.start_time),
          end: new Date(req.end_time),
          full_name: req.full_name,
          role: req.role,
        },
      ]);
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, status: "approved" } : r
      )
    );
  };

  // 🔹 Reject request
  const rejectRequest = async (req: any) => {
    const note = prompt("Enter rejection note");
    if (!note) return;

    await supabase
      .from("schedule_requests")
      .update({
        status: "rejected",
        note,
      })
      .eq("id", req.id);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id ? { ...r, status: "rejected", note } : r
      )
    );
  };

  // Custom event component
  const EventComponent = ({ event }: { event: EventType }) => (
    <div className="text-xs font-medium">
      <div>{event.full_name}</div>
      <div className="text-[10px] opacity-80">{event.role}</div>
    </div>
  );

  // Role color mapping
  const eventStyleGetter = (event: EventType) => {
    const colorMap: Record<string, string> = {
      owner: "#dc2626",
      manager: "#2563eb",
      employee: "#16a34a",
      trainee: "#ca8a04",
    };

    const backgroundColor = colorMap[event.role.toLowerCase()] || "#6b7280";

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  };

  const pendingRequests = (requests || []).filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3">
          {/* Top row - Logo and Back button */}
          <div className="flex justify-between items-center mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <img src={logo} className="h-8 sm:h-10" alt="Logo" />
              <h1 className="text-base sm:text-xl font-semibold text-gray-800">Staff Scheduler</h1>
            </div>

            <button
              onClick={onBack}
              className="px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs sm:text-sm font-medium transition"
            >
              Back
            </button>
          </div>

          {/* Bottom row - View switcher and Create button */}
          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 sm:gap-2 sm:mt-0">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView("day")}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded transition ${
                  view === "day"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView("week")}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded transition ${
                  view === "week"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded transition ${
                  view === "month"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Month
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedEmployee("");
                setStart("");
                setEnd("");
                setShowCreateModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              + Create Schedule
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* CALENDAR */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{
              height: window.innerWidth < 640 ? "calc(100vh - 250px)" : "calc(100vh - 280px)",
              minHeight: window.innerWidth < 640 ? "500px" : "600px"
            }}
            defaultView="week"
            view={view}
            onView={setView}
            views={["day", "week", "month"]}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            resizable
            components={{
              event: EventComponent,
            }}
            eventPropGetter={eventStyleGetter}
            popup
          />
        </div>

        {/* PENDING REQUESTS SECTION */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Pending Schedule Requests ({pendingRequests.length})
            </h2>

            <div className="space-y-3">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition gap-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      {r.full_name}
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {r.role}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {format(new Date(r.start_time), "MMM d, yyyy h:mm a")} -{" "}
                      {format(new Date(r.end_time), "h:mm a")}
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-2 sm:flex-shrink-0">
                    <button
                      onClick={() => approveRequest(r)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectRequest(r)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Create Schedule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => {
                    const emp = employees.find((u) => u.full_name === e.target.value);
                    setSelectedEmployee(e.target.value);
                    setSelectedRole(emp?.role || "");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp, i) => (
                    <option key={i} value={emp.full_name}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={handleAddEvent}
                disabled={!selectedEmployee || !start || !end}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedEmployee("");
                  setStart("");
                  setEnd("");
                }}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Edit Schedule</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={editEmployee}
                  onChange={(e) => setEditEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp, i) => (
                    <option key={i} value={emp.full_name}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={handleUpdateEvent}
                disabled={!editEmployee || !editStart || !editEnd}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Update
              </button>
              <button
                onClick={handleDeleteEvent}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
