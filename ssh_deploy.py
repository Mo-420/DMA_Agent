#!/usr/bin/env python3
import subprocess
import sys
import os

def run_ssh_command(host, password, command):
    """Run SSH command with password authentication"""
    try:
        # Use sshpass if available
        cmd = ['sshpass', '-p', password, 'ssh', '-o', 'StrictHostKeyChecking=no', host, command]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return result.returncode == 0, result.stdout, result.stderr
    except FileNotFoundError:
        # Fallback to expect
        expect_script = f'''
spawn ssh -o StrictHostKeyChecking=no {host}
expect "password:"
send "{password}\\r"
expect "# "
send "{command}\\r"
expect "# "
send "exit\\r"
expect eof
'''
        with open('/tmp/ssh_script.exp', 'w') as f:
            f.write(expect_script)
        
        result = subprocess.run(['expect', '/tmp/ssh_script.exp'], 
                              capture_output=True, text=True, timeout=300)
        return result.returncode == 0, result.stdout, result.stderr

# Deploy to Hetzner
host = "root@78.46.232.79"
password = "weQh4Cff8sHEU?y2i1K8FWMMWy1syz/StGMItGYZBW70paHY3Q3SudTOE"

commands = [
    "apt-get update -y",
    "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
    "apt-get install -y nodejs",
    "npm install -g pm2",
    "git clone https://github.com/Mo-420/DMA_Agent.git",
    "cd DMA_Agent && npm install",
    "cd DMA_Agent && cp env.example .env",
    "echo '✓ Deployment complete!'"
]

print("🚀 Starting automated deployment...")

for i, cmd in enumerate(commands, 1):
    print(f"Step {i}/{len(commands)}: {cmd}")
    success, stdout, stderr = run_ssh_command(host, password, cmd)
    
    if success:
        print(f"✅ Step {i} completed")
        if stdout:
            print(f"Output: {stdout.strip()}")
    else:
        print(f"❌ Step {i} failed: {stderr}")
        sys.exit(1)

print("🎉 Deployment completed successfully!")
