# Performance Issue Reporting

Performance issues are hard to track down, and a good report is necessary for fixing them.

In addition to the normal issues, please include a profile in performance-related issues and below information:

- TypeScript version (Find it in Output -> Vue Language Server)

## Profiling

Vetur has 2 parts:

- The client at `/client`. This is a normal VS Code extension.
- The server (Vue Language Server) at `/server`. This is a language server.

Here is a rough illustration:

![Language client and server](https://code.visualstudio.com/assets/api/language-extensions/language-server-extension-guide/lsp-illustration.png)

The perf issue is mostly caused by the server. Here's how to profile it.

- You need Chrome for profiling.
- Set `vetur.dev.vlsPort` to a number, say `8000`.
- Open [chrome://inspect/](chrome://inspect/) in Chrome.
- You should see a Node.js remote target like below. That's the VLS process. Click it.
    ![image](https://user-images.githubusercontent.com/4033249/56996577-d61d0c00-6b59-11e9-85f0-29dc15e2e2aa.png)
    - If you don't see the target, click `Open dedicated DevTools for Node` and in the `Connection` tab, click `Add connection` and add `localhost:<vetur.dev.vlsPort>`
- Go to the `Profiler` tab. Click `Start`.
- Edit some Vue files in your editor.
- Click `Stop`.
- Save the profile. Zip it and attach to issue report.
