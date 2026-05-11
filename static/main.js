// ====================================
// TAB SWITCHING MODULE
// ====================================
// Handles switching between different UI tabs (Dashboard, Processes, etc.)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {

    // Remove active class from all tabs and pages
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));

    // Activate selected tab
    btn.classList.add("active");

    // Show corresponding tab content
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ====================================
// TOAST NOTIFICATION MODULE
// ====================================
// Displays temporary messages for user actions (success/error)
function showToast(message, isError = false) {
  const container = document.getElementById("toast-container");

  // Create toast element
  const div = document.createElement("div");
  div.className = "toast" + (isError ? " error" : "");
  div.textContent = message;

  // Add toast to UI
  container.appendChild(div);

  // Remove toast after 4 seconds
  setTimeout(() => div.remove(), 4000);
}

// ====================================
// AUTO REFRESH CONTROL MODULE
// ====================================
// Controls whether data should refresh automatically
let autoRefresh = true;

// Toggle auto-refresh on/off
document.getElementById("autoRefreshToggle").addEventListener("change", (e) => {
  autoRefresh = e.target.checked;
  showToast(autoRefresh ? "🔄 Auto refresh enabled" : "⏸ Auto refresh paused");
});

// ====================================
// CHART MODULE (Visualization)
// ====================================
let cpuMemChart, perCoreChart;

// Arrays to store historical CPU & memory data
let historyLabels = [];
let cpuHistory = [];
let memHistory = [];

// Stores latest process list from backend
let latestProcesses = [];

// Initialize CPU & Memory charts
function initCharts() {

  // Line chart for CPU & Memory usage over time
  cpuMemChart = new Chart(document.getElementById("cpuMemChart"), {
    type: "line",
    data: {
      labels: historyLabels,
      datasets: [
        { label: "CPU %", data: cpuHistory, borderWidth: 1 },
        { label: "Memory %", data: memHistory, borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { max: 100 } }
    }
  });

  // Bar chart for per-core CPU usage
  perCoreChart = new Chart(document.getElementById("perCoreChart"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        { label: "CPU per core %", data: [], borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { max: 100 } }
    }
  });
}

// Utility function to format percentage values
function fmtPercent(v) {
  return v.toFixed(1) + "%";
}

// ====================================
// SYSTEM SUMMARY API MODULE
// ====================================
// Fetches CPU, memory, disk, uptime info from backend
async function fetchSummary() {

  // Call Flask API
  const res = await fetch("/api/summary");
  const data = await res.json();

  // Store historical data for charts
  historyLabels.push(data.time);
  cpuHistory.push(data.cpu_percent);
  memHistory.push(data.memory.percent);

  // Limit history to last 60 entries
  if (historyLabels.length > 60) {
    historyLabels.shift();
    cpuHistory.shift();
    memHistory.shift();
  }

  // Update system info on UI
  document.getElementById("sys-os").textContent = data.system.os;
  document.getElementById("sys-cpu").textContent = data.system.cpu;
  document.getElementById("sys-ram").textContent = data.system.total_ram + " GB";
  document.getElementById("sys-uptime").textContent = data.system.uptime;

  // Update CPU, memory, disk meters
  document.getElementById("cpu-value").textContent = fmtPercent(data.cpu_percent);
  document.getElementById("cpu-meter-fill").style.width = data.cpu_percent + "%";

  document.getElementById("mem-value").textContent = fmtPercent(data.memory.percent);
  document.getElementById("mem-meter-fill").style.width = data.memory.percent + "%";

  document.getElementById("disk-value").textContent = fmtPercent(data.disk.percent);
  document.getElementById("disk-meter-fill").style.width = data.disk.percent + "%";

  // Update charts
  cpuMemChart.update();

  perCoreChart.data.labels = data.per_cpu.map((_, i) => "Core " + i);
  perCoreChart.data.datasets[0].data = data.per_cpu;
  perCoreChart.update();
}

// ====================================
// PROCESS API MODULE
// ====================================
// Fetches running processes from backend
async function fetchProcesses() {
  const res = await fetch("/api/processes?limit=200");
  latestProcesses = await res.json();
  renderProcessTable();
}

// ====================================
// PROCESS TABLE RENDERING MODULE
// ====================================
let currentSort = "cpu";
let sortCpu = true, sortMem = true, sortPid = true, sortName = true;

let currentPage = 1;
let rowsPerPage = 20;

