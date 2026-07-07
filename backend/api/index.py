import sys
import os

# Ensure we can find our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
