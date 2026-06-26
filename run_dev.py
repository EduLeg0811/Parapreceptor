import os
import sys
import subprocess
import threading
import time

def log(prefix, text):
    lines = text.splitlines()
    for line in lines:
        print(f"[{prefix}] {line}")

def stream_output(process, prefix):
    # Stream stdout
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            log(prefix, output.strip())
            
    # Stream stderr
    while True:
        err = process.stderr.readline()
        if err == '' and process.poll() is not None:
            break
        if err:
            log(prefix, err.strip())

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    backend_dir = os.path.join(root_dir, "BACKEND")
    frontend_dir = os.path.join(root_dir, "FRONTEND")
    
    # Determine Backend Python interpreter
    venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        backend_python = venv_python
    else:
        backend_python = "python"
        
    print("--- Starting Parapreceptor Development Environment ---")
    
    # Start Backend
    print(f"Backend Python: {backend_python}")
    backend_cmd = [
        backend_python, "-m", "uvicorn", "backend.main:app",
        "--host", "127.0.0.1", "--port", "8787", "--reload"
    ]
    
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    # Start Frontend
    # Try npm run dev (or bun run dev if bun is installed and lock file exists)
    frontend_cmd = ["npm.cmd", "run", "dev"]
    # Check if bun.lockb exists and bun is available (optional fallback, but npm is safer by default)
    if os.path.exists(os.path.join(frontend_dir, "bun.lockb")):
        # We can still use npm.cmd since package-lock.json exists, but if we want we can check bun.
        # Let's check if npm is installed, otherwise try npm. If on windows, npm is npm.cmd
        pass
        
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        shell=True  # Required for .cmd files on Windows
    )
    
    # Start output streaming threads
    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND"), daemon=True)
    t1.start()
    t2.start()
    
    print("\nDevelopment servers started!")
    print("Backend: http://127.0.0.1:8787")
    print("Frontend: Check frontend logs for the URL (usually http://localhost:5173)\n")
    print("Press Ctrl+C to stop both servers.\n")
    
    try:
        while True:
            # Check if either process died
            if backend_proc.poll() is not None:
                print("[SYSTEM] Backend process stopped.")
                break
            if frontend_proc.poll() is not None:
                print("[SYSTEM] Frontend process stopped.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[SYSTEM] Stopping servers...")
    finally:
        # Terminate processes
        for name, proc in [("Backend", backend_proc), ("Frontend", frontend_proc)]:
            if proc.poll() is None:
                print(f"[SYSTEM] Terminating {name}...")
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print(f"[SYSTEM] Force killing {name}...")
                    proc.kill()
        print("[SYSTEM] Servers stopped.")

if __name__ == "__main__":
    main()
