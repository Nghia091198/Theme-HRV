/**
 * FOX.http — lop transport dung chung cho toan theme.
 * Gom headers / credentials / parse / chuan hoa loi ve mot cho.
 * Phai nap TRUOC moi file JS khac co goi fetch.
 */
(() => {  
    const FOX = (window.FOX = window.FOX || {});

    const BASE = { 'X-Requested-With': 'XMLHttpRequest' };
    const FORM = 'application/x-www-form-urlencoded';

    async function describe(res) {
        try {
            const data = await res.clone().json();
            return data?.description || data?.message || `Lỗi ${res.status}`;
        } catch {
            return `Lỗi ${res.status}`;
        }
    }

    async function request(url, { method = 'GET', accept, body, signal } = {}) {
        const headers = { ...BASE };
        if (accept) headers.Accept = accept;

        const init = { method, credentials: 'same-origin', headers, signal };

        if (body instanceof FormData) {
            init.body = body; // de trinh duyet tu set boundary
        } else if (body) {
            headers['Content-Type'] = FORM;
            init.body = typeof body === 'string' ? body : new URLSearchParams(body).toString();
        }

        let res;
        try {
            res = await fetch(url, init);
        } catch (error) {
            if (error.name === 'AbortError') throw error; // huy chu dong, khong phai loi mang
            throw new Error('Không thể kết nối. Vui lòng thử lại.');
        }

        if (!res.ok) throw new Error(await describe(res));
        return res;
    }

    FOX.http = {
        raw: request,

        json: (url, options) =>
            request(url, { accept: 'application/json', ...options }).then((r) => r.json()),

        text: (url, options) =>
            request(url, { accept: 'text/html', ...options }).then((r) => r.text()),

        /** Tra ve Document da parse — dung cho mega menu, mobile menu, cart view, collection */
        html: async (url, options) => {
            const markup = await FOX.http.text(url, options);
            return new DOMParser().parseFromString(markup, 'text/html');
        },
    };
})();
