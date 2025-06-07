Microsoft Windows [Version 10.0.19045.5487]
(c) Microsoft Corporation. All rights reserved.

C:\Users\Abdulhakeem>mkdir whatsapp-print-bot

C:\Users\Abdulhakeem>cd whatsapp-print-bot

C:\Users\Abdulhakeem\whatsapp-print-bot>npm init -y
The batch file cannot be found.

C:\Users\Abdulhakeem\whatsapp-print-bot>npm init -y
Wrote to C:\Users\Abdulhakeem\whatsapp-print-bot\package.json:

{
  "name": "whatsapp-print-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": ""
}




C:\Users\Abdulhakeem\whatsapp-print-bot>npm install whatsapp-web.js qrcode-terminal win32print fs path child_process
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/win32print - Not found
npm error 404
npm error 404  'win32print@*' is not in this registry.
npm error 404
npm error 404 Note that you can also install from a
npm error 404 tarball, folder, http url, or git url.
npm error A complete log of this run can be found in: C:\Users\Abdulhakeem\AppData\Local\npm-cache\_logs\2025-02-26T17_59_10_229Z-debug-0.log

C:\Users\Abdulhakeem\whatsapp-print-bot>npm install whatsapp-web.js qrcode-terminal fs path child_process pdf-to-printer
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated fstream@1.0.12: This package is no longer supported.
npm warn deprecated puppeteer@18.2.1: < 22.8.2 is no longer supported

added 123 packages, and audited 124 packages in 1m

8 packages are looking for funding
  run `npm fund` for details

4 high severity vulnerabilities

To address all issues, run:
  npm audit fix

Run `npm audit` for details.

C:\Users\Abdulhakeem\whatsapp-print-bot>npm audit-fix
Unknown command: "audit-fix"

To see a list of supported npm commands, run:
  npm help

C:\Users\Abdulhakeem\whatsapp-print-bot>npm auditfix
Unknown command: "auditfix"


Did you mean this?
  npm audit # Run a security audit
To see a list of supported npm commands, run:
  npm help

C:\Users\Abdulhakeem\whatsapp-print-bot>npm audit fix

up to date, audited 124 packages in 3s

8 packages are looking for funding
  run `npm fund` for details

# npm audit report

ws  8.0.0 - 8.17.0
Severity: high
ws affected by a DoS when handling a request with many HTTP headers - https://github.com/advisories/GHSA-3h5v-q93c-6h6q
fix available via `npm audit fix --force`
Will install whatsapp-web.js@1.23.0, which is a breaking change
node_modules/ws
  puppeteer-core  11.0.0 - 22.11.1
  Depends on vulnerable versions of ws
  node_modules/puppeteer-core
    puppeteer  18.2.0 - 22.11.1
    Depends on vulnerable versions of puppeteer-core
    node_modules/puppeteer
      whatsapp-web.js  1.23.1-alpha.0 - 1.26.1-alpha.3
      Depends on vulnerable versions of puppeteer
      node_modules/whatsapp-web.js

4 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

C:\Users\Abdulhakeem\whatsapp-print-bot>npm audit fix --false
\^CTerminate batch job (Y/N)? y

C:\Users\Abdulhakeem\whatsapp-print-bot>npm audit fix --force
npm warn using --force Recommended protections disabled.
npm warn audit Updating whatsapp-web.js to 1.23.0, which is a SemVer major change.
npm warn deprecated puppeteer@13.7.0: < 22.8.2 is no longer supported

added 8 packages, removed 3 packages, changed 6 packages, and audited 129 packages in 1m

9 packages are looking for funding
  run `npm fund` for details

# npm audit report

ws  8.0.0 - 8.17.0
Severity: high
ws affected by a DoS when handling a request with many HTTP headers - https://github.com/advisories/GHSA-3h5v-q93c-6h6q
fix available via `npm audit fix --force`
Will install whatsapp-web.js@1.26.0, which is outside the stated dependency range
node_modules/ws
  puppeteer  11.0.0 - 18.1.0
  Depends on vulnerable versions of ws
  node_modules/puppeteer
    whatsapp-web.js  1.15.4 - 1.23.1-alpha.5 || >=1.26.1-alpha.0
    Depends on vulnerable versions of puppeteer
    node_modules/whatsapp-web.js

3 high severity vulnerabilities

To address all issues, run:
  npm audit fix --force

