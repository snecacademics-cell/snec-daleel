import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfaDp6H7eSToA5f4_TFhNGBU9OLoq4E7U",
  authDomain: "snec-daleel.firebaseapp.com",
  projectId: "snec-daleel",
  storageBucket: "snec-daleel.firebasestorage.app",
  messagingSenderId: "201962463257",
  appId: "1:201962463257:web:f56ceb2157984e1de28a88",
  measurementId: "G-N0WFFPDXJP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_PIN = "9999";
let activeStudent = null;
let currentClassIdx = 0;

const PHASE1_CLASSES = [
  {
    id: 1,
    title: "Class 01: Introduction to Fundamentals",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    activity: "Write a brief summary of the foundational concepts discussed in the lecture.",
    questions: [
      { q: "What is the primary objective of Phase 1?", options: ["Foundational Study", "Final Review", "Exam Prep"], ans: 0 },
      { q: "Classes are scheduled on which days?", options: ["Sat & Tue", "Sun & Wed", "Daily"], ans: 0 }
    ]
  },
  {
    id: 2,
    title: "Class 02: Core Principles & Methodology",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    activity: "Analyze the 3 core principles mentioned in this class.",
    questions: [
      { q: "How many core principles were outlined?", options: ["3", "5", "7"], ans: 0 }
    ]
  }
];

