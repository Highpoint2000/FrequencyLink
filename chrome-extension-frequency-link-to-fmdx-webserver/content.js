/////////////////////////////////////////////////////////
///                                                   ///
//            FREQUENCY LINK FOR FM-DX WEBSERVER      ///
//                       (V1.1a)                      ///
//                                                    ///
//                     by Highpoint                   ///
//               last update: 20.09.24                ///
//                                                    ///
//  https://github.com/Highpoint2000/FrequencyLink    ///
//                                                    ///
/////////////////////////////////////////////////////////

// List of allowed hostnames
const allowedHostnames = ['highpoint2000.selfhost.de', 'db.wtfda.org', 'eservices.traficom.fi', 'maps.fmdx.org']; // Add your allowed hostnames here

/////////////////////////////////////////////////////////

const frequencyRegex = /\b\d{2,3}[,.]\d{1,3}\b/g;

function makeFrequenciesClickable() {
    const baseUrl = window.location.origin;

    // Check if the current hostname is in the list of allowed hostnames
    const currentHostname = window.location.hostname;
    const logsScannerPattern = /logs\/SCANNER/; // Pattern to match

    // Check if the current hostname is allowed or matches the pattern
    if (!allowedHostnames.includes(currentHostname) && !logsScannerPattern.test(window.location.href)) {
        // console.log('The current hostname is not allowed.');
        return; // Exit the function if the hostname is not allowed
    }

    // Retrieve all <td> elements on the page
    const cells = document.querySelectorAll('td');

    cells.forEach(cell => {
        let text = cell.textContent.trim();
        const matches = [...text.matchAll(frequencyRegex)];

        if (matches.length > 0) {
            let updatedText = '';
            let lastIndex = 0;

            matches.forEach(match => {
                const matchText = match[0];
                const startIndex = match.index;

                const frequencyString = matchText.replace(',', '.');
                const frequency = parseFloat(frequencyString);

                // console.log('Found frequency:', frequencyString);

                if (frequency >= 65.5 && frequency <= 108.0) {
                    updatedText += text.slice(lastIndex, startIndex);
                    const linkUrl = `${baseUrl}/f=${encodeURIComponent(frequencyString)}`;
                    // console.log('Generated URL:', linkUrl);

                    const link = `<a href="javascript:void(0);" onclick="let w = window.open('${linkUrl}', '_blank', 'width=1,height=1,toolbar=no,scrollbars=no,menubar=no'); setTimeout(() => { if (w) { w.close(); } }, 500);" style="text-decoration: underline; cursor: pointer;">${matchText}</a>`;


                    updatedText += link;
                } else {
                    updatedText += text.slice(lastIndex, startIndex + matchText.length);
                }

                lastIndex = startIndex + matchText.length;
            });

            updatedText += text.slice(lastIndex);
            cell.innerHTML = updatedText;
        }
    });
}


// Function to delay execution by 500 milliseconds after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        // console.log('Starting frequency marking...');
        makeFrequenciesClickable();
    }, 500); 
});
