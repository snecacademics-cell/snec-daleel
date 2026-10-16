import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, updateDoc, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let globalClasses = [];

let videoCompleted = false;
let pdfDownloaded = false;
let ytPlayer = null;
let lastWatchedTime = 0;

if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function showToast(text, type = 'success') {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast-msg";
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check" style="color:#05c46b;"></i>' : '<i class="fa-solid fa-triangle-exclamation" style="color:#fc5c65;"></i>';
  toast.innerHTML = `${icon} <span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

window.toggleMobileMenu = function() {
  const sb = document.getElementById("appSidebar");
  if (sb) sb.classList.toggle("active");
};

function autoCloseMobileMenu() {
  const sb = document.getElementById("appSidebar");
  if (sb && sb.classList.contains("active")) {
    sb.classList.remove("active");
  }
}

window.switchAuthTab = function(t) {
  document.getElementById("tabSignIn").classList.toggle("active", t === 'signin');
  document.getElementById("tabSignUp").classList.toggle("active", t === 'signup');
  document.getElementById("formSignIn").style.display = t === 'signin' ? 'block' : 'none';
  document.getElementById("formSignUp").style.display = t === 'signup' ? 'block' : 'none';
};

async function fetchAllClasses() {
  try {
    const snap = await getDocs(collection(db, "classes"));
    let tempClasses = [];
    snap.forEach(doc => { tempClasses.push({ docId: doc.id, ...doc.data() }); });
    tempClasses.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    globalClasses = tempClasses;
  } catch (err) { console.error("Error loading classes: ", err); }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupKeyboardNavigation();
  await fetchAllClasses();

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
    fullName: document.getElementById("admFullName").value.trim().toUpperCase(),
    mobileNumber: mobile,
    email: document.getElementById("admEmail").value.trim(),
    dateOfBirth: document.getElementById("admDob").value,
    currentProfession: document.getElementById("admProfession").value.trim(),
    religiousDegree: document.getElementById("admReligiousDeg").value.trim(),
    place: document.getElementById("admPlace").value.trim(),
    address: document.getElementById("admAddress").value.trim(),
    registeredAt: new Date().toISOString(),
    status: "Pending Approval",
    completedClasses: 0,
    phase: "Pending",
    attendance: {}
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
  location.reload();
};

/* =========================================
   STUDENT PORTAL
   ========================================= */

async function showStudentDashboard() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("pendingSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "flex";
  document.getElementById("appMain").style.display = "flex";
  document.getElementById("userRoleDisplay").innerText = "Student Portal";
  
  if(document.getElementById("navStudentDashboard")) document.getElementById("navStudentDashboard").style.display = "flex";
  if(document.getElementById("navStudentClasses")) document.getElementById("navStudentClasses").style.display = "flex";
  if(document.getElementById("navAdminPending")) document.getElementById("navAdminPending").style.display = "none";
  if(document.getElementById("navAdminApproved")) document.getElementById("navAdminApproved").style.display = "none";
  if(document.getElementById("navAdminAttendance")) document.getElementById("navAdminAttendance").style.display = "none";
  if(document.getElementById("navAdminManage")) document.getElementById("navAdminManage").style.display = "none";
  if(document.getElementById("navAdminFee")) document.getElementById("navAdminFee").style.display = "none";

  const dName = activeStudent.fullName ? activeStudent.fullName.toUpperCase() : "Student";
  document.getElementById("welcomeStudent").innerText = "Welcome, " + dName;

  await checkStudentFeeStatus();
  await checkStudentAttendanceSummary();
  await fetchAllClasses();
  renderClassList();
  switchNavTab('dashboard');
}

function renderClassList() {
  const completedCount = activeStudent.completedClasses || 0;
  const container = document.getElementById("classListContainer");
  container.innerHTML = "";

  if (globalClasses.length === 0) {
    container.innerHTML = "<p style='color:var(--muted);'>No classes available at the moment. Please contact Admin.</p>";
    return;
  }

  globalClasses.forEach((cls, index) => {
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

function extractYoutubeId(url) {
  if (!url) return '';
  let videoId = '';
  if (url.includes('embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1].split('&')[0];
  }
  return videoId;
}

window.openClass = function(idx) {
  currentClassIdx = idx;
  const cls = globalClasses[idx];

  videoCompleted = false;
  pdfDownloaded = false;
  lastWatchedTime = 0;

  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewClasses").style.display = "none";
  document.getElementById("viewAdmin").style.display = "none";
  document.getElementById("viewClassroom").style.display = "block";

  document.getElementById("crTitle").innerText = cls.title;

  const pdfBtn = document.getElementById("crPdf");
  pdfBtn.href = cls.pdfUrl || '#';
  pdfBtn.classList.add("disabled-btn");
  pdfBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Step 2: Download Material (Watch Complete Video First)`;

  document.getElementById("assessmentSection").style.display = "none";
  document.getElementById("crActivityText").innerText = cls.activity || "No specific activity notes.";
  document.getElementById("activityAnswer").value = "";

  const vId = extractYoutubeId(cls.videoUrl);

  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    ytPlayer.destroy();
  }

  const videoContainer = document.querySelector('.video-container');
  videoContainer.innerHTML = `<div id="ytPlayerElement"></div>`;

  ytPlayer = new YT.Player('ytPlayerElement', {
    height: '100%',
    width: '100%',
    videoId: vId,
    playerVars: {
      'controls': 1,
      'rel': 0,
      'modestbranding': 1,
      'disablekb': 1
    },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });

  const mcqDiv = document.getElementById("mcqContainer");
  mcqDiv.innerHTML = "";
  
  if (cls.questions && cls.questions.length > 0) {
    cls.questions.forEach((q, qIdx) => {
      mcqDiv.innerHTML += `
        <div style="margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <p style="font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">${qIdx + 1}. ${q.q}</p>
          ${q.options.map((opt, optIdx) => `
            <label class="mcq-option">
              <input type="radio" name="mcq_${qIdx}" value="${optIdx}" required> ${opt.trim()}
            </label>
          `).join('')}
        </div>
      `;
    });
  } else {
    mcqDiv.innerHTML = "<p style='color:var(--muted); font-size:13px;'>No questions available for this class.</p>";
  }
};

