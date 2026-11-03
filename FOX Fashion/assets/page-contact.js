(() => {
  const TOPIC_PREFIX = /^\[Chủ đề: [^\]]*\]\n/;

  // Contact page (templates/page.contact.liquid): the Haravan contact form only sends contact[*] fields, so the
  // chosen topic chip is written at the top of the message body on submit (replaced, never duplicated).
  function FOXContactInit(root) {
    if (root.dataset.state === 'ready') return;
    root.dataset.state = 'ready';
    const form = root.querySelector('form');
    const body = root.querySelector('[data-role="body"]');
    if (!form || !body) return;

    form.addEventListener('submit', () => {
      const topic = form.querySelector('input[name="fox_contact_topic"]:checked')?.value.trim();
      const message = body.value.replace(TOPIC_PREFIX, '');
      body.value = topic ? `[Chủ đề: ${topic}]\n${message}` : message;
    });
  }

  function FOXContactInitAll() {
    document.querySelectorAll('[data-contact-page]').forEach(FOXContactInit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', FOXContactInitAll, { once: true });
  else FOXContactInitAll();
})();
