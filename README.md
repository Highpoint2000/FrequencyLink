# Frequency Link for [FM-DX-Webserver](https://github.com/NoobishSVK/fm-dx-webserver) (Browser Extension!)

This browser extension plugin links frequency databases, websites or log files to the FMDX web server so that the frequencies can be selected directly.

![image](https://github.com/user-attachments/assets/5da01050-dc3d-400f-b807-a0014d3bfd7f)
![image](https://github.com/user-attachments/assets/8cd7f928-1d45-4d91-ba0f-14f416d743b4)
![image](https://github.com/user-attachments/assets/c57dee76-c666-4552-addb-8bbce7ffaf4f)
![image](https://github.com/user-attachments/assets/6e8d8c2f-d104-4f71-a576-1f93c085c498)


## v1.1b (Cromium Browser compatible - Firefox coming soon!)
- Compatible with FMLIST visual logbook

## Installation notes:

1. [Download](https://github.com/Highpoint2000/FrequencyLink/releases) the last repository as a zip
2. Extract the ZIP to a folder on your computer
3. Open Chrome and type this in the address bar to go to the extensions management page: chrome://extensions/ or edge://extensions/
4. At the top-right of the page, toggle Developer Mode on
5. On the extensions page, click the "Load unpacked" button
6. A file explorer window will pop up. Navigate to the folder where the extension's files are located
7. Select the folder that contains the unpacked extension (the folder should include the manifest.json file)
8. Click "Select Folder" (or "Open"), and the extension will be installed
9. Restart the browser and load an FMDX web server, all frequencies (MAPALL, scanner LOGFILE, databases) become clickable and load them into the web server

## Important notes: 

Checked sites are:
- https://maps.fmdx.org/
- https://db.wtfda.org/
- https://eservices.traficom.fi/Licensesservices/Forms/BCLicenses.aspx
- https://fmscan.org/
- https://fmlist.org/fm_logmap.php
- https://palvelut.mediamonitori.fi/

Additional pages are welcome to be included. Occasionally a pop window appears, which closes automatically. Unfortunately, this cannot be disabled and is required to read and transmit the frequency.

## History

## v1.1a (Cromium Browser compatible - Firefox coming soon!)
- Bugfixing
- Built-in switch for console logging

## v1.1 (Cromium Browser compatible - Firefox coming soon!)
- revision of websocket communication
- the last opened web server is linked
- only explicit websites are parsed (see list!)

### v1.0
- Extension for Chrome browser (Firefox coming soon!)
