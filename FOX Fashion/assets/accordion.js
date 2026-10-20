class AccordionComponent extends HTMLElement {
	#abort = null;
	#triggers = [];

	connectedCallback() {
		this.#abort?.abort();
		this.#abort = new AbortController();
		const sig = this.#abort.signal;

		this.#triggers = [...this.querySelectorAll('button[aria-controls]')]
			.filter(btn => btn.closest('accordion-component') === this);

		if (this.#triggers.length === 0) {
			this.dataset.state = 'error';
			return;
		}

		this.#triggers.forEach(btn => {
			const panel = document.getElementById(btn.getAttribute('aria-controls'));
			if (!panel) return;
			if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
			panel.hidden = btn.getAttribute('aria-expanded') !== 'true';
		});

		this.#triggers.forEach(btn =>
			btn.addEventListener('click', () => this.#toggle(btn), { signal: sig })
		);
		this.addEventListener('keydown', e => this.#onKey(e), { signal: sig });

		this.dataset.state = 'ready';
	}

	disconnectedCallback() {
		this.#abort?.abort();
		this.#abort = null;
		this.dataset.state = 'idle';
	}

	#toggle(btn) {
		const panel = document.getElementById(btn.getAttribute('aria-controls'));
		if (!panel) return;
		const expand = btn.getAttribute('aria-expanded') !== 'true';

		if (expand && this.dataset.multiple !== 'true') {
			this.#triggers.forEach(other => {
				if (other === btn) return;
				const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
				other.setAttribute('aria-expanded', 'false');
				if (otherPanel) otherPanel.hidden = true;
			});
		}

		btn.setAttribute('aria-expanded', String(expand));
		panel.hidden = !expand;

		this.dispatchEvent(new CustomEvent('accordion:change', {
			bubbles: true,
			composed: true,
			detail: {
				panelId: panel.id,
				expanded: expand,
				sourceId: this.id || this.dataset.id || '',
			},
		}));
	}

	#onKey(e) {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		const idx = this.#triggers.indexOf(document.activeElement);
		if (idx === -1) return;
		const len = this.#triggers.length;
		const delta = e.key === 'ArrowUp' ? -1 : 1;
		e.preventDefault();
		this.#triggers[(idx + delta + len) % len].focus();
	}
}

if (!customElements.get('accordion-component')) {
	customElements.define('accordion-component', AccordionComponent);
}
