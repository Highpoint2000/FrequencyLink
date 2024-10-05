/////////////////////////////////////////////////////////
///                                                   ///
//            FREQUENCY LINK FOR FM-DX WEBSERVER      ///
//                       (V1.1d)                      ///
//                                                    ///
//                     by Highpoint                   ///
//               last update: 05.10.24                ///
//                                                    ///
//  https://github.com/Highpoint2000/FrequencyLink    ///
//                                                    ///
/////////////////////////////////////////////////////////

let enableLogging = false; // Set this to true to enable all console.log messages

/////////////////////////////////////////////////////////

// Custom logging function that respects the enableLogging flag
function logMessage(...args) {
    if (enableLogging) {
        console.log(...args);
    }
}

let lastWebSocketUrl = null; // Store the last successful WebSocket URL here
let checkedDomains = {}; // Cache for checked domains with ports

// Function to create a WebSocket promise and close immediately after connecting
async function createWebSocketPromise(host, port, isSecure) {
    const protocol = isSecure ? 'wss' : 'ws'; // Determine the protocol based on isSecure
    const webSocketUrl = `${protocol}://${host}:${port}/text`;
    logMessage('Attempting to connect to WebSocket:', webSocketUrl);

    return new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketUrl);

        socket.onopen = function () {
            logMessage('WebSocket connection successful:', webSocketUrl);
            lastWebSocketUrl = webSocketUrl; // Store the last successful connection
            logMessage(`Stored WebSocket URL: ${lastWebSocketUrl}`);
            checkedDomains[`${host}:${port}`] = true; // Mark the host and port as successfully checked
            socket.close(); // Close the connection immediately
            resolve(webSocketUrl); // Return the WebSocket URL
        };

        socket.onerror = function (error) {
            logMessage('WebSocket error:', error);
            checkedDomains[`${host}:${port}`] = false; // Mark the host and port as failed
            reject(error);
        };

        socket.onclose = function () {
            logMessage('WebSocket connection closed');
        };
    });
}

// Function to send frequency data over a temporary WebSocket connection
async function sendDataToClient(frequency) {
    if (!lastWebSocketUrl) {
        logMessage('No stored WebSocket URL available.');
        return;
    }

    logMessage('Opening temporary WebSocket connection to send data:', lastWebSocketUrl);
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(lastWebSocketUrl);

        socket.onopen = function () {
            const dataToSend = `T${(frequency * 1000).toFixed(0)}`; // Send frequency multiplied by 1000
            socket.send(dataToSend);
            logMessage("WebSocket sending:", dataToSend);
            socket.close(); // Close the connection after sending the data
            resolve();
        };

        socket.onerror = function (error) {
            logMessage('Error sending WebSocket data:', error);
            reject(error);
        };

        socket.onclose = function () {
            logMessage('Temporary WebSocket connection closed');
        };
    });
}

// Function to check WebSocket availability for a domain and port
function checkWebSocketAvailability(host, port, isSecure, callback) {
    const domainKey = `${host}:${port}`; // Combine host and port as the key for checking

    // Check if the domain and port have already been checked
    if (checkedDomains[domainKey] !== undefined) {
        logMessage(`WebSocket check skipped for already verified domain and port: ${domainKey}`);
        callback(checkedDomains[domainKey], host, port); // Directly use the cached result
        return;
    }

    const protocol = isSecure ? 'wss' : 'ws'; // Determine the protocol based on isSecure
    const wss = new WebSocket(`${protocol}://${host}:${port}/text`);

    let timeout = setTimeout(() => {
        wss.close();
        logMessage(`WebSocket check timed out for: ${host}:${port}`);
        checkedDomains[domainKey] = false; // Mark as not available
        callback(false, host, port);
    }, 2000);

    wss.onopen = function () {
        clearTimeout(timeout);
        logMessage(`WebSocket available at ${protocol}://${host}:${port}/text`);
        wss.close();
        checkedDomains[domainKey] = true; // Mark as available
        callback(true, host, port);
    };

    wss.onerror = function () {
        clearTimeout(timeout);
        logMessage(`WebSocket not available at ${protocol}://${host}:${port}/text`);
        checkedDomains[domainKey] = false; // Mark as not available
        callback(false, host, port);
    };
}

// Tabs update listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        logMessage("Visited URL:", changeInfo.url);

        const urlObj = new URL(changeInfo.url);
        const host = urlObj.hostname;

        const frequency = extractFrequency(changeInfo.url);
        if (frequency) {
            logMessage(`Extracted frequency from excluded host: ${frequency}`);
            await sendDataToClient(frequency);
        }

        const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80); // Default to port 443 for HTTPS, 80 for HTTP
        const isSecure = urlObj.protocol === 'https:'; // Check if the protocol is HTTPS

        logMessage(`Checking WebSocket availability for: ${host}:${port}`);

        // Skip WebSocket check if the domain and port are already verified
        checkWebSocketAvailability(host, port, isSecure, async (isAvailable, validHost, validPort) => {
            if (isAvailable) {
                logMessage(`WebSocket found and connected to ${validHost}:${validPort}/text`);
                lastWebSocketUrl = `${isSecure ? 'wss' : 'ws'}://${validHost}:${validPort}/text`; // Always update to the latest

                const frequency = extractFrequency(changeInfo.url);
                if (frequency) {
                    await sendDataToClient(frequency);
                } else {
                    logMessage("No frequency found in the URL.");
                }
            } else {
                logMessage(`WebSocket not available for this host and port: ${host}:${port}`);
            }
        });
    }
});

// Function to extract frequency from the URL and replace %2C or comma with a dot
function extractFrequency(url) {
    const decodedUrl = decodeURIComponent(url);
    logMessage(`Decoded URL: ${decodedUrl}`);

    // Updated regex to handle both ?f= and #freq= patterns
    const fmscanRegex = /[?&]f=([\d]+[.,]?[\d]*)|f=([\d]+[.,]?[\d]*)/;
    const freqRegex = /#freq=([\d]+[.,]*[\d]*)/;

    const fmscanMatch = decodedUrl.match(fmscanRegex);
    const freqMatch = decodedUrl.match(freqRegex);
    logMessage(`fmscanMatch: ${fmscanMatch}`);

    let frequency; // Initialize frequency

    if (fmscanMatch) {
        frequency = fmscanMatch[1] || fmscanMatch[2]; // Capture from either group
    } else if (freqMatch) {
        frequency = freqMatch[1];
    }

    // Replace comma with dot and ensure it has a decimal point
    if (frequency) {
        frequency = frequency.replace(',', '.');
        if (!frequency.includes('.')) {
            frequency += '.0'; // Append .0 if no decimal point exists
        }
        // Parse the frequency into a float for further calculations
        frequency = parseFloat(frequency);
    }

    logMessage(`Extracted frequency: ${frequency}`);
    return frequency;
}
