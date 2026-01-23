import os
import subprocess
import time
import sys

def kill_port_8000():
    print("Finding process on port 8000...")
    try:
        # Run netstat to find the PID
        # 'findstr' might return nothing and cause CalledProcessError if not found
        output = subprocess.check_output("netstat -ano | findstr :8000", shell=True).decode()
        lines = output.strip().split('\n')
        pids = set()
        for line in lines:
            parts = line.strip().split()
            # typical line: TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       1234
            # verify it is actually port 8000 logic could be improved but this usually works
            if len(parts) >= 5 and ":8000" in parts[1]:
                pid = parts[-1]
                pids.add(pid)
        
        for pid in pids:
            if pid != "0":
                print(f"Killing PID {pid}...")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True)
    except subprocess.CalledProcessError:
        print("No process found on port 8000.")
    except Exception as e:
        print(f"Error checking port: {e}")

if __name__ == "__main__":
    kill_port_8000()
    time.sleep(2)
    print("Starting server...")
    # Use Popen to run in background/independent
    subprocess.Popen([sys.executable, "run.py"])
    print("Server restart initiated.")
