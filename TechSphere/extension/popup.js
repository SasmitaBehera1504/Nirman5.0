$(document).ready(function () {

    console.log("Popup loaded");

    function updateTabURL() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError || !tabs || !tabs[0]) {
                console.log("Cannot access current tab:", chrome.runtime.lastError?.message);
                $('#site').text("Cannot access this page");
                return;
            }

            let tab = tabs[0];

            // Ignore Chrome internal pages
            if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
                $('#site').text("Internal Chrome page");
                return;
            }

            let tablink = tab.url.length > 30 ? tab.url.slice(0, 30) + ' ...' : tab.url;
            $('#site').text(tablink);
        });
    }

    updateTabURL();

    $('#checkBtn').click(function () {

        console.log("Button clicked");

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (chrome.runtime.lastError || !tabs || !tabs[0]) {
                console.log("Cannot access current tab:", chrome.runtime.lastError?.message);
                return;
            }

            let tab = tabs[0];
            let original_url = tab.url;

            // Do not scan internal Chrome pages
            if (original_url.startsWith("chrome://") || original_url.startsWith("chrome-extension://")) {
                console.log("Cannot scan internal Chrome pages");
                $('#div1').text("Cannot scan internal Chrome pages");
                $('#div2').text('');
                return;
            }

            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    func: () => document.documentElement.outerHTML
                },
                (results) => {

                    if (chrome.runtime.lastError) {
                        console.log("ExecuteScript error:", chrome.runtime.lastError.message);
                        $('#div2').text("Error scanning page");
                        return;
                    }

                    if (!results || !results[0]) {
                        console.log("❌ ERROR: executeScript returned nothing");
                        $('#div2').text("Unable to read page content");
                        return;
                    }

                    const pageHTML = results[0].result;

                    let xhr = new XMLHttpRequest();
                    xhr.open("POST", "http://localhost:8000", true);
                    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

                    let body =
                        "url=" + encodeURIComponent(original_url) +
                        "&html=" + encodeURIComponent(pageHTML);

                    xhr.onload = () => {
                        console.log("Response from backend:", xhr.responseText);

                        $('#div1').text('');
                        $('#div2').text('');

                        if (xhr.status !== 200) {
                            $('#div2').text("Backend Error");
                            return;
                        }

                        if (xhr.responseText.includes("SAFE")) {
                            $('#div1').text("SAFE");
                        } else {
                            $('#div2').text("UNSAFE");
                        }
                    };

                    xhr.onerror = function () {
                        console.log("❌ Network error while connecting to backend");
                        $('#div2').text("Cannot reach backend");
                    };

                    xhr.send(body);
                }
            );
        });
    });
});
