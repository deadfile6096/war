function parseStatValue(statText) {
    if (!statText) return 0;
    let cleanText = String(statText).replace(/\$|,/g, '');
    let value;
    if (cleanText.toUpperCase().includes('M')) {
        value = parseFloat(cleanText) * 1000000;
    } else if (cleanText.toUpperCase().includes('K')) {
        value = parseFloat(cleanText) * 1000;
    } else {
        value = parseFloat(cleanText);
    }
    return isNaN(value) ? 0 : value;
}

function formatBarValue(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
}

document.addEventListener('DOMContentLoaded', () => {
    const VOTE_STORAGE_KEY = 'rugWarsVoted_v1';
    const allVoteButtons = document.querySelectorAll('.vote-button');

    const votes = {
        pumpfun: parseInt(localStorage.getItem('pumpfun_votes')) || 50, // Load from localStorage or default
        letsbonk: parseInt(localStorage.getItem('letsbonk_votes')) || 30,
        believe: parseInt(localStorage.getItem('believe_votes')) || 20
    };

    let totalVotes = Object.values(votes).reduce((acc, count) => acc + count, 0);

    function updateVoteDisplay() {
        totalVotes = Object.values(votes).reduce((acc, count) => acc + count, 0);

        for (const platform in votes) {
            const count = votes[platform];
            const percentage = totalVotes === 0 ? 0 : (count / totalVotes * 100).toFixed(1);

            document.getElementById(`${platform}-votes-count`).textContent = count;
            document.getElementById(`${platform}-votes-percent`).textContent = `${percentage}%`;
            
            const progressBar = document.getElementById(`${platform}-vote-bar`);
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
            // Save individual platform votes to localStorage
            localStorage.setItem(`${platform}_votes`, count);
        }
        document.getElementById('total-votes-count').textContent = totalVotes;
    }

    function disableVoting() {
        allVoteButtons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'You\'ve Voted!';
            btn.classList.add('voted'); 
        });
    }

    function launchConfetti(button) {
        const rect = button.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;

        if (typeof confetti === 'function') {
            confetti({
                particleCount: 180,
                spread: 100,
                origin: { x: originX, y: originY },
                colors: ['#ff00c1', '#9d00ff', '#00c2ff', '#00ff85', '#ffee00', '#ff005e'],
                scalar: 1.3,
                drift: 0.2,
                angle: 90 + (Math.random() - 0.5) * 40, // Slight random angle variation
                gravity: 0.7
            });
        } else {
            console.warn('Confetti library not loaded');
        }
    }

    if (localStorage.getItem(VOTE_STORAGE_KEY)) {
        disableVoting();
    }

    allVoteButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (localStorage.getItem(VOTE_STORAGE_KEY)) {
                button.classList.add('shake-animation');
                setTimeout(() => button.classList.remove('shake-animation'), 500);
                return;
            }

            const platform = button.dataset.platform;
            if (votes.hasOwnProperty(platform)) {
                votes[platform]++;
                updateVoteDisplay();

                launchConfetti(button);

                button.classList.add('vote-success-animation');
                setTimeout(() => {
                    button.classList.remove('vote-success-animation');
                }, 700); 

                localStorage.setItem(VOTE_STORAGE_KEY, 'true');
                disableVoting();
            }
        });
    });

    // Initial display update
    updateVoteDisplay();

    // --- Modal Functionality ---
    const platformModal = document.getElementById('platformModal');
    const closeModalButton = platformModal.querySelector('.close-button');
    const platformCards = document.querySelectorAll('.platform-card');

    const modalPlatformName = document.getElementById('modalPlatformName');
    const modalLogoContainer = document.getElementById('modalLogoContainer');
    const modalPlatformDetails = document.getElementById('modalPlatformDetails');

    function openModal(card) {
        const platformName = card.querySelector('.platform-header h2').textContent;
        
        const logoElement = card.querySelector('.platform-logo-placeholder, .platform-logo');
        modalLogoContainer.innerHTML = ''; 
        if (logoElement) {
            const clonedLogo = logoElement.cloneNode(true);
            modalLogoContainer.appendChild(clonedLogo);
        }

        const hiddenDetails = card.querySelector('.platform-hidden-details').innerHTML;
        
        modalPlatformName.textContent = platformName;
        modalPlatformDetails.innerHTML = hiddenDetails;
        
        platformModal.classList.add('active');
    }

    function closeModal() {
        platformModal.classList.remove('active');
    }

    platformCards.forEach(card => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('button')) { 
                return; 
            }
            openModal(card);
        });
    });

    closeModalButton.addEventListener('click', closeModal);

    platformModal.addEventListener('click', (event) => {
        if (event.target === platformModal) {
            closeModal();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && platformModal.classList.contains('active')) {
            closeModal();
        }
    });

    function updateMiniSvgCharts() {
        const cards = document.querySelectorAll('.platform-card');
        const chartData = [];
        const SVG_MAX_WAVE_HEIGHT = 35; // Max height of the wave within viewBox (0-40)
        const SVG_BASE_Y = 40; // Bottom line of the SVG
        const SVG_MIN_PEAK_Y = SVG_BASE_Y - 2; // Min peak (almost flat line for 0 value)

        cards.forEach(card => {
            const tokensStatEl = card.querySelector('.tokens-stat');
            const volumeStatEl = card.querySelector('.volume-stat');

            const tokensValue = tokensStatEl ? parseStatValue(tokensStatEl.textContent) : 0;
            const volumeValue = volumeStatEl ? parseStatValue(volumeStatEl.textContent) : 0;
            
            chartData.push({
                id: card.id,
                tokens: tokensValue,
                volume: volumeValue,
                tokensPathEl: card.querySelector('.tokens-chart path'),
                volumePathEl: card.querySelector('.volume-chart path'),
                tokensValueDisplayEl: card.querySelector('.tokens-value-display'),
                volumeValueDisplayEl: card.querySelector('.volume-value-display')
            });
        });

        const maxTokens = Math.max(...chartData.map(d => d.tokens).filter(v => v > 0), 1);
        const maxVolume = Math.max(...chartData.map(d => d.volume).filter(v => v > 0), 1);

        // Helper function to generate dynamic wave paths
        function calculateDynamicWavePathD(value, maxValue) {
            let mainPeakY = SVG_BASE_Y;
            if (value > 0 && maxValue > 0) {
                mainPeakY = SVG_BASE_Y - Math.max(0, (value / maxValue) * SVG_MAX_WAVE_HEIGHT);
            }
            mainPeakY = Math.max(0, Math.min(mainPeakY, SVG_MIN_PEAK_Y)); // Clamp to viewBox and min peak height
            if (value === 0) { // For zero value, ensure it uses the minimal peak defined
                mainPeakY = SVG_MIN_PEAK_Y;
            }

            const amplitude = Math.max(0, SVG_BASE_Y - mainPeakY);
            let undulationAmount;

            if (amplitude <= 2) { // For nearly flat lines (e.g., zero or very small values)
                undulationAmount = 0; // No undulation, results in a simple quadratic curve
            } else {
                undulationAmount = amplitude * 0.25; // Undulation is 25% of amplitude
                undulationAmount = Math.min(undulationAmount, 8); // Cap max undulation
                undulationAmount = Math.max(undulationAmount, 1); // Ensure min undulation if there's notable amplitude
            }

            if (undulationAmount === 0) {
                // Simple quadratic curve for small/zero values
                return `M0,${SVG_BASE_Y} Q50,${mainPeakY} 100,${SVG_BASE_Y} Z`;
            }

            const clampY = (y) => Math.max(0, Math.min(y, SVG_BASE_Y));

            // Control points for cubic Bezier curves to create a more dynamic wave
            // Path: M P0 C C1_1 C1_2 P1 C C2_1 C2_2 P2 Z
            // P0=(0,SVG_BASE_Y), P1=(50,mainPeakY), P2=(100,SVG_BASE_Y)
            const c1x1 = 15, c1y1 = clampY(mainPeakY - undulationAmount);
            const c1x2 = 35, c1y2 = clampY(mainPeakY + undulationAmount);
            const midX = 50,  midY = clampY(mainPeakY);
            const c2x1 = 65, c2y1 = clampY(mainPeakY - undulationAmount);
            const c2x2 = 85, c2y2 = clampY(mainPeakY + undulationAmount);

            return `M0,${SVG_BASE_Y} C${c1x1},${c1y1} ${c1x2},${c1y2} ${midX},${midY} C${c2x1},${c2y1} ${c2x2},${c2y2} 100,${SVG_BASE_Y} Z`;
        }

        chartData.forEach(data => {
            const tokenPathD = calculateDynamicWavePathD(data.tokens, maxTokens);
            const volumePathD = calculateDynamicWavePathD(data.volume, maxVolume);

            if (data.tokensPathEl) {
                data.tokensPathEl.setAttribute('d', tokenPathD);
            }
            if (data.tokensValueDisplayEl) {
                data.tokensValueDisplayEl.textContent = formatBarValue(data.tokens);
            }

            if (data.volumePathEl) {
                data.volumePathEl.setAttribute('d', volumePathD);
            }
            if (data.volumeValueDisplayEl) {
                data.volumeValueDisplayEl.textContent = formatBarValue(data.volume);
            }
        });
    }

    // Initial call to update charts
    updateMiniSvgCharts();

});
