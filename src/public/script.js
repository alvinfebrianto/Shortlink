document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-form');
    const messageDiv = document.getElementById('message');
    const searchInput = document.getElementById('search');
    const container = document.getElementById('links-container');

    // Helper: Show Message
    const showMessage = (text, type) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message hidden';
        }, 5000);
    };

    // Helper: Copy to Clipboard
    window.copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
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
                            <button onclick="copyToClipboard('${fullUrl}')" class="btn-small copy">COPY</button>
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
