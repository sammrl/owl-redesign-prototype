# Installation Guide

This guide will help you set up both the FastAPI backend and React frontend components of the project.

## Prerequisites

- Python 3.10 or higher
- Node.js 16.x or higher
- npm 8.x or higher
- Git

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd <your-repository-directory>
```

## Step 2: Set Up the Backend Environment

### Create a Python Virtual Environment

```bash
# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# For macOS/Linux
source .venv/bin/activate
# For Windows
.venv\Scripts\activate
```

### Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Install FastAPI Dependencies

The FastAPI backend requires some additional dependencies:

```bash
pip install fastapi uvicorn websockets python-multipart python-dotenv
```

### Configure Environment Variables

```bash
# Copy the template environment file
cp owl/.env_template .env

# Edit the .env file with your preferred text editor to add API keys
# At minimum, you'll need to set OPENAI_API_KEY for basic functionality
```

## Step 3: Set Up the Frontend

### Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Configure Frontend Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env to set the API URL
# The default is http://localhost:8000/api which will work with your FastAPI backend
```

## Step 4: Running the Application

### Start the FastAPI Backend

From the project root directory (with your virtual environment activated):

```bash
# Option 1: Run directly with Python
python owl_api/main.py

# Option 2: Run with uvicorn (more control over server options)
uvicorn owl_api.main:app --host 0.0.0.0 --port 8000 --reload
```

This will start the FastAPI backend server on port 8000.

### Start the Frontend Development Server

In a separate terminal:

```bash
cd frontend
npm run dev
```

This will start the frontend development server, typically on port 5173.

## Step 5: Accessing the Application

Once both servers are running, you can access:

- Frontend application: http://localhost:5173
- API documentation: http://localhost:8000/docs
- API alternative docs: http://localhost:8000/redoc

## Testing the API

You can test the API endpoints directly using the Swagger UI documentation at http://localhost:8000/docs, which provides an interactive interface for trying out API calls.

Alternatively, you can use tools like curl or Postman to test the API:

```bash
# Test the API health endpoint
curl http://localhost:8000/

# List available modules
curl http://localhost:8000/api/modules/list

# Start a query
curl -X POST http://localhost:8000/api/run/async \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the weather in New York?", "module": "run"}'
```

## Troubleshooting

### Backend Issues

- If you encounter module import errors, make sure your working directory is the project root
- Check the Python path if you have issues with imports from the owl module
- Look for error messages in the terminal where the backend is running

### Frontend Issues

- If the frontend can't connect to the backend, check that the API URL is correctly set in `.env`
- Make sure the backend server is running before attempting to use the frontend
- Check browser console for any JavaScript errors or network issues

#### Browser Process Not Starting
- **Symptom**: Visible browser window doesn't appear when expected
- **Solution**: Verify Chrome is installed and accessible on your system
- **Solution**: Check permissions for Chrome to open new windows

#### Module Compatibility Issues
- **Symptom**: Errors when selecting non-default modules in the UI
- **Solution**: Currently, only the `run_mini` module is fully tested and functional with the frontend
- **Workaround**: Stick to using the `run_mini` module for most reliable operation
- **Note**: Command-line usage of other modules still works directly via Python

For more detailed information about known issues, please refer to the [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) file.

## Building for Production

### Build the Frontend

```bash
cd frontend
npm run build
```

This will create a production-ready build in the `frontend/dist` directory.

### Run the Backend in Production

For production deployment, it's recommended to use a production ASGI server:

```bash
# Install Gunicorn (Linux/macOS only)
pip install gunicorn uvicorn

# Run with Gunicorn
gunicorn -k uvicorn.workers.UvicornWorker -w 4 owl_api.main:app -b 0.0.0.0:8000

# For Windows, use uvicorn directly
uvicorn owl_api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Consider using process managers like PM2, Supervisor, or systemd to keep the backend running.

## Recent Fixes and Known Issues

### Recent Implementation Improvements

The system has recently received several important fixes that improve stability:

1. **WebSocket Connection**: Fixed URL construction and added better error handling for WebSocket connections.
2. **Task Registry Management**: Improved how task information is shared between processes.
3. **Resource Management**: Added proper cleanup of multiprocessing resources.
4. **Registry Persistence**: Added registry saving and recovery to prevent data loss.

### Troubleshooting Common Issues

If you encounter any of these issues during installation or usage:

#### Empty Response Bubbles
- **Symptom**: Tasks complete successfully but no response appears in chat
- **Workaround**: Try reloading the page or sending a new query

#### Task Duplication
- **Symptom**: You see the same task being processed multiple times
- **Workaround**: Wait for all processing to complete before sending new queries

#### WebSocket Connection Issues
- **Symptom**: "Connection error" messages in the UI
- **Solution**: Check that both backend and frontend are running, and refresh the page

#### Browser Process Not Starting
- **Symptom**: Visible browser window doesn't appear when expected
- **Solution**: Verify Chrome is installed and accessible on your system
- **Solution**: Check permissions for Chrome to open new windows

#### Module Compatibility Issues
- **Symptom**: Errors when selecting non-default modules in the UI
- **Solution**: Currently, only the `run_mini` module is fully tested and functional with the frontend
- **Workaround**: Stick to using the `run_mini` module for most reliable operation
- **Note**: Command-line usage of other modules still works directly via Python

For more detailed information about known issues, please refer to the [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) file. 