function showToast(text, type = 'success') {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast-msg";
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color:#05c46b;"></i>' : '<i class="fa-solid fa-triangle-exclamation" style="color:#fc5c65;"></i>';
  toast.innerHTML = `${icon} <span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

window.switchAuthTab = function(t) {
  document.getElementById("tabSignIn").classList.toggle("active", t === 'signin');
  document.getElementById("tabSignUp").classList.toggle("active", t === 'signup');
  document.getElementById("formSignIn").style.display = t === 'signin' ? 'block' : 'none';
  document.getElementById("formSignUp").style.display = t === 'signup' ? 'block' : 'none';
};

document.addEventListener("DOMContentLoaded", () => {
  const session = sessionStorage.getItem("snec_user");
  if (session) {
    activeStudent = JSON.parse(session);
    if (activeStudent.role === 'admin') {
      showAdminDashboard();
    } else if (activeStudent.status === "Active" || activeStudent.status === "Approved") {
      showStudentDashboard();
    } else {
      showPendingScreen();
    }
  }
  setupKeyboardNavigation();
});

window.handleSignIn = async function(e) {
  e.preventDefault();
  const val = document.getElementById("loginInput").value.trim();

  if (val === ADMIN_PIN) {
    activeStudent = { role: "admin", name: "Super Admin" };
    sessionStorage.setItem("snec_user", JSON.stringify(activeStudent));
    showToast("Logged in as Super Admin!");
    showAdminDashboard();
    return;
  }

  try {
    const snap = await getDoc(doc(db, "students", val));
    if (snap.exists()) {
      activeStudent = { id: snap.id, ...snap.data() };
      sessionStorage.setItem("snec_user", JSON.stringify(activeStudent));
      if (activeStudent.status === "Active" || activeStudent.status === "Approved") {
        showStudentDashboard();
        showToast("Welcome back, " + activeStudent.fullName);
      } else {
        showPendingScreen();
      }
    } else {
      showToast("Mobile number not found. Please Sign Up.", "error");
    }
  } catch (ex) {
    showToast("Error: " + ex.message, "error");
  }
};

window.handleSignUp = function(e) {
  e.preventDefault();
  document.getElementById("admFullName").value = document.getElementById("regName").value.trim();
  document.getElementById("admMobile").value = document.getElementById("regMobile").value.trim();
  document.getElementById("admEmail").value = document.getElementById("regEmail").value.trim();

  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "flex";
};

window.submitAdmission = async function(e) {
  e.preventDefault();
  const mobile = document.getElementById("admMobile").value.trim();
  const payload = {
    fullName: document.getElementById("admFullName").value.trim(),
    mobileNumber: mobile,
    email: document.getElementById("admEmail").value.trim(),
    dateOfBirth: document.getElementById("admDob").value,
    currentProfession: document.getElementById("admProfession").value.trim(),
    religiousDegree: document.getElementById("admReligiousDeg").value.trim(),
    place: document.getElementById("admPlace").value.trim(),
    address: document.getElementById("admAddress").value.trim(),
    registeredAt: new Date().toISOString(),
    status: "Pending Approval",
    completedClasses: 0
  };

  await setDoc(doc(db, "students", mobile), payload);
  activeStudent = payload;
  sessionStorage.setItem("snec_user", JSON.stringify(activeStudent));
  showToast("Application submitted successfully!");
  showPendingScreen();
};

window.logout = function() {
  sessionStorage.clear();
  activeStudent = null;
  document.getElementById("appSidebar").style.display = "none";
  document.getElementById("appMain").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("pendingSection").style.display = "none";
  document.getElementById("authSection").style.display = "flex";
  document.getElementById("loginInput").value = "";
  showToast("Logged out successfully.");
};

function showStudentDashboard() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("pendingSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "flex";
  document.getElementById("appMain").style.display = "flex";
  document.getElementById("adminMenuTab").style.display = "none";
  document.getElementById("userRoleDisplay").innerText = "Student Portal";
  document.getElementById("welcomeStudent").innerText = "Welcome, " + activeStudent.fullName;

  renderClassList();
  switchNavTab('dashboard');
}

function renderClassList() {
  const completedCount = activeStudent.completedClasses || 0;
  const container = document.getElementById("classListContainer");
  container.innerHTML = "";

  PHASE1_CLASSES.forEach((cls, index) => {
    const isCompleted = index < completedCount;
    const isUnlocked = index <= completedCount;

    container.innerHTML += `
      <div class="class-item ${!isUnlocked ? 'locked' : ''}" onclick="openClass(${index})">
        <div>
          <strong>${cls.title}</strong>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;"><i class="fa-solid fa-video"></i> Video Lecture &bull; Study Material &bull; MCQ Test</div>
        </div>
        <span class="status-badge ${isCompleted ? 'badge-done' : (isUnlocked ? 'badge-pending' : 'badge-lock')}">
          ${isCompleted ? 'Completed' : (isUnlocked ? 'Start Class' : 'Locked')}
        </span>
      </div>
    `;
  });
}

window.openClass = function(idx) {
  currentClassIdx = idx;
  const cls = PHASE1_CLASSES[idx];

  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewClasses").style.display = "none";
  document.getElementById("viewAdmin").style.display = "none";
  document.getElementById("viewClassroom").style.display = "block";

  document.getElementById("crTitle").innerText = cls.title;
  document.getElementById("crVideo").src = cls.videoUrl;
  document.getElementById("crPdf").href = cls.pdfUrl;
  document.getElementById("crActivityText").innerText = cls.activity;
  document.getElementById("activityAnswer").value = "";

  const mcqDiv = document.getElementById("mcqContainer");
  mcqDiv.innerHTML = "";
  cls.questions.forEach((q, qIdx) => {
    mcqDiv.innerHTML += `
      <div style="margin-bottom: 15px;">
        <p style="font-weight: 600; font-size: 13px; margin: 0 0 8px 0;">${qIdx + 1}. ${q.q}</p>
        ${q.options.map((opt, optIdx) => `
          <label class="mcq-option">
            <input type="radio" name="mcq_${qIdx}" value="${optIdx}" required> ${opt}
          </label>
        `).join('')}
      </div>
    `;
  });
};

window.submitAssessment = async function() {
  const cls = PHASE1_CLASSES[currentClassIdx];
  let correct = 0;

  for (let i = 0; i < cls.questions.length; i++) {
    const selected = document.querySelector(`input[name="mcq_${i}"]:checked`);
    if (!selected) {
      showToast("Please answer all questions before submitting!", "error");
      return;
    }
    if (parseInt(selected.value) === cls.questions[i].ans) {
      correct++;
    }
  }

  const scorePercent = Math.round((correct / cls.questions.length) * 100);

  if (scorePercent >= 60) {
    showToast(`Congratulations! Passed with ${scorePercent}%. Next class unlocked!`);
    const newProgress = Math.max(activeStudent.completedClasses || 0, currentClassIdx + 1);
    await updateDoc(doc(db, "students", activeStudent.mobileNumber || activeStudent.id), { completedClasses: newProgress });
    activeStudent.completedClasses = newProgress;
    sessionStorage.setItem("snec_user", JSON.stringify(activeStudent));
    renderClassList();
    switchNavTab('classes');
  } else {
    showToast(`Score: ${scorePercent}%. Minimum 60% required to pass. Please retry!`, "error");
  }
};

async function showAdminDashboard() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("pendingSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "flex";
  document.getElementById("appMain").style.display = "flex";
  document.getElementById("adminMenuTab").style.display = "flex";
  document.getElementById("userRoleDisplay").innerText = "SUPER ADMIN PORTAL";

  switchNavTab('admin');
  
  const tb = document.getElementById("adminStudentList");
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;">Fetching applicants...</td></tr>';
  
  try {
    const snap = await getDocs(collection(db, "students"));
    tb.innerHTML = "";
    snap.forEach(d => {
      const s = d.data();
      tb.innerHTML += `
        <tr>
          <td><strong>${s.fullName || '-'}</strong></td>
          <td>${s.mobileNumber || d.id}</td>
          <td>${s.place || '-'}</td>
          <td><span class="status-badge ${s.status === 'Active' || s.status === 'Approved' ? 'badge-done' : 'badge-pending'}">${s.status || 'Pending'}</span></td>
          <td>${s.status !== 'Active' && s.status !== 'Approved' ? `<button class="btn-approve" onclick="approveCandidate('${d.id}')"><i class="fa-solid fa-check"></i> Approve</button>` : '<strong style="color:#05c46b;"><i class="fa-solid fa-circle-check"></i> Approved</strong>'}</td>
          <td>
            <button class="btn-pill-secondary" onclick="openAttendance('${d.id}', '${s.fullName || 'Student'}')"><i class="fa-solid fa-calendar-days"></i> Manage</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tb.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading data: ${err.message}</td></tr>`;
  }
}

window.approveCandidate = async function(id) {
  await updateDoc(doc(db, "students", id), { status: "Active" });
  showToast("Student Approved Successfully!");
  showAdminDashboard();
};

function showPendingScreen() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "none";
  document.getElementById("appMain").style.display = "none";
  document.getElementById("pendingSection").style.display = "flex";
}

window.switchNavTab = function(tabName, event) {
  if (event) {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  }
  document.getElementById("viewDashboard").style.display = tabName === 'dashboard' ? 'block' : 'none';
  document.getElementById("viewClasses").style.display = tabName === 'classes' ? 'block' : 'none';
  document.getElementById("viewClassroom").style.display = 'none';
  document.getElementById("viewAdmin").style.display = tabName === 'admin' ? 'block' : 'none';
};

function setupKeyboardNavigation() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      const focusable = Array.from(document.querySelectorAll('input, select, button'));
      const index = focusable.indexOf(e.target);
      if (index > -1 && index + 1 < focusable.length) {
        e.preventDefault();
        focusable[index + 1].focus();
      }
    }
  });
}

/* ATTENDANCE FUNCTIONS */
let currentAttStudentId = null;

window.openAttendance = async function(studentId, studentName) {
  currentAttStudentId = studentId;
  document.getElementById("attStudentName").innerText = studentName;
  document.getElementById("attDate").valueAsDate = new Date();
  document.getElementById("attendanceModal").style.display = "flex";
  await loadAttendanceHistory(studentId);
};

window.closeAttendance = function() {
  document.getElementById("attendanceModal").style.display = "none";
  currentAttStudentId = null;
};

window.saveAttendance = async function() {
  if (!currentAttStudentId) return;
  const date = document.getElementById("attDate").value;
  const status = document.getElementById("attStatus").value;
  
  if (!date) {
    showToast("Please select a date", "error");
    return;
  }

  try {
    const studentRef = doc(db, "students", currentAttStudentId);
    const docSnap = await getDoc(studentRef);
    let attendanceData = docSnap.exists() && docSnap.data().attendance ? docSnap.data().attendance : {};
    
    attendanceData[date] = status;

    await updateDoc(studentRef, { attendance: attendanceData });
    showToast(`Attendance marked as ${status} for ${date}`);
    await loadAttendanceHistory(currentAttStudentId);
  } catch (err) {
    showToast("Error saving attendance: " + err.message, "error");
  }
};

async function loadAttendanceHistory(studentId) {
  const historyDiv = document.getElementById("attendanceHistory");
  historyDiv.innerHTML = "Loading...";
  
  try {
    const docSnap = await getDoc(doc(db, "students", studentId));
    if (docSnap.exists() && docSnap.data().attendance) {
      const attendanceData = docSnap.data().attendance;
      let html = "<ul style='padding-left: 20px; margin:0;'>";
      for (const [date, status] of Object.entries(attendanceData)) {
        let color = status === 'Present' ? '#05c46b' : '#fc5c65';
        html += `<li style="margin-bottom: 5px;"><strong>${date}:</strong> <span style="color:${color}; font-weight:bold;">${status}</span></li>`;
      }
      html += "</ul>";
      historyDiv.innerHTML = Object.keys(attendanceData).length > 0 ? html : "No attendance records found.";
    } else {
      historyDiv.innerHTML = "No attendance records found.";
    }
  } catch (err) {
    historyDiv.innerHTML = "Error loading history.";
  }
}
