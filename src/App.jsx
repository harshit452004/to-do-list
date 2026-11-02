import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Brain,
  Quote,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  Save,
  BookMarked,
  AlertCircle,
  History,
} from "lucide-react";
import "./App.css";

const STORAGE_KEY = "student-attendance-tracker-v1";

const quotes = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "The secret of getting ahead is getting started.",
  "Don't watch the clock; do what it does. Keep going.",
  "Great things are done by a series of small things brought together.",
  "Your future is created by what you do today, not tomorrow.",
  "It always seems impossible until it's done.",
  "Believe you can and you're halfway there.",
  "The expert in anything was once a beginner.",
  "Learning never exhausts the mind.",
  "Small progress is still progress.",
  "Dream big. Start small. Act now.",
  "Discipline is choosing what you want most over what you want now.",
  "Push yourself, because no one else is going to do it for you.",
  "Don't limit your challenges. Challenge your limits.",
  "The harder you work, the luckier you get.",
  "Focus on progress, not perfection.",
  "Education is the most powerful weapon you can use to change the world.",
  "A little progress each day adds up to big results.",
  "Your only limit is your mind.",
  "Make today count.",
];

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const todayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyData = {
  subjects: [],
  timetable: [],
  attendance: {},
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyData;

    const parsed = JSON.parse(saved);

    return {
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
      attendance:
        parsed.attendance && typeof parsed.attendance === "object"
          ? parsed.attendance
          : {},
    };
  } catch {
    return emptyData;
  }
}

function getPercentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function getDay(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return days[(day + 6) % 7];
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";

  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState("Home");
  const [date, setDate] = useState(todayDate());
  const [mobileOpen, setMobileOpen] = useState(false);

  const [subjectForm, setSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectError, setSubjectError] = useState("");

  const [classForm, setClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classFormData, setClassFormData] = useState({
    subjectId: "",
    day: "Monday",
    start: "09:00",
    end: "10:00",
    room: "",
  });
  const [classError, setClassError] = useState("");

  // SAVE DATA AUTOMATICALLY
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateData = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // SUBJECT-WISE STATISTICS
  const subjectStats = useMemo(() => {
    return data.subjects.map((subject) => {
      const records = Object.values(data.attendance).filter(
        (a) => a.subjectId === subject.id,
      );

      const marked = records.filter(
        (a) => a.status === "present" || a.status === "absent",
      );

      const present = marked.filter((a) => a.status === "present").length;

      const rated = records.filter(
        (a) => a.status === "present" && Number.isFinite(a.rating),
      );

      const average = rated.length
        ? rated.reduce((sum, a) => sum + a.rating, 0) / rated.length
        : null;

      return {
        ...subject,
        total: marked.length,
        present,
        absent: marked.length - present,
        attendance: getPercentage(present, marked.length),
        average,
        understanding: average === null ? null : Math.round(average * 10),
      };
    });
  }, [data]);

  // OVERALL STATISTICS
  const totalClasses = subjectStats.reduce((sum, s) => sum + s.total, 0);

  const totalPresent = subjectStats.reduce((sum, s) => sum + s.present, 0);

  const ratedRecords = Object.values(data.attendance).filter(
    (a) => a.status === "present" && Number.isFinite(a.rating),
  );

  const overallUnderstanding = ratedRecords.length
    ? Math.round(
        (ratedRecords.reduce((sum, a) => sum + a.rating, 0) /
          ratedRecords.length) *
          10,
      )
    : 0;

  const overallAttendance = getPercentage(totalPresent, totalClasses);

  // CLASSES FOR SELECTED DATE
  const todayClasses = useMemo(() => {
    const day = getDay(date);

    return data.timetable
      .filter((c) => c.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [data.timetable, date]);

  const todayKey = (classId) => `${date}_${classId}`;

  const getRecord = (classId) => data.attendance[todayKey(classId)];

  // MARK OR EDIT ATTENDANCE
  function markAttendance(classItem, status) {
    const key = todayKey(classItem.id);

    setData((prev) => {
      const existing = prev.attendance[key] || {};

      const updatedRecord = {
        ...existing,
        subjectId: classItem.subjectId,
        classId: classItem.id,
        date,
        status,
      };

      // Remove understanding rating when marking absent.
      if (status === "absent") {
        delete updatedRecord.rating;
      }

      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [key]: updatedRecord,
        },
      };
    });
  }

  // RATE UNDERSTANDING
  function rateUnderstanding(classItem, rating) {
    const key = todayKey(classItem.id);

    setData((prev) => {
      const existing = prev.attendance[key];

      if (!existing || existing.status !== "present") {
        return prev;
      }

      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [key]: { ...existing, rating },
        },
      };
    });
  }

  // EDIT OLD ATTENDANCE RECORD
  function editHistoryAttendance(record, status) {
    const key = `${record.date}_${record.classId}`;

    setData((prev) => {
      const existing = prev.attendance[key];

      if (!existing) return prev;

      const updatedRecord = {
        ...existing,
        status,
      };

      if (status === "absent") {
        delete updatedRecord.rating;
      }

      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [key]: updatedRecord,
        },
      };
    });
  }

  // SUBJECT MANAGEMENT
  function openSubjectForm(subject = null) {
    setEditingSubject(subject);
    setSubjectName(subject?.name || "");
    setSubjectCode(subject?.code || "");
    setSubjectError("");
    setSubjectForm(true);
  }

  function saveSubject(e) {
    e.preventDefault();

    const name = subjectName.trim();

    if (!name) {
      setSubjectError("Please enter a subject name.");
      return;
    }

    const duplicate = data.subjects.some(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() &&
        s.id !== editingSubject?.id,
    );

    if (duplicate) {
      setSubjectError("This subject already exists.");
      return;
    }

    if (editingSubject) {
      updateData(
        "subjects",
        data.subjects.map((s) =>
          s.id === editingSubject.id
            ? { ...s, name, code: subjectCode.trim() }
            : s,
        ),
      );
    } else {
      updateData("subjects", [
        ...data.subjects,
        {
          id: makeId(),
          name,
          code: subjectCode.trim(),
        },
      ]);
    }

    setSubjectForm(false);
  }

  function deleteSubject(id) {
    if (
      !window.confirm(
        "Delete this subject? Its timetable entries and attendance history will also be deleted.",
      )
    )
      return;

    setData((prev) => ({
      subjects: prev.subjects.filter((s) => s.id !== id),

      timetable: prev.timetable.filter((c) => c.subjectId !== id),

      attendance: Object.fromEntries(
        Object.entries(prev.attendance).filter(([, a]) => a.subjectId !== id),
      ),
    }));
  }

  // TIMETABLE MANAGEMENT
  function openClassForm(item = null) {
    setEditingClass(item);
    setClassError("");

    setClassFormData(
      item
        ? {
            subjectId: item.subjectId,
            day: item.day,
            start: item.start,
            end: item.end,
            room: item.room || "",
          }
        : {
            subjectId: data.subjects[0]?.id || "",
            day: "Monday",
            start: "09:00",
            end: "10:00",
            room: "",
          },
    );

    setClassForm(true);
  }

  function saveClass(e) {
    e.preventDefault();

    const { subjectId, day, start, end, room } = classFormData;

    if (!subjectId) {
      setClassError("Please select a subject.");
      return;
    }

    if (end <= start) {
      setClassError("End time must be after start time.");
      return;
    }

    const conflict = data.timetable.some(
      (c) =>
        c.id !== editingClass?.id &&
        c.day === day &&
        start < c.end &&
        end > c.start,
    );

    if (conflict) {
      setClassError("This time overlaps with another class.");
      return;
    }

    const item = {
      id: editingClass?.id || makeId(),
      subjectId,
      day,
      start,
      end,
      room: room.trim(),
    };

    updateData(
      "timetable",
      editingClass
        ? data.timetable.map((c) => (c.id === editingClass.id ? item : c))
        : [...data.timetable, item],
    );

    setClassForm(false);
  }

  function deleteClass(id) {
    if (
      !window.confirm(
        "Delete this timetable class? Past attendance records will remain.",
      )
    )
      return;

    updateData(
      "timetable",
      data.timetable.filter((c) => c.id !== id),
    );
  }

  // NAVIGATION
  const navItems = [
    { name: "Home", icon: LayoutDashboard },
    { name: "Today", icon: CalendarCheck },
    { name: "Subjects", icon: BookOpen },
    { name: "Timetable", icon: CalendarDays },
  ];

  const quoteIndex =
    Math.floor(new Date(`${todayDate()}T12:00:00`).getTime() / 86400000) %
    quotes.length;

  const quote = quotes[quoteIndex];

  function navigate(name) {
    setPage(name);
    setMobileOpen(false);
  }

  const subjectNameById = (id) =>
    data.subjects.find((s) => s.id === id)?.name || "Unknown subject";

  const dayToday = getDay(date);

  // ATTENDANCE HISTORY
  const historyRecords = Object.values(data.attendance)
    .filter(
      (record) =>
        record.date !== date &&
        data.subjects.some((s) => s.id === record.subjectId),
    )
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;

      return String(a.classId).localeCompare(String(b.classId));
    });

  return (
    <div className="app-shell">
      {/* SIDEBAR */}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap size={25} />
          </div>

          <div>
            <h2>StudyTrack</h2>
            <span>Academic companion</span>
          </div>

          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>

        <div className="nav-label">MENU</div>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-link ${page === item.name ? "active" : ""}`}
                onClick={() => navigate(item.name)}
              >
                <Icon size={19} />
                <span>{item.name}</span>

                {page === item.name && (
                  <ChevronRight size={16} className="nav-arrow" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Brain size={23} />
            <strong>Keep learning!</strong>
            <p>Consistency today creates success tomorrow.</p>
          </div>

          <span className="sidebar-version">
            STUDYTRACK · YOUR PERSONAL SPACE
          </span>
        </div>
      </aside>

      {mobileOpen && (
        <div className="overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* MAIN CONTENT */}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setMobileOpen(true)}>
              <Menu />
            </button>

            <div>
              <span className="breadcrumb">
                STUDYTRACK / {page.toUpperCase()}
              </span>

              <h2>{page === "Home" ? "Dashboard" : page}</h2>
            </div>
          </div>

          <div className="top-date">
            <CalendarDays size={17} />
            {formatDate(todayDate())}
          </div>
        </header>

        <div className="page-content">
          {/* HOME */}

          {page === "Home" && (
            <>
              <section className="welcome-row">
                <div>
                  <h1>Welcome back! 👋</h1>
                  <p>Stay consistent, keep learning and track your progress.</p>
                </div>

                <button
                  className="primary-btn"
                  onClick={() => navigate("Today")}
                >
                  <Plus size={18} /> Mark attendance
                </button>
              </section>

              <section className="stats-grid">
                <StatCard
                  icon={<BookOpen />}
                  label="Total Subjects"
                  value={data.subjects.length}
                  color="blue"
                  detail="Subjects you're studying"
                />

                <StatCard
                  icon={<CalendarCheck />}
                  label="Overall Attendance"
                  value={`${overallAttendance}%`}
                  color="green"
                  detail={`${totalPresent} of ${totalClasses} classes attended`}
                />

                <StatCard
                  icon={<Brain />}
                  label="Understanding"
                  value={`${overallUnderstanding}%`}
                  color="purple"
                  detail={`${ratedRecords.length} classes rated`}
                />

                <StatCard
                  icon={<TrendingUp />}
                  label="Classes Attended"
                  value={totalPresent}
                  color="orange"
                  detail={`${totalClasses - totalPresent} classes missed`}
                />
              </section>

              <section className="quote-card">
                <div className="quote-icon">
                  <Quote size={25} />
                </div>

                <div className="quote-content">
                  <span>DAILY MOTIVATION</span>
                  <h3>"{quote}"</h3>
                  <p>A new thought for every day.</p>
                </div>
              </section>

              <section className="content-grid">
                <div className="panel subjects-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Subject performance</h3>
                      <p>Attendance and understanding by subject</p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => navigate("Subjects")}
                    >
                      View all <ChevronRight size={15} />
                    </button>
                  </div>

                  {subjectStats.length === 0 ? (
                    <EmptyState
                      icon={<BookOpen />}
                      title="No subjects yet"
                      text="Add your first subject to start tracking."
                      action="Add subject"
                      onClick={() => openSubjectForm()}
                    />
                  ) : (
                    <div className="subject-progress-list">
                      {subjectStats.map((s) => (
                        <div className="subject-progress" key={s.id}>
                          <div className="subject-progress-top">
                            <div className="subject-dot">
                              {s.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="subject-progress-name">
                              <strong>{s.name}</strong>
                              <span>
                                {s.code || `${s.total} recorded classes`}
                              </span>
                            </div>

                            <div className="subject-metrics">
                              <strong>{s.attendance}%</strong>
                              <span>Attendance</span>
                            </div>

                            <div className="subject-metrics understanding-metric">
                              <strong>
                                {s.understanding === null
                                  ? "—"
                                  : `${s.understanding}%`}
                              </strong>
                              <span>Understanding</span>
                            </div>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${s.attendance}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Today's schedule</h3>
                      <p>{formatDate(todayDate())}</p>
                    </div>

                    <button
                      className="icon-btn"
                      onClick={() => navigate("Today")}
                    >
                      <ChevronRight />
                    </button>
                  </div>

                  {data.timetable.filter((c) => c.day === getDay(todayDate()))
                    .length === 0 ? (
                    <div className="empty-small">
                      <CalendarDays size={30} />
                      <p>No classes scheduled today.</p>

                      <button
                        className="text-btn"
                        onClick={() => navigate("Timetable")}
                      >
                        Create timetable
                      </button>
                    </div>
                  ) : (
                    <div className="quick-list">
                      {data.timetable
                        .filter((c) => c.day === getDay(todayDate()))
                        .sort((a, b) => a.start.localeCompare(b.start))
                        .map((c) => {
                          const rec = data.attendance[`${todayDate()}_${c.id}`];

                          return (
                            <div className="quick-class" key={c.id}>
                              <div className="time-line">
                                <span>{formatTime(c.start)}</span>
                                <i />
                              </div>

                              <div className="quick-class-info">
                                <strong>{subjectNameById(c.subjectId)}</strong>
                                <span>
                                  {formatTime(c.start)} – {formatTime(c.end)}
                                </span>
                              </div>

                              {rec?.status === "present" ? (
                                <span className="mini-status present">
                                  Present
                                </span>
                              ) : rec?.status === "absent" ? (
                                <span className="mini-status absent">
                                  Absent
                                </span>
                              ) : (
                                <span className="mini-status pending">
                                  Pending
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* TODAY */}

          {page === "Today" && (
            <>
              <section className="welcome-row">
                <div>
                  <h1>Daily attendance</h1>
                  <p>Record your attendance and track what you learned.</p>
                </div>

                <div className="date-control">
                  <label htmlFor="attendance-date">Select date</label>

                  <input
                    id="attendance-date"
                    type="date"
                    value={date}
                    max={todayDate()}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </section>

              <div className="day-banner">
                <CalendarCheck size={22} />

                <div>
                  <strong>{formatDate(date)}</strong>
                  <span>{todayClasses.length} scheduled classes</span>
                </div>
              </div>

              {todayClasses.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="No classes scheduled"
                  text={`There are no classes in your timetable for ${dayToday}. Add a class in Timetable to see it here.`}
                  action="Open timetable"
                  onClick={() => navigate("Timetable")}
                />
              ) : (
                <div className="today-list">
                  {todayClasses.map((c, index) => {
                    const rec = getRecord(c.id);
                    const subject = data.subjects.find(
                      (s) => s.id === c.subjectId,
                    );

                    return (
                      <div className="today-card" key={c.id}>
                        <div className="today-card-top">
                          <div className="class-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="today-class-info">
                            <h3>{subject?.name || "Unknown subject"}</h3>

                            <span>
                              <Clock size={14} />
                              {formatTime(c.start)} – {formatTime(c.end)}
                              {c.room ? ` · ${c.room}` : ""}
                            </span>
                          </div>

                          {rec?.status && (
                            <span className={`status-pill ${rec.status}`}>
                              {rec.status === "present" ? "Present" : "Absent"}
                            </span>
                          )}
                        </div>

                        <div className="attendance-actions">
                          <span className="field-caption">MARK ATTENDANCE</span>

                          <div className="button-group">
                            <button
                              className={`attendance-btn present-btn ${
                                rec?.status === "present" ? "selected" : ""
                              }`}
                              onClick={() => markAttendance(c, "present")}
                            >
                              <CheckCircle2 size={17} /> Present
                            </button>

                            <button
                              className={`attendance-btn absent-btn ${
                                rec?.status === "absent" ? "selected" : ""
                              }`}
                              onClick={() => markAttendance(c, "absent")}
                            >
                              <XCircle size={17} /> Absent
                            </button>
                          </div>
                        </div>

                        {rec?.status === "present" && (
                          <div className="rating-section">
                            <div className="rating-heading">
                              <div>
                                <Brain size={18} />
                                <strong>How much did you understand?</strong>
                              </div>

                              <span>
                                {Number.isFinite(rec.rating)
                                  ? `${rec.rating}/10`
                                  : "Not rated yet"}
                              </span>
                            </div>

                            <div className="rating-buttons">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <button
                                  key={n}
                                  className={
                                    rec.rating === n ? "rating-selected" : ""
                                  }
                                  onClick={() => rateUnderstanding(c, n)}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>

                            <div className="rating-scale">
                              <span>Not understood</span>
                              <span>Fully understood</span>
                            </div>
                          </div>
                        )}

                        {rec?.status === "absent" && (
                          <p className="absent-note">
                            <AlertCircle size={15} />
                            Understanding rating is available only for attended
                            classes.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ATTENDANCE HISTORY */}

              <div className="panel history-panel">
                <div className="panel-heading">
                  <div>
                    <h3>
                      <History size={17} className="heading-icon" />
                      Attendance history
                    </h3>
                    <p>View and edit attendance recorded on previous dates.</p>
                  </div>
                </div>

                {historyRecords.length === 0 ? (
                  <div className="history-empty">
                    <History size={27} />
                    <p>No previous attendance records found.</p>
                    <span>
                      Your previous attendance entries will appear here.
                    </span>
                  </div>
                ) : (
                  <div className="history-list">
                    {historyRecords.map((record) => (
                      <div
                        className="history-row"
                        key={`${record.date}_${record.classId}`}
                      >
                        <div className="history-info">
                          <strong>{subjectNameById(record.subjectId)}</strong>

                          <span>{formatDate(record.date)}</span>

                          <span className="history-rating">
                            {Number.isFinite(record.rating)
                              ? `Understanding: ${record.rating}/10`
                              : "No rating"}
                          </span>
                        </div>

                        <span className={`status-pill ${record.status}`}>
                          {record.status === "present" ? "Present" : "Absent"}
                        </span>

                        <div className="history-actions">
                          <button
                            className={`attendance-btn present-btn ${
                              record.status === "present" ? "selected" : ""
                            }`}
                            onClick={() =>
                              editHistoryAttendance(record, "present")
                            }
                          >
                            <CheckCircle2 size={15} />
                            Present
                          </button>

                          <button
                            className={`attendance-btn absent-btn ${
                              record.status === "absent" ? "selected" : ""
                            }`}
                            onClick={() =>
                              editHistoryAttendance(record, "absent")
                            }
                          >
                            <XCircle size={15} />
                            Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* SUBJECTS */}

          {page === "Subjects" && (
            <>
              <section className="welcome-row">
                <div>
                  <h1>My subjects</h1>
                  <p>
                    Manage your subjects and monitor individual performance.
                  </p>
                </div>

                <button
                  className="primary-btn"
                  onClick={() => openSubjectForm()}
                >
                  <Plus size={18} /> Add subject
                </button>
              </section>

              <div className="subject-summary">
                <div>
                  <span>Total subjects</span>
                  <strong>{data.subjects.length}</strong>
                </div>

                <div>
                  <span>Classes recorded</span>
                  <strong>{totalClasses}</strong>
                </div>

                <div>
                  <span>Classes attended</span>
                  <strong>{totalPresent}</strong>
                </div>
              </div>

              {subjectStats.length === 0 ? (
                <EmptyState
                  icon={<BookOpen />}
                  title="No subjects added"
                  text="Start by adding the subjects you are studying this semester."
                  action="Add your first subject"
                  onClick={() => openSubjectForm()}
                />
              ) : (
                <div className="subject-cards">
                  {subjectStats.map((s) => (
                    <div className="subject-card" key={s.id}>
                      <div className="subject-card-heading">
                        <div className="subject-icon">
                          {s.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="subject-card-title">
                          <h3>{s.name}</h3>
                          <span>{s.code || "No subject code"}</span>
                        </div>

                        <div className="card-actions">
                          <button
                            className="icon-btn"
                            title="Edit"
                            onClick={() => openSubjectForm(s)}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            className="icon-btn delete-icon"
                            title="Delete"
                            onClick={() => deleteSubject(s.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="subject-card-stats">
                        <div>
                          <span>Attendance</span>
                          <strong>{s.attendance}%</strong>
                        </div>

                        <div>
                          <span>Understanding</span>
                          <strong>
                            {s.understanding === null
                              ? "—"
                              : `${s.understanding}%`}
                          </strong>
                        </div>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${s.attendance}%` }}
                        />
                      </div>

                      <div className="subject-card-footer">
                        <span>{s.present} attended</span>
                        <span>{s.absent} absent</span>
                        <span>{s.total} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TIMETABLE */}

          {page === "Timetable" && (
            <>
              <section className="welcome-row">
                <div>
                  <h1>My timetable</h1>
                  <p>Plan and organize your weekly classes.</p>
                </div>

                <button className="primary-btn" onClick={() => openClassForm()}>
                  <Plus size={18} /> Add class
                </button>
              </section>

              {data.subjects.length === 0 ? (
                <EmptyState
                  icon={<BookMarked />}
                  title="Add subjects first"
                  text="You need to create at least one subject before adding timetable classes."
                  action="Go to subjects"
                  onClick={() => navigate("Subjects")}
                />
              ) : (
                <div className="timetable-wrap">
                  <div className="timetable-header">
                    <div>
                      <CalendarDays size={19} />
                      <strong>Weekly schedule</strong>
                    </div>

                    <span>{data.timetable.length} scheduled classes</span>
                  </div>

                  {days.map((day) => {
                    const classes = data.timetable
                      .filter((c) => c.day === day)
                      .sort((a, b) => a.start.localeCompare(b.start));

                    return (
                      <div className="timetable-day" key={day}>
                        <div className="day-name">
                          <span>{day.slice(0, 3).toUpperCase()}</span>
                          <strong>{day}</strong>
                        </div>

                        <div className="day-classes">
                          {classes.length === 0 ? (
                            <span className="no-class">No classes</span>
                          ) : (
                            classes.map((c) => (
                              <div className="timetable-class" key={c.id}>
                                <div className="class-time">
                                  {formatTime(c.start)} – {formatTime(c.end)}
                                </div>

                                <div className="timetable-class-name">
                                  <strong>
                                    {subjectNameById(c.subjectId)}
                                  </strong>
                                  <span>{c.room || "Room not specified"}</span>
                                </div>

                                <div className="card-actions">
                                  <button
                                    className="icon-btn"
                                    title="Edit"
                                    onClick={() => openClassForm(c)}
                                  >
                                    <Edit2 size={15} />
                                  </button>

                                  <button
                                    className="icon-btn delete-icon"
                                    title="Delete"
                                    onClick={() => deleteClass(c.id)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* SUBJECT MODAL */}

      {subjectForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSubjectForm(false);
          }}
        >
          <form className="modal" onSubmit={saveSubject}>
            <div className="modal-heading">
              <div>
                <h2>{editingSubject ? "Edit subject" : "Add new subject"}</h2>
                <p>Enter your subject details.</p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setSubjectForm(false)}
              >
                <X />
              </button>
            </div>

            <label>
              Subject name
              <input
                autoFocus
                placeholder="e.g. Data Structures"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
            </label>

            <label>
              Subject code (optional)
              <input
                placeholder="e.g. CS301"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
              />
            </label>

            {subjectError && <p className="form-error">{subjectError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSubjectForm(false)}
              >
                Cancel
              </button>

              <button className="primary-btn">
                <Save size={16} /> Save subject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TIMETABLE MODAL */}

      {classForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setClassForm(false);
          }}
        >
          <form className="modal" onSubmit={saveClass}>
            <div className="modal-heading">
              <div>
                <h2>{editingClass ? "Edit class" : "Add timetable class"}</h2>
                <p>Set up a class in your weekly timetable.</p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setClassForm(false)}
              >
                <X />
              </button>
            </div>

            <label>
              Subject
              <select
                value={classFormData.subjectId}
                onChange={(e) =>
                  setClassFormData({
                    ...classFormData,
                    subjectId: e.target.value,
                  })
                }
              >
                <option value="">Select subject</option>

                {data.subjects.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Day
              <select
                value={classFormData.day}
                onChange={(e) =>
                  setClassFormData({
                    ...classFormData,
                    day: e.target.value,
                  })
                }
              >
                {days.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label>
                Start time
                <input
                  type="time"
                  value={classFormData.start}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      start: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                End time
                <input
                  type="time"
                  value={classFormData.end}
                  onChange={(e) =>
                    setClassFormData({
                      ...classFormData,
                      end: e.target.value,
                    })
                  }
                />
              </label>
            </div>

            <label>
              Room / location (optional)
              <input
                placeholder="e.g. Lab 2 / Room 101"
                value={classFormData.room}
                onChange={(e) =>
                  setClassFormData({
                    ...classFormData,
                    room: e.target.value,
                  })
                }
              />
            </label>

            {classError && <p className="form-error">{classError}</p>}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setClassForm(false)}
              >
                Cancel
              </button>

              <button className="primary-btn">
                <Save size={16} /> Save class
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// STATISTICS CARD

function StatCard({ icon, label, value, color, detail }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>

      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

// EMPTY STATE

function EmptyState({ icon, title, text, action, onClick }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>

      {action && (
        <button className="primary-btn" onClick={onClick}>
          <Plus size={17} /> {action}
        </button>
      )}
    </div>
  );
}

export default App;
