/**
 * popup.js - Lexia v2.1
 */

document.getElementById('scanBtn').addEventListener('click', async () => {
    const scanBtn = document.getElementById('scanBtn');
    const resultsDiv = document.getElementById('results');

    scanBtn.disabled = true;
    scanBtn.classList.add('loading-dots');
    scanBtn.innerText = 'Analyzing';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
            throw new Error('Analysis limited on system pages.');
        }

        let data;
        try {
            data = await chrome.tabs.sendMessage(tab.id, { action: "getGDPRResults" });
        } catch (e) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            await new Promise(r => setTimeout(r, 200));
            data = await chrome.tabs.sendMessage(tab.id, { action: "getGDPRResults" });
        }

        if (data) {
            resultsDiv.style.display = 'block';
            renderUI(data);
            scanBtn.innerText = 'Re-Analyze';
        }

    } catch (err) {
        console.error(err);
        alert(err.message || 'Technical Error occurred.');
        scanBtn.innerText = 'Try Again';
    } finally {
        scanBtn.disabled = false;
        scanBtn.classList.remove('loading-dots');
    }
});

function renderUI(data) {
    const critList = document.getElementById('criticalList');
    const warnList = document.getElementById('warningList');
    const succList = document.getElementById('successList');

    critList.innerHTML = '';
    warnList.innerHTML = '';
    succList.innerHTML = '';

    // Animate Score
    animateScore(data.score || 0);

    data.checks.forEach(check => {
        const row = createResultRow(check);
        if (check.status === 'crit') critList.appendChild(row);
        else if (check.status === 'warn') warnList.appendChild(row);
        else succList.appendChild(row);
    });

    // Hide labels if empty
    toggleCategoryLabels();
}

function createResultRow(check) {
    const div = document.createElement('div');
    div.className = 'result-row';

    const statusClass = `status-${check.status}`;
    const statusLabel = check.status === 'ok' ? 'Verified' : (check.status === 'warn' ? 'Alert' : 'Critical');

    div.innerHTML = `
        <div class="check-info">
            <div class="check-title">${check.label}</div>
            <div class="check-desc">${check.detail}</div>
        </div>
        <div class="status-marker ${statusClass}">${statusLabel}</div>
    `;
    return div;
}

function animateScore(target) {
    const scoreVal = document.getElementById('scoreValue');
    let current = 0;
    const duration = 1000;
    const start = performance.now();

    const update = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = 1 - (1 - progress) * (1 - progress);

        current = Math.floor(easeOutQuad * target);
        scoreVal.innerText = current;

        // Change color based on score
        if (current < 50) scoreVal.style.color = '#9d3a2e';
        else if (current < 80) scoreVal.style.color = '#b38520';
        else scoreVal.style.color = '#2c2926';

        if (progress < 1) requestAnimationFrame(update);
        else scoreVal.innerText = target;
    };
    requestAnimationFrame(update);
}

function toggleCategoryLabels() {
    const categories = ['criticalList', 'warningList', 'successList'];
    categories.forEach(id => {
        const list = document.getElementById(id);
        const label = list.previousElementSibling;
        if (label && label.classList.contains('category-label')) {
            label.style.display = list.children.length === 0 ? 'none' : 'block';
        }
    });
}