setInterval(() => {
  if (window.YT && ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
    const currentTime = ytPlayer.getCurrentTime();
    if (currentTime > lastWatchedTime + 2) {
      ytPlayer.seekTo(lastWatchedTime, true);
      showToast("Fast forwarding is disabled. Please watch the complete video!", "error");
    } else {
      lastWatchedTime = currentTime;
    }
  }
}, 1000);

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    videoCompleted = true;
    const pdfBtn = document.getElementById("crPdf");
    pdfBtn.classList.remove("disabled-btn");
    pdfBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Step 2: Download Study Material`;
    showToast("Video completed successfully! Step 2 Material is now unlocked.");
  }
}

window.handlePdfDownload = function() {
  if (!videoCompleted) {
    showToast("Please watch the complete video first!", "error");
    return;
  }
  pdfDownloaded = true;
  document.getElementById("assessmentSection").style.display = "block";
  showToast("Material unlocked! Please complete the MCQ assessment below.");
};

window.submitAssessment = async function() {
  const cls = globalClasses[currentClassIdx];
  if (!cls.questions || cls.questions.length === 0) {
    showToast(`Class marked as completed! Attendance recorded.`);
    await passStudent();
    return;
  }

  let correct = 0;
  for (let i = 0; i < cls.questions.length; i++) {
    const selected = document.querySelector(`input[name="mcq_${i}"]:checked`);
    if (!selected) {
      showToast("Please answer all questions before submitting!", "error");
      return;
    }
    if (parseInt(selected.value) === parseInt(cls.questions[i].ans)) {
      correct++;
    }
  }

  const scorePercent = Math.round((correct / cls.questions.length) * 100);

  if (scorePercent >= 60) {
    showToast(`Passed with ${scorePercent}%! Attendance marked.`);
    await passStudent();
  } else {
    showToast(`Score: ${scorePercent}%. Minimum 60% required. Retry!`, "error");
  }
};

async function passStudent() {
  const todayStr = new Date().toISOString().split('T')[0];
  const studentRef = doc(db, "students", activeStudent.mobileNumber || activeStudent.id);
  
  const docSnap = await getDoc(studentRef);
  let attData = docSnap.exists() && docSnap.data().attendance ? docSnap.data().attendance : {};
  attData[todayStr] = "Present";

  const newProgress = Math.max(activeStudent.completedClasses || 0, currentClassIdx + 1);
  
  await updateDoc(studentRef, { 
    completedClasses: newProgress,
    attendance: attData 
  });

  activeStudent.completedClasses = newProgress;
  activeStudent.attendance = attData;
  sessionStorage.setItem("snec_user", JSON.stringify(activeStudent));
  
  renderClassList();
  switchNavTab('classes');
}

function showPendingScreen() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "none";
  document.getElementById("appMain").style.display = "none";
  document.getElementById("pendingSection").style.display = "flex";
}

window.switchNavTab = async function(tabName, event) {
  autoCloseMobileMenu();
  if (event) {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  } else {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    if(tabName === 'dashboard' && document.getElementById('navStudentDashboard')) document.getElementById('navStudentDashboard').classList.add("active");
    if(tabName === 'classes' && document.getElementById('navStudentClasses')) document.getElementById('navStudentClasses').classList.add("active");
  }

  if (tabName === 'classes') {
    await fetchAllClasses();
    renderClassList();
  }
  
  document.getElementById("viewDashboard").style.display = tabName === 'dashboard' ? 'block' : 'none';
  document.getElementById("viewClasses").style.display = tabName === 'classes' ? 'block' : 'none';
  document.getElementById("viewClassroom").style.display = 'none';
  document.getElementById("viewAdmin").style.display = tabName === 'admin' ? 'block' : 'none';
};

/* =========================================
   ADMIN PORTAL & SIDEBAR TAB LOGIC
   ========================================= */

function showAdminDashboard() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("admissionSection").style.display = "none";
  document.getElementById("pendingSection").style.display = "none";
  document.getElementById("appSidebar").style.display = "flex";
  document.getElementById("appMain").style.display = "flex";
  document.getElementById("userRoleDisplay").innerText = "SUPER ADMIN PORTAL";
  
  if(document.getElementById("navStudentDashboard")) document.getElementById("navStudentDashboard").style.display = "none";
  if(document.getElementById("navStudentClasses")) document.getElementById("navStudentClasses").style.display = "none";
  if(document.getElementById("navAdminPending")) document.getElementById("navAdminPending").style.display = "flex";
  if(document.getElementById("navAdminApproved")) document.getElementById("navAdminApproved").style.display = "flex";
  if(document.getElementById("navAdminAttendance")) document.getElementById("navAdminAttendance").style.display = "flex";
  if(document.getElementById("navAdminManage")) document.getElementById("navAdminManage").style.display = "flex";
  if(document.getElementById("navAdminFee")) document.getElementById("navAdminFee").style.display = "flex";

  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewClasses").style.display = "none";
  document.getElementById("viewClassroom").style.display = "none";
  document.getElementById("viewAdmin").style.display = "block";

  switchAdminTab('pending'); 
}

window.switchAdminTab = async function(tab, event) {
  autoCloseMobileMenu();
  if(event) {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  } else {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    if(tab==='pending' && document.getElementById('navAdminPending')) document.getElementById('navAdminPending').classList.add('active');
  }

  if (document.getElementById('adminTabPending')) document.getElementById('adminTabPending').style.display = tab === 'pending' ? 'block' : 'none';
  if (document.getElementById('adminTabApproved')) document.getElementById('adminTabApproved').style.display = tab === 'approved' ? 'block' : 'none';
  if (document.getElementById('adminTabAttendance')) document.getElementById('adminTabAttendance').style.display = tab === 'attendance' ? 'block' : 'none';
  if (document.getElementById('adminTabManageClasses')) document.getElementById('adminTabManageClasses').style.display = tab === 'manageClasses' ? 'block' : 'none';
  if (document.getElementById('adminTabFee')) document.getElementById('adminTabFee').style.display = tab === 'fee' ? 'block' : 'none';

  let titleText = "";
  if (tab === 'pending') { titleText = "Pending Approvals"; loadPendingStudents(); }
  if (tab === 'approved') { titleText = "Approved Students"; loadApprovedStudents(); }
  if (tab === 'attendance') { 
    titleText = "Attendance Management";
    document.getElementById("programDate").valueAsDate = new Date();
    document.getElementById("adminAttendanceList").innerHTML = '<tr><td colspan="4" style="text-align:center;">Select date and click "Load Students".</td></tr>';
  }
  if (tab === 'manageClasses') { 
    titleText = "Manage Classes"; 
    await fetchAllClasses();
    loadAdminClassesList(); 
  }
  if (tab === 'fee') {
    titleText = "Fee Collection";
    if (document.getElementById("feeMonth")) document.getElementById("feeMonth").value = new Date().toISOString().slice(0, 7);
    fetchFeeList();
  }
  
  if(document.getElementById('adminTitleHeader')) {
    document.getElementById('adminTitleHeader').innerHTML = `<i class="fa-solid fa-users-gear"></i> ${titleText}`;
  }
};

/* 1. Fee Management & Receipt Print */
let currentPaidFeeDetails = null;

async function checkStudentFeeStatus() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const studentRef = doc(db, "students", activeStudent.mobileNumber || activeStudent.id);
  
  try {
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      const data = snap.data();
      const fees = data.fees || {};
      const monthFee = fees[currentMonth];

      const statusEl = document.getElementById("studentFeeStatusText");
      const rcptBox = document.getElementById("receiptDownloadBox");

      if (statusEl) {
        if (monthFee && monthFee.status === "Paid") {
          currentPaidFeeDetails = { month: currentMonth, amount: monthFee.amount || 500, date: monthFee.updatedAt || new Date().toLocaleDateString() };
          statusEl.innerHTML = `<span style="color: #05c46b;"><i class="fa-solid fa-circle-check"></i> Fee Paid for ${currentMonth} (₹${monthFee.amount || 0})</span>`;
          if (rcptBox) rcptBox.style.display = "block";
        } else if (monthFee && monthFee.status === "Pending") {
          currentPaidFeeDetails = null;
          statusEl.innerHTML = `<span style="color: #d97706;"><i class="fa-solid fa-clock"></i> Fee Pending for ${currentMonth}: ₹${monthFee.amount || 0}</span>`;
          if (rcptBox) rcptBox.style.display = "none";
        } else {
          currentPaidFeeDetails = null;
          statusEl.innerHTML = `<span style="color: var(--muted);"><i class="fa-solid fa-circle-info"></i> No fee generated for ${currentMonth}.</span>`;
          if (rcptBox) rcptBox.style.display = "none";
        }
      }
    }
  } catch (err) { console.error("Error checking fee:", err); }
}

window.printFeeReceipt = function() {
  if (!currentPaidFeeDetails) return showToast("No paid fee receipt available", "error");
  
  const printWindow = window.open('', '_blank');
  const htmlContent = `
    <html>
    <head>
      <title>Fee Receipt - DALEEL LMS</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; color: #333; }
        .receipt-card { border: 2px solid #1e3c72; border-radius: 12px; padding: 30px; max-width: 500px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 15px; margin-bottom: 20px; }
        .header h2 { color: #1e3c72; margin: 0; }
        .header p { color: #64748b; font-size: 13px; margin: 5px 0 0 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .row strong { color: #1e3c72; }
        .paid-badge { background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 20px; font-weight: bold; display: inline-block; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h2>DALEEL LMS</h2>
          <p>SNEC Advanced Studies Program</p>
          <h4 style="margin: 10px 0 0 0; color: #05c46b;">OFFICIAL FEE RECEIPT</h4>
        </div>
        <div class="row"><span>Student Name:</span> <strong>${activeStudent.fullName ? activeStudent.fullName.toUpperCase() : '-'}</strong></div>
        <div class="row"><span>Mobile Number:</span> <strong>${activeStudent.mobileNumber || activeStudent.id}</strong></div>
        <div class="row"><span>Fee Period:</span> <strong>${currentPaidFeeDetails.month}</strong></div>
        <div class="row"><span>Amount Paid:</span> <strong>₹${currentPaidFeeDetails.amount}</strong></div>
        <div class="row"><span>Payment Status:</span> <span class="paid-badge">PAID</span></div>
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

async function checkStudentAttendanceSummary() {
  const listEl = document.getElementById("studentAttendanceList");
  if (!listEl) return;
  
  try {
    const studentRef = doc(db, "students", activeStudent.mobileNumber || activeStudent.id);
    const snap = await getDoc(studentRef);
    if (snap.exists() && snap.data().attendance) {
      const att = snap.data().attendance;
      const dates = Object.keys(att).sort().reverse();
      
      if (dates.length === 0) {
        listEl.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--muted);">No attendance records found yet.</td></tr>';
        return;
      }

      listEl.innerHTML = "";
      dates.forEach(d => {
        const isPresent = att[d] === "Present";
        listEl.innerHTML += `
          <tr>
            <td><strong>${d}</strong></td>
            <td><span class="status-badge ${isPresent ? 'badge-done' : 'badge-pending'}">${att[d]}</span></td>
          </tr>
        `;
      });
    } else {
      listEl.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--muted);">No attendance records found yet.</td></tr>';
    }
  } catch (err) { console.error("Error fetching attendance summary:", err); }
}

/* Admin Fee List & WhatsApp Pending Reminder */
window.fetchFeeList = async function() {
  const monthVal = document.getElementById("feeMonth").value;
  if (!monthVal) return showToast("Please select a month!", "error");

  const tb = document.getElementById("adminFeeList");
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';

  try {
    const q = query(collection(db, "students"), where("status", "==", "Active"));
    const snap = await getDocs(q);
    tb.innerHTML = "";

    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;">No active students found.</td></tr>';
      return;
    }

    let index = 1;
    snap.forEach(d => {
      const s = d.data();
      const fees = s.fees || {};
      const mData = fees[monthVal] || { status: "Pending", amount: 500 };

      const isPaid = mData.status === "Paid";
      const dName = s.fullName ? s.fullName.toUpperCase() : '-';
      const mobile = s.mobileNumber || d.id;

      tb.innerHTML += `
        <tr>
          <td><strong>${index++}</strong></td>
          <td><strong>${dName}</strong></td>
          <td>${mobile}</td>
          <td><input type="number" id="feeAmt_${d.id}" value="${mData.amount || 500}" style="width: 90px; padding: 6px; margin: 0; border-radius: 8px;"></td>
          <td><span class="status-badge ${isPaid ? 'badge-done' : 'badge-pending'}">${mData.status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-approve" onclick="toggleFeeStatus('${d.id}', '${monthVal}', '${isPaid ? 'Pending' : 'Paid'}')" style="background: ${isPaid ? '#f59e0b' : '#05c46b'}; padding: 6px 10px; font-size: 11px;">
                ${isPaid ? 'Mark Pending' : 'Mark Paid'}
              </button>
              ${!isPaid ? `
                <button class="btn-pill-secondary" onclick="sendFeeWhatsAppReminder('${mobile}', '${dName}', '${monthVal}', '${mData.amount || 500}')" style="background:#dcfce7; color:#15803d; border-color:#86efac; padding:6px 10px; font-size:11px;">
                  <i class="fa-brands fa-whatsapp"></i> Remind
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) { tb.innerHTML = `<tr><td colspan="6" style="color:red;">Error: ${err.message}</td></tr>`; }
};

window.sendFeeWhatsAppReminder = function(mobile, name, month, amount) {
  let cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length === 10) cleanMobile = "91" + cleanMobile;

  const appUrl = window.location.href;
  const message = `Assalamu Alaikum ${name},\n\nThis is a friendly reminder regarding your monthly course fee for *SNEC Advanced Studies Program*.\n\n*Fee Period:* ${month}\n*Pending Amount:* ₹${amount}\n\nPlease complete the payment at the earliest.\nPortal Link: ${appUrl}`;
  const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
  
  window.open(waUrl, '_blank');
};

window.toggleFeeStatus = async function(studentId, monthStr, newStatus) {
  const amtInput = document.getElementById(`feeAmt_${studentId}`);
  const feeAmount = amtInput ? parseInt(amtInput.value) || 0 : 0;

  try {
    const studentRef = doc(db, "students", studentId);
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      let fees = snap.data().fees || {};
      fees[monthStr] = { status: newStatus, amount: feeAmount, updatedAt: new Date().toLocaleDateString() };
      
      await updateDoc(studentRef, { fees: fees });
      showToast(`Fee status updated to ${newStatus}`);
      fetchFeeList();
    }
  } catch (err) { showToast("Error: " + err.message, "error"); }
};

/* 2. Pending Approvals Tab */
async function loadPendingStudents() {
  const tb = document.getElementById("adminPendingList");
  tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
  try {
    const q = query(collection(db, "students"), where("status", "==", "Pending Approval"));
    const snap = await getDocs(q);
    tb.innerHTML = "";
    if (snap.empty) {
      tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">No pending applications.</td></tr>';
      return;
    }
    let index = 1;
    snap.forEach(d => {
      const s = d.data();
      const dName = s.fullName ? s.fullName.toUpperCase() : '-';
      const mobile = s.mobileNumber || d.id;
      tb.innerHTML += `
        <tr>
          <td><strong>${index++}</strong></td>
          <td><strong>${dName}</strong></td>
          <td>${mobile}</td>
          <td>${s.place || '-'}</td>
          <td><button class="btn-approve" onclick="openApprovalModal('${d.id}', '${dName}', '${mobile}')"><i class="fa-solid fa-check"></i> Approve</button></td>
        </tr>`;
    });
  } catch (err) { tb.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${err.message}</td></tr>`; }
}

let studentToApprove = null;
let studentToApproveMobile = null;

window.openApprovalModal = function(id, name, mobile) {
  studentToApprove = id;
  studentToApproveMobile = mobile;
  document.getElementById("approveStudentName").innerText = name;
  document.getElementById("approvalModal").style.display = "flex";
};

window.closeApprovalModal = function() {
  studentToApprove = null;
  studentToApproveMobile = null;
  document.getElementById("approvalModal").style.display = "none";
};

window.confirmApproval = async function() {
  const phase = document.getElementById("approvePhase").value;
  try {
    await updateDoc(doc(db, "students", studentToApprove), { status: "Active", phase: phase });
    showToast(`Student approved to ${phase}`);
    
    if (studentToApproveMobile) {
      let cleanMobile = studentToApproveMobile.replace(/\D/g, '');
      if (cleanMobile.length === 10) cleanMobile = "91" + cleanMobile;
      
      const appUrl = window.location.href;
      const message = `Assalamu Alaikum,\n\nYour application for *SNEC Advanced Studies Program* (${phase}) has been approved!\n\nYou can now log in to the portal using your registered mobile number:\n${appUrl}`;
      const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
      
      window.open(waUrl, '_blank');
    }

    closeApprovalModal();
    loadPendingStudents();
  } catch(err) { showToast("Error: " + err.message, "error"); }
};

/* 3. Approved Students */
async function loadApprovedStudents() {
  const tb = document.getElementById("adminApprovedList");
  tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
  try {
    const q = query(collection(db, "students"), where("status", "==", "Active"));
    const snap = await getDocs(q);
    tb.innerHTML = "";
    if (snap.empty) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">No approved students.</td></tr>'; return; }
    let index = 1;
    snap.forEach(d => {
      const s = d.data();
      const dName = s.fullName ? s.fullName.toUpperCase() : '-';
      tb.innerHTML += `
        <tr><td><strong>${index++}</strong></td><td><strong>${dName}</strong></td><td>${s.mobileNumber || d.id}</td><td>${s.place || '-'}</td><td><span class="status-badge badge-done">${s.phase || 'Phase 1'}</span></td></tr>`;
    });
  } catch (err) { tb.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${err.message}</td></tr>`; }
}

/* 4. Attendance */
let currentAttendanceList = [];
window.fetchAttendanceList = async function() {
  const dateStr = document.getElementById("programDate").value;
  if(!dateStr) return showToast("Select a valid date", "error");
  const tb = document.getElementById("adminAttendanceList");
  tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';
  currentAttendanceList = [];
  try {
    const q = query(collection(db, "students"), where("status", "==", "Active"));
    const snap = await getDocs(q);
    tb.innerHTML = "";
    if (snap.empty) { tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">No approved students found.</td></tr>'; return; }
    let index = 1;
    snap.forEach(d => {
      const s = d.data();
      const isPresent = s.attendance && s.attendance[dateStr] === "Present";
      currentAttendanceList.push(d.id);
      const dName = s.fullName ? s.fullName.toUpperCase() : '-';
      tb.innerHTML += `
        <tr><td><strong>${index++}</strong></td><td><strong>${dName}</strong></td><td><span class="status-badge badge-done" style="background:#f1f5f9; color:var(--muted);">${s.phase || 'Phase 1'}</span></td>
        <td><input type="checkbox" id="att_${d.id}" class="att-student-chk" style="width:20px; height:20px; margin:0;" ${isPresent ? 'checked' : ''}></td></tr>`;
    });
  } catch (err) { tb.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${err.message}</td></tr>`; }
};

/* 5. Manage Classes */
function loadAdminClassesList() {
  const tb = document.getElementById("adminClassesList");
  tb.innerHTML = "";
  if (globalClasses.length === 0) {
    tb.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No classes found. Add a new class!</td></tr>";
    return;
  }
  globalClasses.forEach((c, index) => {
    tb.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td><strong>${c.title}</strong></td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-pill-secondary" onclick="editClass(${index})" style="padding: 6px 14px; font-size: 12px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn-approve" onclick="deleteClass('${c.docId}')" style="background: var(--error); padding: 6px 14px; font-size: 12px;">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

let questionCount = 0;
let editingDocId = null;

window.openNewClassModal = function() {
  editingDocId = null;
  document.getElementById("newClassId").value = "";
  document.getElementById("newClassTitle").value = "";
  document.getElementById("newClassVideo").value = "";
  document.getElementById("newClassPdf").value = "";
  document.getElementById("newClassActivity").value = "";
  document.getElementById("questionsContainer").innerHTML = "";
  questionCount = 0;
  
  addQuestionField();
  addQuestionField();
  
  document.getElementById("newClassModal").style.display = "flex";
};

window.closeNewClassModal = function() {
  editingDocId = null;
  document.getElementById("newClassModal").style.display = "none";
};

window.editClass = function(index) {
  const cls = globalClasses[index];
  editingDocId = cls.docId;

  document.getElementById("newClassId").value = cls.id;
  document.getElementById("newClassTitle").value = cls.title;
  document.getElementById("newClassVideo").value = cls.videoUrl || "";
  document.getElementById("newClassPdf").value = cls.pdfUrl || "";
  document.getElementById("newClassActivity").value = cls.activity || "";
  
  const container = document.getElementById("questionsContainer");
  container.innerHTML = "";
  questionCount = 0;

  if (cls.questions && cls.questions.length > 0) {
    cls.questions.forEach((q) => {
      questionCount++;
      const qDiv = document.createElement("div");
      qDiv.style.cssText = "background: #f1f5f9; padding: 15px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1;";
      qDiv.innerHTML = `
        <label style="font-size:12px; font-weight:700; color:#1e3c72;">Question ${questionCount}</label>
        <input type="text" id="q_${questionCount}_text" value="${q.q}" placeholder="Type question here..." required style="margin-bottom:10px;">
        
        <label style="font-size:11px; font-weight:600; color:var(--muted);">4 Options (Comma separated)</label>
        <input type="text" id="q_${questionCount}_options" value="${q.options ? q.options.join(', ') : ''}" placeholder="Option A, Option B, Option C, Option D" required style="margin-bottom:10px;">
        
        <label style="font-size:11px; font-weight:600; color:var(--muted);">Correct Option Number (1 for 1st, 2 for 2nd, 3 for 3rd, 4 for 4th)</label>
        <input type="number" id="q_${questionCount}_ans" value="${(q.ans !== undefined ? q.ans + 1 : 1)}" placeholder="1" min="1" max="4" required style="margin-bottom:0;">
      `;
      container.appendChild(qDiv);
    });
  } else {
    addQuestionField();
  }

  document.getElementById("newClassModal").style.display = "flex";
};

window.addQuestionField = function() {
  questionCount++;
  const container = document.getElementById("questionsContainer");
  const qDiv = document.createElement("div");
  qDiv.style.cssText = "background: #f1f5f9; padding: 15px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1;";
  qDiv.innerHTML = `
    <label style="font-size:12px; font-weight:700; color:#1e3c72;">Question ${questionCount}</label>
    <input type="text" id="q_${questionCount}_text" placeholder="Type question here..." required style="margin-bottom:10px;">
    
    <label style="font-size:11px; font-weight:600; color:var(--muted);">4 Options (Comma separated. E.g., Option A, Option B, Option C, Option D)</label>
    <input type="text" id="q_${questionCount}_options" placeholder="Option A, Option B, Option C, Option D" required style="margin-bottom:10px;">
    
    <label style="font-size:11px; font-weight:600; color:var(--muted);">Correct Option Number (1 for 1st, 2 for 2nd, 3 for 3rd, 4 for 4th)</label>
    <input type="number" id="q_${questionCount}_ans" placeholder="1" min="1" max="4" required style="margin-bottom:0;">
  `;
  container.appendChild(qDiv);
};

window.saveNewClass = async function() {
  const idVal = document.getElementById("newClassId").value;
  const titleVal = document.getElementById("newClassTitle").value;
  if(!idVal || !titleVal) {
    showToast("Class ID and Title are required!", "error");
    return;
  }

  let questionsArray = [];
  for(let i=1; i<=questionCount; i++) {
    const qText = document.getElementById(`q_${i}_text`)?.value;
    const qOptRaw = document.getElementById(`q_${i}_options`)?.value;
    const qAns = document.getElementById(`q_${i}_ans`)?.value;
    
    if(qText && qOptRaw && qAns !== "") {
      const optionsArray = qOptRaw.split(",").map(item => item.trim());
      // Convert 1-4 based user input to 0-3 internal index
      const internalIdx = Math.max(0, parseInt(qAns) - 1);
      questionsArray.push({
        q: qText,
        options: optionsArray,
        ans: internalIdx
      });
    }
  }

  const payload = {
    id: parseInt(idVal),
    title: titleVal,
    videoUrl: document.getElementById("newClassVideo").value,
    pdfUrl: document.getElementById("newClassPdf").value,
    activity: document.getElementById("newClassActivity").value,
    questions: questionsArray
  };

  try {
    const targetDocId = editingDocId || ("class_" + idVal);
    await setDoc(doc(db, "classes", targetDocId), payload);
    showToast(editingDocId ? "Class updated successfully!" : "Class added successfully!");
    closeNewClassModal();
    await fetchAllClasses(); 
    loadAdminClassesList();
  } catch (err) {
    showToast("Error saving class: " + err.message, "error");
  }
};

window.deleteClass = async function(docId) {
  if(confirm("Are you sure you want to delete this class?")) {
    try {
      await deleteDoc(doc(db, "classes", docId));
      showToast("Class deleted successfully!");
      await fetchAllClasses();
      loadAdminClassesList();
    } catch(err) {
      showToast("Error deleting class: " + err.message, "error");
    }
  }
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
