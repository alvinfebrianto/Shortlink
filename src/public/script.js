document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-form');
    const messageDiv = document.getElementById('message');
    const searchInput = document.getElementById('search');
    const container = document.getElementById('links-container');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // --- Theme Logic ---
    const setTheme = (theme) => {
        // Remove active class from all buttons
        themeBtns.forEach(btn => btn.classList.remove('active'));
        // Add active class to selected button
        document.querySelector(`[data-value="${theme}"]`)?.classList.add('active');

        // Apply theme
        if (theme === 'auto') {
            delete document.documentElement.dataset.theme;
            localStorage.removeItem('theme');
        } else {
            document.documentElement.dataset.theme = theme;
            localStorage.setItem('theme', theme);
        }
    };

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'auto';
    setTheme(savedTheme);

    // Theme Button Click Handlers
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.value);
        });
    });

    // Listen for system changes when in auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            // Re-trigger auto logic if needed, though CSS handles system pref usually
            // Here we mainly rely on CSS variables or if we need JS-side logic
        }
    });

    // --- End Theme Logic ---


    // Helper: Show Message
    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message hidden';
        }, 5000);
    };

    // Helper: Copy to Clipboard with visual feedback
    window.copyToClipboard = async (text, btnElement) => {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback on the button
            const originalText = btnElement.textContent;
            btnElement.textContent = 'COPIED!';
            btnElement.classList.add('copied', 'flash');
            
            // Reset after delay
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.classList.remove('copied', 'flash');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
            btnElement.textContent = 'FAILED';
            setTimeout(() => {
                btnElement.textContent = 'COPY';
            }, 1500);
        }
    };

    // Create Link
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            url: formData.get('url'),
            slug: formData.get('slug')
        };

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const result = await res.json();
                showMessage(`Link created! /${result.slug}`, 'success');
                form.reset();
                loadLinks();
            } else {
                const err = await res.text(); // or res.json() depending on server
                // The server currently returns text for errors like "Slug already exists"
                // but let's be safe.
                try {
                     const jsonErr = JSON.parse(err);
                     showMessage(jsonErr.message || "Error creating link", 'error');
                } catch {
                     showMessage(err || "Error creating link", 'error');
                }
            }
        } catch (err) {
            showMessage('Network error.', 'error');
        }
    });

    // Load Links
    async function loadLinks() {
        try {
            const response = await fetch('/api/links');
            const links = await response.json();

            const render = (filterText = '') => {
                const filtered = links.filter(link => 
                    link.url.toLowerCase().includes(filterText) || 
                    link.slug.toLowerCase().includes(filterText)
                );

                container.innerHTML = filtered.map(link => {
                    const fullUrl = `${window.location.origin}/${link.slug}`;
                    return `
                    <div class="link-card">
                        <div class="card-header">
                            <span class="slug-badge">/${link.slug}</span>
                            <span class="click-badge">${link.visits_count} clicks</span>
                        </div>
                        <div class="link-url" title="${link.url}">${link.url}</div>
                        <div class="card-actions">
                            <a href="/${link.slug}" target="_blank" class="btn-small visit">VISIT &nearr;</a>
                            <button onclick="copyToClipboard('${fullUrl}', this)" class="btn-small copy">COPY</button>
                        </div>
                    </div>
                `}).join('');
                
                if (filtered.length === 0) {
                    container.innerHTML = '<p style="text-align:center; width:100%;">No links found matching criteria.</p>';
                }
            };

            render(searchInput.value.toLowerCase());

            searchInput.addEventListener('input', (e) => {
                render(e.target.value.toLowerCase());
            });

        } catch (e) {
            console.error(e);
            container.innerText = 'Failed to load links.';
        }
    }

    loadLinks();
});