// Renders process list table with sorting & pagination
function renderProcessTable() {
  const tbody = document.getElementById("process-tbody");
  const searchTerm = document.getElementById("process-search").value.toLowerCase();

  // Filter processes based on search
  let result = latestProcesses.filter((p) =>
    p.pid.toString().includes(searchTerm) ||
    (p.name || "").toLowerCase().includes(searchTerm)
  );

  // Sorting logic
  if (currentSort === "cpu")
    result.sort((a, b) => sortCpu ? b.cpu_percent - a.cpu_percent : a.cpu_percent - b.cpu_percent);

  if (currentSort === "memory")
    result.sort((a, b) => sortMem ? b.memory_percent - a.memory_percent : a.memory_percent - b.memory_percent);

  if (currentSort === "pid")
    result.sort((a, b) => sortPid ? a.pid - b.pid : b.pid - a.pid);

  if (currentSort === "name")
    result.sort((a, b) =>
      sortName
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "")
    );

  // Pagination logic
  let start = (currentPage - 1) * rowsPerPage;
  let end = start + rowsPerPage;
  let pageItems = result.slice(start, end);

  // Render table rows
  tbody.innerHTML = "";
  pageItems.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.name || "-"}</td>
      <td>${p.cpu_percent.toFixed(1)}</td>
      <td>${p.memory_percent.toFixed(1)}</td>
      <td>${p.status}</td>
      <td>
        <button class="kill-btn" onclick="killProcess(${p.pid})">Kill</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update page info
  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${Math.ceil(result.length / rowsPerPage)}`;
}

// ====================================
// SORTING MODULE
// ====================================
document.querySelectorAll("th[data-sort]").forEach(th => {
  th.addEventListener("click", () => {
    const field = th.getAttribute("data-sort");

    if (field === "cpu") sortCpu = !sortCpu;
    if (field === "memory") sortMem = !sortMem;
    if (field === "pid") sortPid = !sortPid;
    if (field === "name") sortName = !sortName;

    currentSort = field;
    renderProcessTable();
  });
});

// ====================================
// PAGINATION MODULE
// ====================================
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderProcessTable();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  currentPage++;
  renderProcessTable();
});

// ====================================
// PROCESS KILL MODAL MODULE
// ====================================
let modalPid = null;
let modalName = null;

// Opens confirmation modal before killing process
function killProcess(pid) {
  const proc = latestProcesses.find(p => p.pid === pid);
  modalPid = pid;
  modalName = proc?.name || "-";

  document.getElementById("modal-text").textContent =
    `Are you sure you want to kill PID ${pid} (${modalName})?`;

  document.getElementById("modal-overlay").style.display = "flex";
}

// Confirm kill process
document.getElementById("confirmKill").addEventListener("click", async () => {
  const res = await fetch("/api/processes/" + modalPid + "/kill", { method: "POST" });
  const data = await res.json();

  if (data.success)
    showToast("✔ Process " + modalPid + " killed");
  else
    showToast("❌ Failed to kill " + modalPid, true);

  document.getElementById("modal-overlay").style.display = "none";
  fetchProcesses();
});

// Cancel kill
document.getElementById("cancelKill").addEventListener("click", () => {
  document.getElementById("modal-overlay").style.display = "none";
});

// ====================================
// SYSTEM CONTROL MODULE
// ====================================

// Shutdown system
async function shutdownPC() {
  if (confirm("Shutdown computer?")) {
    await fetch("/api/shutdown", { method: "POST" });
    showToast("⚠ Shutdown command sent");
  }
}

// Restart system
async function restartPC() {
  if (confirm("Restart computer?")) {
    await fetch("/api/restart", { method: "POST" });
    showToast("⚠ Restart command sent");
  }
}

// Logoff user
async function logoffPC() {
  if (confirm("Logoff user?")) {
    await fetch("/api/logoff", { method: "POST" });
    showToast("⚠ Logoff command sent");
  }
}

// ====================================
// APPLICATION STARTUP MODULE
// ====================================
// Runs when page loads
window.addEventListener("DOMContentLoaded", () => {

  // Initialize charts
  initCharts();

  // Initial data fetch
  fetchSummary();
  fetchProcesses();

  // Periodic refresh (polling)
  setInterval(() => {
    if (autoRefresh) fetchSummary();
  }, 1000);

  setInterval(() => {
    if (autoRefresh) fetchProcesses();
  }, 2000);
});