C:\Users\Abdulhakeem\whatsapp-print-bot>touch bot.js
'touch' is not recognized as an internal or external command,
operable program or batch file.

C:\Users\Abdulhakeem\whatsapp-print-bot>ls
'ls' is not recognized as an internal or external command,
operable program or batch file.

C:\Users\Abdulhakeem\whatsapp-print-bot>node bot.js
C:\Users\Abdulhakeem\whatsapp-print-bot\node_modules\whatsapp-web.js\src\webCache\LocalWebCache.js:34
        const version = indexHtml.match(/manifest-([\d\\.]+)\.json/)[1];
                                                                    ^

TypeError: Cannot read properties of null (reading '1')
    at LocalWebCache.persist (C:\Users\Abdulhakeem\whatsapp-print-bot\node_modules\whatsapp-web.js\src\webCache\LocalWebCache.js:34:69)
    at C:\Users\Abdulhakeem\whatsapp-print-bot\node_modules\whatsapp-web.js\src\Client.js:744:36
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

Node.js v22.14.0

C:\Users\Abdulhakeem\whatsapp-print-bot>npm update whatsapp-web.js
npm warn deprecated puppeteer@18.2.1: < 22.8.2 is no longer supported

added 3 packages, removed 8 packages, changed 6 packages, and audited 124 packages in 2m

8 packages are looking for funding
  run `npm fund` for details

4 high severity vulnerabilities

To address all issues, run:
  npm audit fix

Run `npm audit` for details.

