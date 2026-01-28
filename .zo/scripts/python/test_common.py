#!/usr/bin/env python3
"""
Common test utilities for comparing bash and Python script outputs.
"""

import json
import subprocess
import sys
from pathlib import Path


def extract_json(output):
    """Extract JSON from output, skipping non-JSON lines."""
    for line in output.split('\n'):
        line = line.strip()
        if line.startswith('{') and line.endswith('}'):
            try:
                return json.loads(line)
            except:
                pass
    return None


def compare_json_values(test_name, args, env, run_bash_script, run_python_script, 
                        print_info, print_success, print_fail):
    """
    Compare JSON values between bash and Python outputs.
    Only compares JSON fields, ignores log lines.
    
    Args:
        test_name: Name of the test
        args: Command line arguments
        env: Environment variables
        run_bash_script: Function to run bash script
        run_python_script: Function to run python script
        print_info: Info print function
        print_success: Success print function
        print_fail: Failure print function
        
    Returns:
        True if JSON values match, False otherwise
    """
    print_info("Test: " + test_name)
    print_info("Args: " + str(args))
    if env:
        print_info("Env: " + str(env))
    
    bash_code, bash_stdout, bash_stderr = run_bash_script(args, env)
    python_code, python_stdout, python_stderr = run_python_script(args, env)
    
    # Compare exit codes
    if bash_code != python_code:
        print_fail("Exit codes differ: bash=" + str(bash_code) + ", python=" + str(python_code))
        return False
    print_success("Exit codes match: " + str(bash_code))
    
    # Extract JSON from output (skip non-JSON lines)
    bash_json = extract_json(bash_stdout)
    python_json = extract_json(python_stdout)
    
    if bash_json is None or python_json is None:
        print_fail("Could not extract JSON from output")
        print("  Bash stdout:", bash_stdout[:200] if bash_stdout else "(empty)")
        print("  Python stdout:", python_stdout[:200] if python_stdout else "(empty)")
        return False
    
    # Compare JSON values
    if bash_json == python_json:
        print_success("JSON values match")
        return True
    else:
        print_fail("JSON values differ:")
        print("  Bash:", json.dumps(bash_json, indent=2))
        print("  Python:", json.dumps(python_json, indent=2))
        return False
