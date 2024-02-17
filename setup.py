import os
import subprocess
import sys

def create_and_activate_venv():
    venv_dir = "venv"

    # Check if the virtual environment directory already exists
    if not os.path.exists(venv_dir):
        # Create virtual environment
        print("Creating virtual environment...")
        subprocess.check_call([sys.executable, '-m', 'venv', venv_dir])

    # Activate the virtual environment
    # On Windows, we use 'venv\Scripts\activate', otherwise 'venv/bin/activate'
    activate_script = os.path.join(venv_dir, 'Scripts', 'activate') if os.name == 'nt' else os.path.join(venv_dir, 'bin', 'activate')
    activate_command = f". {activate_script}"
    print(f"To activate the virtual environment, run the following command:\n{activate_command}")

def install_dependencies():
    print("Installing dependencies from requirements.txt...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])

if __name__ == "__main__":
    create_and_activate_venv()
    install_dependencies()
    print("Setup complete. Please activate the virtual environment as instructed above before proceeding.")
