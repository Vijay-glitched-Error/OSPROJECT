# Import Flask components
# Flask -> web framework
# jsonify -> convert Python dict to JSON
# render_template -> load HTML file
# request -> read query parameters from URL
from flask import Flask, jsonify, render_template, request

# psutil -> used to interact with OS to get process & system info
import psutil

# os -> used to execute OS-level commands (shutdown, restart)
import os

# platform -> used to identify operating system
import platform

# datetime -> used for time and uptime calculation
import datetime

# Create Flask application object
app = Flask(__name__)

# ====================================
# SYSTEM SUMMARY MODULE
# ====================================
def get_system_summary():
    """
    Collects overall system resource information
    This demonstrates OS concepts like CPU scheduling,
    memory management, disk usage, and system uptime.
    """

    # Get total CPU usage percentage
    cpu_percent = psutil.cpu_percent(interval=0.3)

    # Get CPU usage for each core (multicore processing)
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)

    # Get virtual memory (RAM) details
    virtual_mem = psutil.virtual_memory()

    # Get swap memory (virtual memory on disk)
    swap = psutil.swap_memory()

    # Get disk usage statistics
    disk = psutil.disk_usage("/")

    # Calculate system uptime using boot time
    uptime_delta = (
        datetime.datetime.now() -
        datetime.datetime.fromtimestamp(psutil.boot_time())
    )

    # Return all collected data in dictionary format
    return {
        "time": datetime.datetime.now().strftime("%H:%M:%S"),
        "cpu_percent": cpu_percent,
        "per_cpu": per_cpu,

        # Memory details
        "memory": {
            "total": virtual_mem.total,
            "used": virtual_mem.used,
            "percent": virtual_mem.percent
        },

        # Swap memory details
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "percent": swap.percent
        },

        # Disk details
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "percent": disk.percent
        },

        # System-level information
        "system": {
            "os": platform.system(),
            "cpu": platform.processor(),
            "total_ram": round(virtual_mem.total / (1024 ** 3), 2),
            "uptime": str(uptime_delta).split('.')[0]
        }
    }

# ====================================
# PROCESS LIST MODULE
# ====================================
def get_process_list(limit=200):
    """
    Fetches list of currently running processes.
    Each process represents an active entity in OS.
    """

    processes = []

    # Iterate through all running processes
    for p in psutil.process_iter(
        ["pid", "name", "cpu_percent", "memory_percent", "status"]
    ):
        try:
            info = p.info

            # Store required process details
            processes.append({
                "pid": info["pid"],                 # Process ID
                "name": info["name"],               # Process name
                "cpu_percent": info["cpu_percent"], # CPU usage
                "memory_percent": round(info["memory_percent"], 2),
                "status": info["status"]            # Process state
            })

        except:
            # Skip processes that terminate during iteration
            continue

    # Sort processes by CPU usage (descending)
    processes.sort(key=lambda x: x["cpu_percent"], reverse=True)

    # Return limited number of processes
    return processes[:limit]

# ====================================
# ROUTES / API ENDPOINTS
# ====================================

# Home page route
@app.route("/")
def index():
    """
    Loads the main HTML page.
    """
    return render_template("index.html")

# System summary API
@app.route("/api/summary")
def api_summary():
    """
    Sends system summary data to frontend in JSON format.
    """
    return jsonify(get_system_summary())

# Process list API
@app.route("/api/processes")
def api_processes():
    """
    Sends running process list to frontend.
    """
    limit = request.args.get("limit", default=200, type=int)
    return jsonify(get_process_list(limit))

# Kill process API
@app.route("/api/processes/<int:pid>/kill", methods=["POST"])
def api_kill_process(pid):
    """
    Terminates a process using its PID.
    Demonstrates process termination and resource deallocation.
    """
    try:
        psutil.Process(pid).kill()
        return jsonify({"success": True})
    except:
        return jsonify({"success": False})

# Shutdown system API
@app.route("/api/shutdown", methods=["POST"])
def shutdown():
    """
    Shuts down the system.
    This is a privileged OS operation.
    """
    os.system("shutdown /s /t 1")
    return jsonify({"success": True})

# Restart system API
@app.route("/api/restart", methods=["POST"])
def restart():
    """
    Restarts the system.
    """
    os.system("shutdown /r /t 1")
    return jsonify({"success": True})

# Logoff user API
@app.route("/api/logoff", methods=["POST"])
def logoff():
    """
    Logs off the current user (Windows only).
    """
    if platform.system() == "Windows":
        os.system("shutdown /l")
    return jsonify({"success": True})

# ====================================
# APPLICATION ENTRY POINT
# ====================================
if __name__ == "__main__":
    """
    Starts the Flask development server.
    """
    app.run(debug=True)