C:\Users\Abdulhakeem\whatsapp-print-bot>node bot.js
📱 Scan this QR code in WhatsApp Web:
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▀ ▀  ▀█  ▄  ▄▀ ▄ ▀  ▄   ▀ ▄▀█▄ █▀ ▄▄ █▄ ██ ▄▄▄▄▄ █
█ █   █ █▄▀▀████▄▄██▀█▄▄█▄███▄▀▄██ ▄████ █▄▀ ▄▀▄ ██ █   █ █
█ █▄▄▄█ █ ▄ ▄█ ███▄█▀█▀▄▀▄  ▄▄▄ ▀▀ █▄█▄▄▀ ▄  █ ▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▀▄█ █ ▀ █ ▀ █▄▀▄█ █▄█ ▀▄█▄█ ▀▄▀ ▀ █▄▀▄█ █▄▄▄▄▄▄▄█
█  ▀▄▀█▄▄█▄▄▀ █▀██▀ ▄▄ ▄▄█▄   ▄▄██ ▄▄  █▄▄█▄ ▀█▄▄▄█▄ ▄▀▄▄▀█
█▀█▄ █ ▄▄█▀ ▄█▀███▀▄▄▄  ▄▀▄▀ ▀▀▀▄ █▄▄▄ ▀█▄▄▄▀ █▀██▄ ▄▀▀█▄ █
█▄██ █ ▄█▀█ ▀▀▄██▀█▄▀▄ ▀ █ █▄ █▀ ▄█▀  ▄█ ▄█▄  ▄▀█▄ ██▄▀ ███
█▄  ▀▄▀▄▄▄█ ▀█▄▀ █ ▀ █▀▀▀ ██▀▄▄▄▀█▀▀▄▀▄   ▀▄█▄▀██▄█▄█ █▄▄██
██ █▀█ ▄▄█ ██ ▄▄▄█▀ ▄▀█▀ ██   █▄█▄ ▄ ▄▄▀ ▀ ▄█▄▄█ ▄▄▀██  ███
██▀ ▄ ▀▄  ▀▄█ ▀▄▄▀█▄█▄▄██▄ █▄█ █▀  █▀▄██▀█▀▀█▄██ ██▄▀ █▄▀▄█
█▀▀ ▄█▄▄▄▄ ██ ███ █▄ █▄▄▄ █ ▀ ▄█ ████ ▄▄▄▄▄▄▄▀█▄▀██▄▄▄▀█▄▀█
██ ▀▄▀▄▄██▄▄▄▀▀██ ▀ ▀ ▀ ▀▀▄█▄█▀█▀ █▀  ██▀▄ █▄▄▀▀▄█▀█▄█ ▄▄▄█
█ ▄ ▀▀▀▄▀▀██▀ ▀▀ ▀▄ ██ ▄█▄█  ▄▄█▄▀▀ ▄▄ █▄ ▄██ ▀ ▄▄ ▄ ▄▀▄▄██
█ ▄█▄ ▄▄▄ █▀▀▀█▀██▀▀▄▀█▄ ▀█ ▄▄▄ ▄▄▄██ ▄▄▄▀ ▄▀▀███ ▄▄▄ ▄▄▄▀█
██▄▀  █▄█   █▄▀▄ ▄▄██▀██▄█▄ █▄█ ▀ ██▄ ▀ ▄█▄█ ▄█▄▄ █▄█ ▀▄▀██
█▀█  ▄ ▄▄ ▄ █ █▀█ ▀▄█▄█▄ ▀  ▄   ▀▀██▄▀ ▀██▄█▄ ▀▀█ ▄  ▄██▄▄█
█ ▄ ▀ █▄█▀▄▀▄▄▀▄█▄█▄ ▄▄▄█▄▀█▄█▄▄█▀ ▄▀▄██ ▄▄▄▄█▄█▄▀ ▀█▄▄█▄██
███▀█▄█▄▄▄ ▄█▄█▄▀▀▀ █ █▀█▀ ▀  ▀▄▀▀█▄▀▀█▀▀▀ █▄█▀▀ ██ ▄▄ ██▄█
█▀▄ ▄ ▀▄▀█ ███▄█   ▄▀    ▄▄   ██ ▄█▀▀ ▀▄ ▄█▄ ▄▄▀▀▄█▀ ▀██▄ █
███ ▀ ▀▄▄▀█▀ ▄▄█ ▄▀▄█ ▄█▀▄▀▄ ▄▀ █▄▀██▀ ▄ ▀██ █▄▀█ ▀▀▄▄▄█ ▄█
█▀ ▀▄██▄▄▀ ▄█▀ ▄▄█ ▄▀▀ ▀ █ ▄ ▄█ ▄  █▀▄▄▀▄▀███ ▄▄█▀ ▀▄█ █ ▄█
█▄  ▄█ ▄██▀ ▀███▀▄█▄▄▄ █ ▄█ ▀▄▄ █ █▄▀ ██▄▄▄█▀▀▄██▀   ▀▄█ ▄█
█▄█▀   ▄▄█▀▀▄▀█▀▄▄▄▄▄▄ █▄█▀ ▄█▄▄▄▀██▀ ▄▄█ ▄██▀▄█▄ ▀▀▄▄█▄█▀█
█ ▀ ▀▀▄▄▄█████▄▄ ▀██ █▀▀▄▄█▀▀▄   █▄▀ ▄█▀█▀▄█▀ ▄   ▀ ▀▀▀▄▄▄█
███████▄█▀ █▀▄▀▄█▀▄▄▄█▄▄▄▄▄ ▄▄▄  ▄█ ▄  ▄▀ █▄▄ █ █ ▄▄▄ ▄████
█ ▄▄▄▄▄ █▄▄▀▄█▄█▀▄▄▄ ▄ █ ▀  █▄█ █▀▀█▀ ██▀ ██▄█▀▄  █▄█ ▄▄▄▀█
█ █   █ █▀ ▀▄▀▄██▀  ▀  █▀ █     █ █▄▄▄▄▀▄▀ ▄█ ▄█▀▄ ▄  ▄ ▀ █
█ █▄▄▄█ █▀▀▄ ▀ ▄██  ▄▄███▀ █ ▄█▀▄▄██ ▄▄▀▄▄ ▄▀▀▀▄▄ ▀█▄ ███▄█
█▄▄▄▄▄▄▄█▄▄▄█▄██▄██▄▄█▄▄██▄███▄▄▄▄███▄▄█▄▄█▄▄██▄██▄█▄▄██▄██

✅ WhatsApp Bot is Ready!
✅ Print job completed.
✅ Print job completed.
✅ Print job completed.







SOME FIXES:

npm audit fix --force
taskkill /F /IM node.exe /T
tasklist | findstr chrome
taskkill /F /IM chrome.exe

npm update whatsapp-web.js puppeteer

npm install whatsapp-web.js

pm2 restart whatsapp-bot-server --watch

pm2 start bot.js --name whatsapp-bot-server --watch
pm2 start server.js --name whatsapp-server --watch
pm2 restart bot.js --name whatsapp-bot-server --watch
pm2 restart server.js --name whatsapp-server --watch

if bot does not generate qr:

Terminate chrome:
taskkill /F /IM chrome.exe

Terminate node:
taskkill /F /IM node.exe



reset task print if the print is finishes











