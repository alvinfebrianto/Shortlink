document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-form');
    const messageDiv = document.getElementById('message');
    const searchInput = document.getElementById('search');
    const container = document.getElementById('links-container');
    const themeBtns = document.querySelectorAll('.theme-btn');

    const setTheme = (theme) => {
        themeBtns.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-value="${theme}"]`)?.classList.add('active');

        if (theme === 'auto') {
            delete document.documentElement.dataset.theme;
            localStorage.removeItem('theme');
        } else {
            document.documentElement.dataset.theme = theme;
            localStorage.setItem('theme', theme);
        }
    };

    const savedTheme = localStorage.getItem('theme') || 'auto';
    setTheme(savedTheme);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.value);
        });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
        }
    });

    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message hidden';
        }, 5000);
    };

    const copyTimeouts = new WeakMap();

    const escapeHtml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    let currentLinks = [];

    window.copyToClipboard = async (text, btnElement) => {
        if (copyTimeouts.has(btnElement)) {
            clearTimeout(copyTimeouts.get(btnElement));
        }

        try {
            await navigator.clipboard.writeText(text);
            
            btnElement.textContent = 'COPIED!';
            btnElement.classList.add('copied', 'flash');
            
            const timeoutId = setTimeout(() => {
                btnElement.textContent = 'COPY';
                btnElement.classList.remove('copied', 'flash');
                copyTimeouts.delete(btnElement);
            }, 1500);
            
            copyTimeouts.set(btnElement, timeoutId);
        } catch (err) {
            console.error('Failed to copy:', err);
            btnElement.textContent = 'FAILED';
            btnElement.classList.remove('copied');
            btnElement.classList.add('flash');
            
            const timeoutId = setTimeout(() => {
                btnElement.textContent = 'COPY';
                btnElement.classList.remove('copied', 'flash');
                copyTimeouts.delete(btnElement);
            }, 1500);
            
            copyTimeouts.set(btnElement, timeoutId);
        }
    };

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
                const err = await res.text();
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

    const renderLinks = (filterText = '') => {
        const filtered = currentLinks.filter(link => 
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
                <div class="link-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</div>
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

    searchInput.addEventListener('input', (e) => {
        renderLinks(e.target.value.toLowerCase());
    });

    async function loadLinks() {
        try {
            const response = await fetch('/api/links');
            currentLinks = await response.json();
            renderLinks(searchInput.value.toLowerCase());
        } catch (e) {
            console.error(e);
            container.innerText = 'Failed to load links.';
        }
    }

    loadLinks();
});