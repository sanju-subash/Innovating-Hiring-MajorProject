@echo off
echo Starting all servers...

REM Start backend servers
cd src\backend

start /b python databaseoperations.py
echo Started databaseoperations.py on port 5000

start /b python extracttext.py
echo Started extracttext.py on port 5001

start /b python mcqquestion.py
echo Started mcqquestion.py on port 5002

start /b node deepgram.js
echo Started deepgram.js on port 5005

start /b node hrpostbackend.js
echo Started hrpostbackend.js on port 5010

REM Return to root directory and start frontend
cd ..\..
start /b npm run dev
echo Started frontend development server

echo.
echo All servers started successfully!
echo.
echo Frontend website available at: http://localhost:5173
echo Backend APIs running on ports: 5000, 5001, 5002, 5005, 5010
echo.
echo Press Ctrl+C to stop all servers.
pause