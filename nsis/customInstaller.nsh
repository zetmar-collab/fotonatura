; FotoNatura — custom NSIS hooks
; customInit jest wywoływane przez electron-builder na samym początku .onInit,
; zanim pojawi się jakikolwiek dialog (w tym "aplikacja jest uruchomiona").

!macro customInit
  ; Wymuś zamknięcie działającej instancji FotoNatura przed instalacją
  ExecWait '"$SYSDIR\taskkill.exe" /F /IM "FotoNatura.exe"'
  Sleep 1000
!macroend

!macro customUnInstall
  ; Wymuś zamknięcie działającej instancji przed odinstalowaniem
  ExecWait '"$SYSDIR\taskkill.exe" /F /IM "FotoNatura.exe"'
  Sleep 500
!macroend
