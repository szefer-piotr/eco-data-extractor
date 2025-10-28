import pytest
import requests
import json
import time
import tempfile
import os

BASE_URL = "http://localhost:8000/api"

UPLOAD_TIMEOUT = 10
STATUS_TIMEOUT = 10
GENERAL_TIMEOUT = 30

CATEGORIES = [
    {
        "name": "topic",
        "prompt": "What is the main topic discussed in: {text}",
        "expected_values": ["machine learning", "deep learning", "NLP", "other"]
    }
]

CSV_DATA = """id,abstract
1,Machine learning is a subset of artificial intelligence
2,Deep learning networks are inspired by biological neural networks
3,Natural language processing helps computers understand human language"""


@pytest.fixture
def csv_file():
    """Create and cleanup test CSV file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(CSV_DATA)
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.remove(temp_path)


@pytest.fixture
def uploaded_job_id(csv_file):
    """Upload CSV and return job_id for reuse"""
    with open(csv_file, "rb") as f:
        files = {"file": f}
        data = {
            "categories_json": json.dumps(CATEGORIES),
            "provider": "openai",
            "model": "gpt-4o-mini"
        }
        try:
            response = requests.post(
                f"{BASE_URL}/upload/csv", 
                files=files, 
                data=data, 
                timeout=UPLOAD_TIMEOUT
            )
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            pytest.skip(f"Backend server not running or timed out: {e}")
    
    assert response.status_code == 200, f"Upload failed: {response.json()}"
    return response.json()["job_id"]


def test_upload_csv(csv_file):
    """Test that CSV upload works"""
    with open(csv_file, "rb") as f:
        files = {"file": f}
        data = {
            "categories_json": json.dumps(CATEGORIES),
            "provider": "openai",
            "model": "gpt-4o-mini"
        }
        response = requests.post(
            f"{BASE_URL}/upload/csv",
            files=files,
            data=data,
            timeout=UPLOAD_TIMEOUT
        )
    
    result = response.json()
    print(result)
    
    assert response.status_code == 200
    assert "job_id" in result
    assert result["status"] == "submitted"


def test_validate_file(uploaded_job_id):
    """Test file validation using uploaded job"""
    response = requests.get(
        f"{BASE_URL}/upload/validate?file_id={uploaded_job_id}",
        timeout=GENERAL_TIMEOUT
    )
    assert response.status_code == 200
    result = response.json()
    assert result["file_id"] == uploaded_job_id
    assert result["is_valid"] == True


def test_extraction_workflow(csv_file):
    """Full integration test: upload → validate → process → get results"""
    
    with open(csv_file, "rb") as f:
        files = {"file": f}
        data = {
            "categories_json": json.dumps(CATEGORIES),
            "provider": "openai",
            "model": "gpt-4o-mini"
        }
        response = requests.post(
            f"{BASE_URL}/upload/csv", 
            files=files, 
            data=data,
            timeout=UPLOAD_TIMEOUT)
    
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    print(f"Job created: {job_id}")
    
    # STEP 2: Validate
    response = requests.get(
        f"{BASE_URL}/upload/validate?file_id={job_id}",
        timeout=GENERAL_TIMEOUT
    )
    assert response.status_code == 200
    
    # STEP 3: Wait for completion
    max_wait = 100
    start_time = time.time()
    poll_count = 0

    while time.time() - start_time < max_wait:
        poll_count += 1
        response = requests.get(
            f"{BASE_URL}/extraction/status/{job_id}",
            timeout=STATUS_TIMEOUT
        )
        assert response.status_code == 200
        
        status = response.json()
        progress = status.get('progress_percent', 0)
        print(f"Poll #{poll_count}: Status={status['status']}, Progress={progress:.1f}%, Rows={status['processed_rows']}/{status['total_rows']}")
        
        if status["status"] == "completed":
            print("✅ Job completed!")
            break
        elif status["status"] == "failed":
            pytest.fail(f"Job failed: {status}")
        
        time.sleep(5)  # Wait 5 seconds before next poll
    else:
        pytest.fail(f"Job {job_id} did not complete within {max_wait} seconds")
    
    # STEP 4: Get results
    response = requests.get(
        f"{BASE_URL}/extraction/results/{job_id}",
        timeout=GENERAL_TIMEOUT
    )
    assert response.status_code == 200
    
    results = response.json()
    assert "results" in results
    assert len(results["results"]) > 0
    print(f"✅ Got {len(results['results'])} results")