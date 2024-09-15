/////////////////////////////////////////////////////////
///                                                   ///
///  FREQUENCY LINK FOR FM-DX-WEBSERVER (V1.0a BETA)  ///
///                                                   ///
///  by Highpoint        last update: 15.09.24        ///
///                                                   ///
///  https://github.com/Highpoint2000/FrequencyLink   ///
///                                                   ///
/////////////////////////////////////////////////////////

let lastWebSocketUrl = null; // Store the last successful WebSocket URL here
let checkedDomains = {}; // Cache for checked domains

// Function to create a WebSocket promise and close immediately after connecting
async function createWebSocketPromise(host, port) {
    const webSocketUrl = `ws://${host}:${port}/text`;
    console.log('Attempting to connect to WebSocket:', webSocketUrl);

    return new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketUrl);

        socket.onopen = function () {
            console.log('WebSocket connection successful:', webSocketUrl);
            lastWebSocketUrl = webSocketUrl; // Store the last successful connection
            console.log(`Stored WebSocket URL: ${lastWebSocketUrl}`);
            checkedDomains[host] = true; // Mark the domain as successfully checked
            socket.close(); // Close the connection immediately
            resolve(webSocketUrl); // Return the WebSocket URL
        };

        socket.onerror = function (error) {
            console.error('WebSocket error:', error);
            checkedDomains[host] = false;
            reject(error);
        };

        socket.onclose = function () {
            console.log('WebSocket connection closed');
        };
    });
}

// Function to check WebSocket availability and immediately close the connection
async function connectWebSocket(host, port) {
    if (lastWebSocketUrl) {
        console.log('WebSocket URL already known:', lastWebSocketUrl);
        return;
    }
    await createWebSocketPromise(host, port);
}

// Function to send frequency data over a temporary WebSocket connection
async function sendDataToClient(frequency) {
    if (!lastWebSocketUrl) {
        console.error('No stored WebSocket URL available.');
        return;
    }

    console.log('Opening temporary WebSocket connection to send data:', lastWebSocketUrl);
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(lastWebSocketUrl);

        socket.onopen = function () {
            const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
            socket.send(dataToSend);
            console.log("WebSocket sending:", dataToSend);
            socket.close(); // Close the connection after sending the data
            resolve();
        };

        socket.onerror = function (error) {
            console.error('Error sending WebSocket data:', error);
            reject(error);
        };

        socket.onclose = function () {
            console.log('Temporary WebSocket connection closed');
        };
    });
}

// Function to check WebSocket availability for a domain
function checkWebSocketAvailability(host, port, callback) {
    if (checkedDomains[host] !== undefined) {
        console.log(`WebSocket check skipped for already verified domain: ${host}`);
        callback(checkedDomains[host], host, port);
        return;
    }

    const ws = new WebSocket(`ws://${host}:${port}/text`);

    let timeout = setTimeout(() => {
        ws.close();
        console.log(`WebSocket check timed out for: ${host}:${port}`);
        checkedDomains[host] = false;
        callback(false, host, port);
    }, 2000);

    ws.onopen = function () {
        clearTimeout(timeout);
        console.log(`WebSocket available at ws://${host}:${port}/text`);
        ws.close();
        checkedDomains[host] = true;
        callback(true, host, port);
    };

    ws.onerror = function () {
        clearTimeout(timeout);
        console.log(`WebSocket not available at ws://${host}:${port}/text`);
        checkedDomains[host] = false;
        callback(false, host, port);
    };
}

// Tabs update listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log("Visited URL:", changeInfo.url);

        const urlObj = new URL(changeInfo.url);
        const host = urlObj.hostname;

        const excludedHosts = ['newtab', 'maps.fmdx.org', 'fmscan.org', 'db.wtfda.org'];

        if (excludedHosts.includes(host)) {
            console.log(`WebSocket check skipped for: ${host}`);
            
            const frequency = extractFrequency(changeInfo.url);
            if (frequency) {
                console.log(`Extracted frequency from excluded host: ${frequency}`);
                await sendDataToClient(frequency);
            }

        }

        const port = urlObj.port || 8080;

        console.log(`Checking WebSocket availability for: ${host}:${port}`);

        checkWebSocketAvailability(host, port, async (isAvailable, validHost, validPort) => {
            if (isAvailable) {
                console.log(`WebSocket found and connected to ${validHost}:${validPort}/text`);
                await connectWebSocket(validHost, validPort);

                const frequency = extractFrequency(changeInfo.url);
                if (frequency) {
                    await sendDataToClient(frequency);
                } else {
                    console.log("No frequency found in the URL.");
                }
            } else {
                console.error(`WebSocket not available for this host: ${host}`);
            }
        });
    }
});

// Function to extract frequency from the URL and replace %2C or comma with a dot
function extractFrequency(url) {
    const decodedUrl = decodeURIComponent(url);
    console.log(`Decoded URL: ${decodedUrl}`);

    // Updated regex to handle both ?f= and #freq= patterns
    const fmscanRegex = /[?&]f=([\d]+[.,]*[\d]*)/;
    const freqRegex = /#freq=([\d]+[.,]*[\d]*)/;

    const fmscanMatch = decodedUrl.match(fmscanRegex);
    const freqMatch = decodedUrl.match(freqRegex);

    let frequency = null;

    if (fmscanMatch) {
        frequency = fmscanMatch[1].replace(',', '.');
    } else if (freqMatch) {
        frequency = freqMatch[1].replace(',', '.');
    }

    // Check if frequency exists and if it doesn't contain a decimal point
    if (frequency && !frequency.includes('.')) {
        frequency += '.0'; // Append .0 if no decimal point exists
    }

    // Parse the frequency into a float for further calculations
    if (frequency) {
        frequency = parseFloat(frequency);
    }

    console.log(`Extracted frequency: ${frequency}`);
    return frequency;
}


