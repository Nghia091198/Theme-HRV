class TabsComponent extends HTMLElement {
	#abort = null;
	#btns = [];
	#panels = [];
	#active = null;

	connectedCallback() {
		this.#abort?.abort();
		this.#abort = new AbortController();
		const sig = this.#abort.signal;

		const tablist = this.querySelector('[role="tablist"]');
		this.#btns = tablist ? [...tablist.querySelectorAll(':scope > [role="tab"]')] : [];
		this.#panels = [...this.querySelectorAll(':scope > [role="tabpanel"]')];

		if (!tablist || this.#btns.length === 0) {
			this.dataset.state = 'error';
			return;
		}

		this.#btns.forEach(btn => {
			const panelId = btn.dataset.target;
			const panel = this.querySelector(':scope > #' + panelId);
			if (!panel) return;
			btn.setAttribute('aria-controls', panelId);
			btn.setAttribute('aria-selected', 'false');
			btn.setAttribute('tabindex', '-1');
			if (!btn.id) btn.id = panelId + '-tab';
			panel.setAttribute('aria-labelledby', btn.id);
			panel.hidden = true;
		});

		this.#btns.forEach(btn =>
			btn.addEventListener('click', () => this.#activate(btn), { signal: sig })
		);
		this.addEventListener('keydown', e => this.#onKey(e), { signal: sig });

		const defaultId = this.dataset.default;
		const first = defaultId ?
			this.#btns.find(b => b.dataset.target === defaultId) :
			this.#btns[0];
		if (first) this.#activate(first);

		this.dataset.state = 'ready';
	}

	disconnectedCallback() {
		this.#abort?.abort();
		this.#abort = null;
		this.dataset.state = 'idle';
	}

	activate(target) {
		const btn = typeof target === 'number' ?
			this.#btns[target] :
			this.#btns.find(b => b.dataset.target === target);
		if (btn) this.#activate(btn);
	}

	get activeIndex() {
		return this.#btns.findIndex(b => b.getAttribute('aria-selected') === 'true');
	}

	get activePanel() { return this.#active; }

	#activate(btn) {
		const panelId = btn.dataset.target;
		const panel = this.querySelector(':scope > #' + panelId);
		if (!panel || panel === this.#active) return;

		this.#btns.forEach(b => {
			const on = b === btn;
			b.setAttribute('aria-selected', String(on));
			b.setAttribute('tabindex', on ? '0' : '-1');
		});
		this.#panels.forEach(p => { p.hidden = p !== panel; });
		this.#active = panel;

		this.dispatchEvent(new CustomEvent('tabs:change', {
			bubbles: true,
			composed: true,
			detail: {
				tabId: panelId,
				index: this.activeIndex,
				sourceId: this.id || this.dataset.id || '',
			},
		}));
	}

	#onKey(e) {
		const idx = this.#btns.indexOf(document.activeElement);
		if (idx === -1) return;
		const len = this.#btns.length;
		const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 };
		let next = -1;
		if (e.key in delta) next = (idx + delta[e.key] + len) % len;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = len - 1;
		else return;
		e.preventDefault();
		this.#btns[next].focus();
		this.#activate(this.#btns[next]);
	}
}

if (!customElements.get('tabs-component')) {
	customElements.define('tabs-component', TabsComponent);
}
