@echo off
setlocal
title Set Haravan access token

powershell.exe -NoLogo -NoProfile -Command "$secureToken = Read-Host 'Paste the new Haravan access token' -AsSecureString; $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken); try { $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer); if ([string]::IsNullOrWhiteSpace($plainToken)) { throw 'Token cannot be empty.' }; [Environment]::SetEnvironmentVariable('HARAVAN_ACCESS_TOKEN', $plainToken, 'User'); Write-Host 'Token saved. Return to Codex and retry the task.' -ForegroundColor Green } finally { if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) } }"

if errorlevel 1 (
  echo Failed to save the token.
  pause
  exit /b 1
)

pause
