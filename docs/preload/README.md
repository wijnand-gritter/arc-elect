[**Arc Elect Documentation v1.0.0**](../README.md)

---

[Arc Elect Documentation](../modules.md) / preload

# preload

Exposes a secure IPC bridge for file operations and settings to the renderer process.

This module provides a secure communication channel between the renderer
and main processes using Electron's contextBridge. It exposes only the
necessary APIs to prevent security vulnerabilities.

## Author

Wijnand Gritter
