# CodeQL wrapper

This repository includes a small wrapper `codeql.cmd` that calls the CodeQL CLI installed in your user roaming folder.

Usage (Windows PowerShell or CMD):

```powershell
# From the repo root
./codeql.cmd version
```

If you prefer global access, the installer also added the CodeQL folder to your Windows user PATH (`%USERPROFILE%\AppData\Roaming\Code\User\codeql`). You may need to restart terminals or Windows Explorer for the updated PATH to be visible to new shells.

If you'd like, I can also add a small `codeql` shim for WSL/Unix shells or update your system PATH instead of the user PATH.
