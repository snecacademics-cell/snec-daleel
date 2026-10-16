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

function showStudentDashboard() {
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

  const dName = activeStudent.fullName ? activeStudent.fullName.toUpperCase() : "Student";
  document.getElementById("welcomeStudent").innerText = "Welcome, " + dName;

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

window.openClass = function(idx) {
  currentClassIdx = idx;
  const cls = globalClasses[idx];

  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewClasses").style.display = "none";
  document.getElementById("viewAdmin").style.display = "none";
  document.getElementById("viewClassroom").style.display = "block";

  document.getElementById("crTitle").innerText = cls.title;
  document.getElementById("crVideo").src = cls.videoUrl;
  document.getElementById("crPdf").href = cls.pdfUrl;
  document.getElementById("crActivityText").innerText = cls.activity || "No specific activity notes.";
  document.getElementById("activityAnswer").value = "";

  const mcqDiv = document.getElementById("mcqContainer");
  mcqDiv.innerHTML = "";
  
  if (cls.questions && cls.questions.length > 0) {
    cls.questions.forEach((q, qIdx) => {
      mcqDiv.innerHTML += `
        <div style="margin-bottom: 15px;">
          <p style="font-weight: 600; font-size: 13px; margin: 0 0 8px 0;">${qIdx + 1}. ${q.q}</p>
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

window.submitAssessment = async function() {
  const cls = globalClasses[currentClassIdx];
  if(!cls.questions || cls.questions.length === 0) {
    showToast(`Class marked as completed! Next class unlocked!`);
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
    showToast(`Congratulations! Passed with ${scorePercent}%. Next class unlocked!`);
    await passStudent();
  } else {
    showToast(`Score: ${scorePercent}%. Minimum 60% required to pass. Please retry!`, "error");
  }
};

async function passStudent() {
  const newProgress = Math.max(activeStudent.completedClasses || 0, currentClassIdx + 1);
  await updateDoc(doc(db, "students", activeStudent.mobileNumber || activeStudent.id), { completedClasses: newProgress });
  activeStudent.completedClasses = newProgress;
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

window.switchNavTab = function(tabName, event) {
  autoCloseMobileMenu();
  if (event) {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  } else {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    if(tabName === 'dashboard' && document.getElementById('navStudentDashboard')) document.getElementById('navStudentDashboard').classList.add("active");
    if(tabName === 'classes' && document.getElementById('navStudentClasses')) document.getElementById('navStudentClasses').classList.add("active");
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

  document.getElementById("viewDashboard").style.display = "none";
  document.getElementById("viewClasses").style.display = "none";
  document.getElementById("viewClassroom").style.display = "none";
  document.getElementById("viewAdmin").style.display = "block";

  switchAdminTab('pending'); 
}

window.switchAdminTab = function(tab, event) {
  autoCloseMobileMenu();
  if(event) {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  } else {
    document.querySelectorAll(".sidebar-menu li").forEach(el => el.classList.remove("active"));
    if(tab==='pending' && document.getElementById('navAdminPending')) document.getElementById('navAdminPending').classList.add('active');
  }

  document.getElementById('adminTabPending').style.display = tab === 'pending' ? 'block' : 'none';
  document.getElementById('adminTabApproved').style.display = tab === 'approved' ? 'block' : 'none';
  document.getElementById('adminTabAttendance').style.display = tab === 'attendance' ? 'block' : 'none';
  document.getElementById('adminTabManageClasses').style.display = tab === 'manageClasses' ? 'block' : 'none';

  let titleText = "";
  if (tab === 'pending') { titleText = "Pending Approvals"; loadPendingStudents(); }
  if (tab === 'approved') { titleText = "Approved Students"; loadApprovedStudents(); }
  if (tab === 'attendance') { 
    titleText = "Attendance Management";
    document.getElementById("programDate").valueAsDate = new Date();
    document.getElementById("adminAttendanceList").innerHTML = '<tr><td colspan="4" style="text-align:center;">Select date and click "Load Students".</td></tr>';
    const selectAllChk = document.getElementById("selectAllAtt");
    if(selectAllChk) selectAllChk.checked = false;
  }
  if (tab === 'manageClasses') { 
    titleText = "Manage Classes"; 
    loadAdminClassesList(); 
  }
  
  if(document.getElementById('adminTitleHeader')) {
    document.getElementById('adminTitleHeader').innerHTML = `<i class="fa-solid fa-users-gear"></i> ${titleText}`;
  }
};

/* 1. Pending Approvals Tab */
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
    
    // Auto-open WhatsApp with login link and approval text
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

/* 2. Approved Students */
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

/* 3. Attendance */
let currentAttendanceList = [];
window.fetchAttendanceList = async function() {
  const dateStr = document.getElementById("programDate").value;
  if(!dateStr) return showToast("Select a valid date", "error");
  const tb = document.getElementById("adminAttendanceList");
  tb.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading students...</td></tr>';
  currentAttendanceList = [];
  const selectAllChk = document.getElementById("selectAllAtt");
  if(selectAllChk) selectAllChk.checked = false;
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

window.toggleAllAttendance = function() {
  const isChecked = document.getElementById("selectAllAtt").checked;
  const checkboxes = document.querySelectorAll(".att-student-chk");
  checkboxes.forEach(chk => chk.checked = isChecked);
};

window.saveProgramAttendance = async function() {
  const dateStr = document.getElementById("programDate").value;
  if(!dateStr || currentAttendanceList.length === 0) return showToast("No list loaded", "error");
  try {
    for (let id of currentAttendanceList) {
      const checkbox = document.getElementById(`att_${id}`);
      const status = checkbox.checked ? "Present" : "Absent";
      const studentRef = doc(db, "students", id);
      const docSnap = await getDoc(studentRef);
      let attData = docSnap.exists() && docSnap.data().attendance ? docSnap.data().attendance : {};
      attData[dateStr] = status;
      await updateDoc(studentRef, { attendance: attData });
    }
    showToast(`Attendance saved for ${dateStr}!`);
  } catch(err) { showToast("Error saving attendance: " + err.message, "error"); }
};

/* 4. Manage Classes */
function loadAdminClassesList() {
  const tb = document.getElementById("adminClassesList");
  tb.innerHTML = "";
  if (globalClasses.length === 0) {
    tb.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No classes found. Add a new class!</td></tr>";
    return;
  }
  globalClasses.forEach(c => {
    tb.innerHTML += `
      <tr>
        <td>${c.id}</td>
        <td><strong>${c.title}</strong></td>
        <td>
          <button class="btn-approve" onclick="deleteClass('${c.docId}')" style="background: var(--error);"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
      </tr>
    `;
  });
}

let questionCount = 0;
window.openNewClassModal = function() {
  document.getElementById("newClassId").value = "";
  document.getElementById("newClassTitle").value = "";
  document.getElementById("newClassVideo").value = "";
  document.getElementById("newClassPdf").value = "";
  document.getElementById("newClassActivity").value = "";
  document.getElementById("questionsContainer").innerHTML = "";
  questionCount = 0;
  document.getElementById("newClassModal").style.display = "flex";
};

window.closeNewClassModal = function() {
  document.getElementById("newClassModal").style.display = "none";
};

window.addQuestionField = function() {
  questionCount++;
  const container = document.getElementById("questionsContainer");
  const qDiv = document.createElement("div");
  qDiv.style.cssText = "background: #f1f5f9; padding: 10px; border-radius: 10px; margin-bottom: 10px;";
  qDiv.innerHTML = `
    <label style="font-size:12px; font-weight:600; color:var(--muted);">Q${questionCount} - Question</label>
    <input type="text" id="q_${questionCount}_text" placeholder="E.g., What is Phase 1?" required style="margin-bottom:8px;">
    
    <label style="font-size:12px; font-weight:600; color:var(--muted);">Options (Comma separated. E.g., Option 1, Option 2, Option 3)</label>
    <input type="text" id="q_${questionCount}_options" placeholder="Foundational Study, Final Review, Exam Prep" required style="margin-bottom:8px;">
    
    <label style="font-size:12px; font-weight:600; color:var(--muted);">Correct Option Index (0 for 1st option, 1 for 2nd, etc.)</label>
    <input type="number" id="q_${questionCount}_ans" placeholder="0" required style="margin-bottom:0;">
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
      questionsArray.push({
        q: qText,
        options: optionsArray,
        ans: parseInt(qAns)
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
    await setDoc(doc(db, "classes", "class_" + idVal), payload);
    showToast("Class saved successfully!");
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
      showToast("Class deleted!");
      await fetchAllClasses();
      loadAdminClassesList();
    } catch(err) {
      showToast("Error deleting: " + err.message, "error");
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

/* =========================================
   PWA / INSTALL APP LOGIC
   ========================================= */
let deferredPrompt;
const installBtn = document.getElementById('installAppBtn');
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed', err));
  });
}

// ബ്രൗസർ ഇൻസ്റ്റാൾ പ്രോംപ്റ്റ് തയ്യാറാകുമ്പോൾ ബട്ടൺ കാണിക്കുന്നു
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone && installBtn) {
    installBtn.style.display = 'flex';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // നേരിട്ട് ഇൻസ്റ്റാൾ ചെയ്യാനുള്ള പോപ്പ്അപ്പ് കാണിക്കുന്നു
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    } else {
      // പ്രോംപ്റ്റ് ലഭ്യമല്ലെങ്കിൽ ബ്രൗസറിന്റെ ഇൻസ്റ്റാളേഷൻ ഫീച്ചർ പ്രവർത്തിപ്പിക്കാൻ ശ്രമിക്കുന്നു
      showToast("Preparing installation... Please wait a moment.", "info");
    }
  });
}

// ഇൻസ്റ്റാൾ ചെയ്തു കഴിഞ്ഞാൽ ബട്ടൺ മറയ്ക്കുന്നു
window.addEventListener('appinstalled', (evt) => {
  if (installBtn) installBtn.style.display = 'none';
  showToast("DALEEL App installed successfully!");
});
window.addEventListener('appinstalled', (evt) => {
  if(installBtn) installBtn.style.display = 'none';
});
