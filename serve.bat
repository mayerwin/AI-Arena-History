@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set START_PORT=8765
set MAX_PORT=8800
set PORT=%START_PORT%

:findport
REM Anchor the port match with a literal space before the colon so :8765 doesn't match :18765.
REM No "LISTENING" state filter: it's localized on non-English Windows (e.g. German "ABHÖREN")
REM and would silently fail. If anything (LISTENING, TIME_WAIT, ...) is bound to the port, skip.
netstat -ano | findstr /R /C:" 0.0.0.0:%PORT% " /C:" \[::]:%PORT% " /C:" \[::1]:%PORT% " /C:" 127.0.0.1:%PORT% " > nul 2>&1
if %errorlevel% == 0 (
    set /a PORT+=1
    if !PORT! gtr %MAX_PORT% (
        echo No free port found between %START_PORT% and %MAX_PORT%.
        pause
        exit /b 1
    )
    goto findport
)

set URL=http://localhost:!PORT!/index.html

echo.
echo  AI Arena History - dev server
echo  -----------------------------
echo  URL: !URL!
echo  Close this window to stop the server.
echo.

start "" "!URL!"

REM Closing this window terminates the npx http-server child too.
npx --yes http-server -p !PORT! -c-1 -s .

endlocal
